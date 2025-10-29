# judge_llm/model/scripts/start_server.sh
#!/usr/bin/env bash
set -euo pipefail

BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
source "$BASE/.env"

BIN="$HOME/llama.cpp/build/bin/llama-server"
LOG_DIR="$BASE/logs"
mkdir -p "$LOG_DIR"

[[ -x "$BIN" ]] || { echo "[ERR] llama-server not found: $BIN"; exit 1; }
[[ -f "$JUDGE_MODEL" ]] || { echo "[ERR] model not found: $JUDGE_MODEL"; exit 1; }

pkill -f "llama-server" || true

exec "$BIN" \
  -m "$JUDGE_MODEL" \
  -ngl "${JUDGE_N_GPU_LAYERS:--1}" \
  -c   "${JUDGE_N_CTX:-16384}" \
  --port   "${LLAMA_SERVER_PORT:-8080}" \
  --host   "${LLAMA_SERVER_HOST:-127.0.0.1}" \
  --parallel "${JUDGE_N_PARALLEL:-1}" \
  --temp     "${JUDGE_TEMPERATURE:-0}" \
  --n-predict "${LLAMA_SERVER_NPRED:-${JUDGE_MAX_TOKENS:-128}}" \
  --threads  "${JUDGE_N_THREADS:-8}" \
  -b         "${JUDGE_N_BATCH:-512}"
