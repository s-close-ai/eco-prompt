# judge_llm/model/scripts/healthcheck.sh
#!/usr/bin/env bash
set -euo pipefail

BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
source "$BASE/.env"

URL_BASE="http://${LLAMA_SERVER_HOST:-127.0.0.1}:${LLAMA_SERVER_PORT:-8080}"
HEALTH="$URL_BASE/health"
LOG="$BASE/logs/healthcheck.log"
MAX_RETRIES=3
RETRY_SLEEP=2
WARMUP_WAIT=90
DO_LONG_WARMUP="${DO_LONG_WARMUP:-1}"
ts(){ date "+%Y-%m-%d %H:%M:%S"; }

mkdir -p "$BASE/logs"

ok=0
for _ in $(seq 1 $MAX_RETRIES); do
  if curl -fsS "$HEALTH" >/dev/null 2>&1; then ok=1; break; fi
  sleep "$RETRY_SLEEP"
done

if [[ $ok == 1 ]]; then
  echo "$(ts) OK" >> "$LOG"; exit 0
fi

echo "$(ts) FAIL → restarting via start_server.sh" >> "$LOG"
pkill -f "llama-server" || true
/usr/bin/nohup /bin/bash "$BASE/scripts/start_server.sh" >> "$BASE/logs/server.stdout.log" 2>> "$BASE/logs/server.stderr.log" &

for _ in $(seq 1 $WARMUP_WAIT); do
  if curl -fsS "$HEALTH" >/dev/null 2>&1; then
    echo "$(ts) restarted & healthy" >> "$LOG"; break
  fi
  sleep 1
done

warmup() {
  curl -s "$URL_BASE/v1/completions" -H 'Content-Type: application/json' --data-binary @- >/dev/null <<'JSON'
{"prompt":"MC warmup","max_tokens":1,"cache_prompt":true}
JSON
  curl -s "$URL_BASE/v1/completions" -H 'Content-Type: application/json' --data-binary @- >/dev/null <<'JSON'
{"prompt":"QA warmup","max_tokens":1,"cache_prompt":true}
JSON
  if [[ "$DO_LONG_WARMUP" == "1" ]]; then
    LONG=$(python3 - <<'PY'
print(("QA " * 8000).strip())
PY
)
    curl -s "$URL_BASE/v1/completions" -H 'Content-Type: application/json' --data-binary @- >/dev/null <<JSON
{"prompt":"$LONG","max_tokens":1,"cache_prompt":true}
JSON
  fi
}
( echo "$(ts) warmup begin" >> "$LOG"; warmup; echo "$(ts) warmup done" >> "$LOG" ) >/dev/null 2>&1 & disown
