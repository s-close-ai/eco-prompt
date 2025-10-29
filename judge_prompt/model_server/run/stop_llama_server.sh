#!/usr/bin/env bash
set -euo pipefail

# -------------------------------
# 기본 경로 설정
# -------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${ROOT_DIR}/logs"
PID_FILE="${LOG_DIR}/llama_server.pid"

# -------------------------------
# PID 파일 확인
# -------------------------------
if [ ! -f "${PID_FILE}" ]; then
  echo "⚠️  No PID file found at ${PID_FILE}"
  exit 0
fi

PID="$(cat "${PID_FILE}")"

# -------------------------------
# 프로세스 존재 여부 확인
# -------------------------------
if ! kill -0 "${PID}" 2>/dev/null; then
  echo "⚠️  Process with PID ${PID} not running"
  rm -f "${PID_FILE}"
  exit 0
fi

# -------------------------------
# 프로세스 종료
# -------------------------------
echo "🛑 Stopping llama-cpp.server (PID ${PID})..."
kill "${PID}" || true

# 종료 확인 루프
for i in {1..10}; do
  if ! kill -0 "${PID}" 2>/dev/null; then
    echo "✅ llama-cpp.server stopped successfully"
    rm -f "${PID_FILE}"
    exit 0
  fi
  sleep 0.5
done

# 강제 종료 (필요시)
echo "⚠️  Process still alive after 5s, force killing..."
kill -9 "${PID}" || true
rm -f "${PID_FILE}"
echo "✅ Force killed process ${PID}"
