#!/usr/bin/env bash
set -euo pipefail

ENV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$ENV_DIR/.env"

BIN="$HOME/llama.cpp/build/bin/llama-server"
LOG_DIR="$ENV_DIR/logs"
mkdir -p "$LOG_DIR"

# 필수 확인
[[ -x "$BIN" ]] || { echo "[ERR] llama-server not found: $BIN"; exit 1; }
[[ -f "$JUDGE_MODEL" ]] || { echo "[ERR] model not found: $JUDGE_MODEL"; exit 1; }

# 기존 프로세스 종료(있으면)
pkill -f "llama-server" || true

# 실행 (줄바꿈 역슬래시 없이, 빈 인자 방지)
exec "$BIN" -m "$JUDGE_MODEL" -ngl "$JUDGE_N_GPU_LAYERS" -c "$JUDGE_N_CTX" --port "$LLAMA_SERVER_PORT" --host "$LLAMA_SERVER_HOST" --parallel "$LLAMA_SERVER_PARALLEL" --temp "$LLAMA_SERVER_TEMP" --n-predict "$LLAMA_SERVER_NPRED" --threads "$JUDGE_N_THREADS" -b "$JUDGE_N_BATCH"
