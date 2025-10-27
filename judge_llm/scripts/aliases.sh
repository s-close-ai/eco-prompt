#!/usr/bin/env bash
BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== health =="
curl -s http://127.0.0.1:8080/health || true
echo

echo "== server logs (tail) =="
tail -n 30 "$BASE/logs/server.stderr.log" 2>/dev/null || echo "(no server.stderr.log yet)"
echo

echo "== watchdog logs (tail) =="
tail -n 30 "$BASE/logs/watchdog.log" 2>/dev/null || echo "(no watchdog.log yet)"
echo

echo "== ps =="
pgrep -fl llama-server || echo "(llama-server not found)"
pgrep -fl watchdog.sh  || echo "(watchdog.sh not found)"
