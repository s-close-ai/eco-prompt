#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MODEL_PATH="${ROOT_DIR}/models/qwen2.5-7b/qwen2.5-7b-instruct-q5_k_m-00001-of-00002.gguf"
HOST="0.0.0.0"
PORT="8081"
CTX="8192"
NGL="32"
LOG_DIR="${ROOT_DIR}/model_server/logs"
LOG_FILE="${LOG_DIR}/llama_server.out"

mkdir -p "$LOG_DIR"

echo "[llama-cpp.server] starting..."
echo "MODEL_PATH=$MODEL_PATH"
echo "HOST=$HOST PORT=$PORT CTX=$CTX NGL=$NGL"

# 기존 프로세스 종료
PID_FILE="${LOG_DIR}/llama_server.pid"
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "🛑 Killing existing process PID $(cat "$PID_FILE")"
  kill -9 "$(cat "$PID_FILE")" || true
fi

# 새 서버 실행
nohup python3 -m llama_cpp.server \
  --model "$MODEL_PATH" \
  --host "$HOST" \
  --port "$PORT" \
  --n_ctx "$CTX" \
  --n_gpu_layers "$NGL" \
  > "$LOG_FILE" 2>&1 &

true

echo $! > "$PID_FILE"
echo "[llama-cpp.server] PID $(cat "$PID_FILE")"
echo "logs: $LOG_FILE"
