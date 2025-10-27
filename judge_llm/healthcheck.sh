#!/usr/bin/env bash
set -euo pipefail
BASE="$HOME/S13P31A309/judge_llm"
URL_BASE="http://127.0.0.1:8080"
HEALTH="$URL_BASE/health"
LOG="$BASE/logs/healthcheck.log"
MAX_RETRIES=3
RETRY_SLEEP=2
WARMUP_WAIT=90
DO_LONG_WARMUP=1
ts(){ date "+%Y-%m-%d %H:%M:%S"; }

mkdir -p "$BASE/logs"

# --- 헬스 체크 ---
ok=0
for i in $(seq 1 $MAX_RETRIES); do
  if curl -fsS "$HEALTH" >/dev/null 2>&1; then
    ok=1; break
  fi
  sleep "$RETRY_SLEEP"
done

if [[ "$ok" == "1" ]]; then
  echo "$(ts) OK" >> "$LOG"
  exit 0
fi

echo "$(ts) FAIL → restarting via start_server.sh" >> "$LOG"
pkill -f "llama-server" || true
nohup "$BASE/start_server.sh" >> "$BASE/logs/server.stdout.log" 2>> "$BASE/logs/server.stderr.log" &

# --- 서버 기동 대기 ---
for i in $(seq 1 $WARMUP_WAIT); do
  if curl -fsS "$HEALTH" >/dev/null 2>&1; then
    echo "$(ts) restarted & healthy" >> "$LOG"
    break
  fi
  sleep 1
done

# --- 웜업 (백그라운드) ---
warmup() {
  # MC 템플릿
  curl -s "$URL_BASE/v1/completions" -H 'Content-Type: application/json' --data-binary @- >/dev/null <<'JSON'
{
  "prompt": "당신은 채점관(Judge)입니다. 아래 '문항'과 '정답(참조용)', 그리고 '정답후보'를 보고 후보가 정답과 의미적으로 얼마나 일치하는지 평가하세요.\n오로지 JSON만 출력합니다. 추가 텍스트 금지.\n{ \"score\": <0..10 정수>, \"correct\": <true|false>, \"reason\": \"<짧은 한국어 이유>\" }\n- score: 0(완전 오답) ~ 10(완전 정답)\n- correct: 최종 판정 (정답이면 true, 아니면 false)\n- 반드시 JSON만 출력하세요.\n\n문항(객관식):\n샘플 질문\n\n보기:\n1) 보기1\n2) 보기2\n\n정답(참조용):\n보기1\n\n정답후보(모델 출력):\n보기1\n\n평가 JSON만 출력:",
  "max_tokens": 1,
  "cache_prompt": true,
  "stop": ["}\n","}\r","</s>"]
}
JSON

  # QA 템플릿
  curl -s "$URL_BASE/v1/completions" -H 'Content-Type: application/json' --data-binary @- >/dev/null <<'JSON'
{
  "prompt": "당신은 채점관(Judge)입니다. 아래 '문항'과 '정답(참조용)', 그리고 '정답후보'를 보고 후보가 정답과 의미적으로 얼마나 일치하는지 평가하세요.\n오로지 JSON만 출력합니다. 추가 텍스트 금지.\n{ \"score\": <0..10 정수>, \"correct\": <true|false>, \"reason\": \"<짧은 한국어 이유>\" }\n- score: 0(완전 오답) ~ 10(완전 정답)\n- correct: 최종 판정 (정답이면 true, 아니면 false)\n- 반드시 JSON만 출력하세요.\n\n문항(주관식):\n샘플 질문\n\n정답(참조용):\n정답 예시\n\n정답후보(모델 출력):\n정답 예시\n\n평가 JSON만 출력:",
  "max_tokens": 1,
  "cache_prompt": true,
  "stop": ["}\n","}\r","</s>"]
}
JSON

  # (옵션) 긴 프롬프트 캐시
  if [[ "$DO_LONG_WARMUP" == "1" ]]; then
    LONG=$(python3 - <<'PY'
print(("QA " * 8000).strip())
PY
)
    curl -s "$URL_BASE/v1/completions" -H 'Content-Type: application/json' --data-binary @- >/dev/null <<JSON
{
  "prompt": "$LONG",
  "max_tokens": 1,
  "cache_prompt": true
}
JSON
  fi
}

( echo "$(ts) warmup begin" >> "$LOG"; warmup; echo "$(ts) warmup done" >> "$LOG" ) >/dev/null 2>&1 & disown
