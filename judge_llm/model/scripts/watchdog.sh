# judge_llm/model/scripts/watchdog.sh
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="$(cd "${SCRIPT_DIR}/.." && pwd)"

source "$BASE/.env"

LLAMA_SERVER_HOST="${LLAMA_SERVER_HOST:-127.0.0.1}"
LLAMA_SERVER_PORT="${LLAMA_SERVER_PORT:-8080}"
INTERVAL="${WATCHDOG_INTERVAL_S:-60}"

LOG="${BASE}/logs/watchdog.log"
HEALTH_URL="http://${LLAMA_SERVER_HOST}:${LLAMA_SERVER_PORT}/health"

CURL_BIN="$(command -v curl || true)";   CURL_BIN="${CURL_BIN:-/usr/bin/curl}"
NOHUP_BIN="$(command -v nohup || true)"; NOHUP_BIN="${NOHUP_BIN:-/usr/bin/nohup}"
BASH_BIN="$(command -v bash || true)";   BASH_BIN="${BASH_BIN:-/bin/bash}"

mkdir -p "${BASE}/logs"

ts(){ date "+%Y-%m-%d %H:%M:%S"; }

LOCKDIR="${BASE}/logs/watchdog.lockdir"
if mkdir "${LOCKDIR}" 2>/dev/null; then
  echo $$ > "${LOCKDIR}/pid"
  cleanup_lock(){ rm -f "${BASE}/logs/watchdog.pid" 2>/dev/null || true; rmdir "${LOCKDIR}" 2>/dev/null || true; }
  trap cleanup_lock EXIT
else
  echo "$(ts) 🔒 이미 실행 중인 watchdog이 감지되어 종료합니다." >> "${LOG}"
  exit 0
fi

echo $$ > "${BASE}/logs/watchdog.pid"
echo "$(ts) 🩺 Judge watchdog 시작 (주기=${INTERVAL}s, URL=${HEALTH_URL})" >> "${LOG}"

while true; do
  if ! "${CURL_BIN}" -fsS --max-time 5 "${HEALTH_URL}" >/dev/null 2>&1; then
    echo "$(ts) ❌ Healthcheck 실패 - 서버를 재시작합니다." >> "${LOG}"
    pkill -f "llama-server" || true

    "${NOHUP_BIN}" "${BASH_BIN}" "${BASE}/scripts/start_server.sh" \
      >> "${BASE}/logs/server.stdout.log" 2>> "${BASE}/logs/server.stderr.log" &
    echo "$(ts) 🔁 재시작 명령 실행 완료." >> "${LOG}"

    for _ in $(seq 1 90); do
      sleep 1
      if "${CURL_BIN}" -fsS --max-time 2 "${HEALTH_URL}" >/dev/null 2>&1; then
        echo "$(ts) ✅ 서버 복구 완료 — 웜업 스크립트 실행." >> "${LOG}"
        "${BASH_BIN}" "${BASE}/scripts/healthcheck.sh" >/dev/null 2>&1 || true
        break
      fi
    done
  else
    echo "$(ts) ✅ Healthcheck OK" >> "${LOG}"
  fi
  sleep "${INTERVAL}"
done
