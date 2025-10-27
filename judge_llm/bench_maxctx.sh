#!/bin/zsh
set -euo pipefail

BASE="$HOME/S13P31A309/judge_llm"
BIN="$HOME/llama.cpp/build/bin/llama-server"
MODEL="$BASE/prom2-q5_k_m.gguf"
PORT=8080

# 32K 고정(모델 n_ctx_train = 32768)
CTX=32768
NPRED=128           # 생성 토큰 수
MARGIN=96           # 시스템/여유 버퍼
PARALLEL_LIST=(1 2) # 동시성 후보 (32K에선 1~2 권장)
BATCH_LIST=(512 768)
THREADS=10
CACHE_RAM=4096
REQS=4              # 요청 수(32K라 무거우니 소량)

LOG="$BASE/logs/bench_maxctx.log"
OUT="$BASE/logs/bench_maxctx.tsv"
mkdir -p "$BASE/logs"
: > "$LOG"
echo -e "parallel\tbatch\trequests\tfail\tavg_s\tp95_s\trss_mb" > "$OUT"

# 32K에 가깝게 긴 프롬프트 생성
# 목표 토큰 ≈ CTX - NPRED - MARGIN, 약간 보수적으로 95%만 사용
TARGET=$(( CTX - NPRED - MARGIN ))
TARGET=$(( TARGET * 95 / 100 ))

# 긴 텍스트 생성: 공백 구분 'QA' 반복
PROMPT_FILE=$(mktemp)
# zsh에서 awk 호출
awk -v n="$TARGET" 'BEGIN{ for(i=1;i<=n;i++){ printf("QA "); } print "" }' > "$PROMPT_FILE"

# JSON 페이로드 파일 생성(파이썬으로 안전 이스케이프)
PAYLOAD_FILE=$(mktemp)
python3 - "$PROMPT_FILE" "$NPRED" > "$PAYLOAD_FILE" <<'PY'
import json,sys
prompt = open(sys.argv[1], 'r', encoding='utf-8').read()
max_tokens = int(sys.argv[2])
print(json.dumps({"prompt": prompt, "max_tokens": max_tokens, "cache_prompt": True}))
PY

stop_srv() { pkill -f "llama-server" || true; }
health()   { curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1 || curl -fsS "http://127.0.0.1:$PORT/version" >/dev/null 2>&1; }

start_srv() {
  local PAR="$1" BATCH="$2"
  stop_srv
  nohup "$BIN" -m "$MODEL" -ngl -1 -c "$CTX" \
    --port "$PORT" --host 127.0.0.1 \
    --parallel "$PAR" --temp 0 --n-predict "$NPRED" \
    --threads "$THREADS" -b "$BATCH" \
    --no-warmup --cache-ram "$CACHE_RAM" \
    >> "$BASE/logs/server.stdout.log" 2>> "$BASE/logs/server.stderr.log" &

  # 최대 45초 대기
  for i in {1..45}; do
    if health; then return 0; fi
    sleep 1
  done
  echo "[ERR] server not healthy" | tee -a "$LOG"
  return 1
}

p95() {
  # stdin: 숫자 행. FAIL 없는 값만 들어온다고 가정.
  # 정렬 후 95퍼센타일 위치 출력
  sort -n | awk '{
    a[++n]=$1
  } END {
    if (n==0){print "0"; exit}
    idx=int(0.95*n); if (idx<1) idx=1
    printf "%.6f\n", a[idx]
  }'
}

bench_once() {
  local PAR="$1" BATCH="$2"
  echo "==> parallel=$PAR, batch=$BATCH (ctx=$CTX, npred=$NPRED)" | tee -a "$LOG"

  start_srv "$PAR" "$BATCH"

  # 워밍업 1회
  curl -s "http://127.0.0.1:$PORT/v1/completions" -H 'Content-Type: application/json' --data-binary @"$PAYLOAD_FILE" >/dev/null || true

  local SECS_FILE=$(mktemp)

  # REQS만큼 동시 실행: 각 요청의 %{time_total} 수집 (실패 시 FAIL 출력)
  seq "$REQS" | xargs -I{} -P "$PAR" sh -c '
    t=$(curl -s -w "%{time_total}" -o /dev/null \
        "http://127.0.0.1:'"$PORT"'/v1/completions" \
        -H "Content-Type: application/json" --data-binary @"'"$PAYLOAD_FILE"'" \
        || echo FAIL)
    echo "$t"
  ' >> "$SECS_FILE" || true

  # 통계 계산
  local FAILS
  FAILS=$(grep -c '^FAIL$' "$SECS_FILE" || true)

  # 평균
  local AVG="0"
  if [ $((REQS-FAILS)) -gt 0 ]; then
    AVG=$(grep -v '^FAIL$' "$SECS_FILE" | awk '{s+=$1;c++} END{ if(c>0) printf "%.6f\n", s/c; else print "0"}')
  fi

  # p95
  local P95="0"
  if [ $((REQS-FAILS)) -gt 0 ]; then
    P95=$(grep -v '^FAIL$' "$SECS_FILE" | p95)
  fi

  # 메모리(RSS MB)
  local RSS
  RSS=$(ps -o rss= -p $(pgrep -n llama-server || echo 0) 2>/dev/null | awk '{printf "%.1f", $1/1024}')

  echo -e "${PAR}\t${BATCH}\t${REQS}\t${FAILS}\t${AVG}\t${P95}\t${RSS}" >> "$OUT"

  rm -f "$SECS_FILE"
}

# 조합 실행
for PAR in "${PARALLEL_LIST[@]}"; do
  for BATCH in "${BATCH_LIST[@]}"; do
    bench_once "$PAR" "$BATCH" || true
  done
done

stop_srv
echo "DONE. See: $OUT"
