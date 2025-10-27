#!/usr/bin/env bash
set -euo pipefail

BASE="$HOME/S13P31A309/judge_llm"
LOG="$BASE/logs/watchdog.log"
INTERVAL=60

# curl, nohup 절대경로 지정 (macOS 기본)
CURL="/usr/bin/curl"
NOHUP="/usr/bin/nohup"
BASH="/bin/bash"

mkdir -p "$BASE/logs"
ts(){ date "+%Y-%m-%d %H:%M:%S"; }

echo "$(ts) 🩺 Judge watchdog started (interval=${INTERVAL}s)" >> "$LOG"

while true; do
  if ! "$CURL" -fsS --max-time 5 http://127.0.0.1:8080/health >/dev/null 2>&1; then
    echo "$(ts) ❌ Healthcheck failed, restarting server..." >> "$LOG"
    pkill -f "llama-server" || true
    "$NOHUP" "$BASH" "$BASE/start_server.sh" >> "$BASE/logs/server.stdout.log" 2>> "$BASE/logs/server.stderr.log" &
    echo "$(ts) 🔁 Restart command issued." >> "$LOG"

    # 서버가 완전히 올라올 때까지 여유있게 대기
    for i in $(seq 1 90); do
      sleep 1
      if "$CURL" -fsS --max-time 2 http://127.0.0.1:8080/health >/dev/null 2>&1; then
        echo "$(ts) ✅ Server recovered. Triggering warmup..." >> "$LOG"
        "$BASH" "$BASE/healthcheck.sh" >/dev/null 2>&1 || true
        break
      fi
    done
  else
    echo "$(ts) ✅ Healthcheck OK" >> "$LOG"
  fi

  sleep "$INTERVAL"
done
