#!/usr/bin/env bash
# Runs every assertion-style probe and reports pass/fail in one go.
#
#   tools/run-probes.sh            # all of them
#   tools/run-probes.sh cutscene   # only probes whose name contains "cutscene"
#
# Starts its own server on PORT if nothing is listening there, and stops it
# again on the way out. Probes are plain pages that need http:// — the game
# is ES modules, which browsers won't load off the filesystem.
#
# A probe "passes" if its output contains no FAIL/THREW line and its
# `errors:` line says none. Probes that only print numbers for a human to
# read (gap-probe's autoplay, the autoplay bots) are listed under
# REPORT_ONLY: they're run and shown, never judged.
set -u

PORT="${PORT:-8000}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILTER="${1:-}"
BROWSER="${BROWSER:-brave-browser}"

# An entry may carry a query string; it's appended to the URL as-is.
ASSERTING=(
  module-load-probe
  cutscene-runner-probe dialogue-probe cutscene-probe
  mining-and-nohop-probe progression-probe save-probe
  boot-flow-probe respawn-safety-probe coin-probe weapon-probe
  climb-probe coin-trio-check platform-coin-check
)
# One per level in the registry — the gate an authored level has to pass
# before it counts as built. The count is read off the registry rather than
# hardcoded, so adding a level to the game adds it to the suite and nobody
# has to remember to widen a loop here.
LEVEL_COUNT="$(grep -cE "^import level[0-9]+ from" "$ROOT/src/levels/registry.js")"
for ((i = 0; i < LEVEL_COUNT; i++)); do ASSERTING+=("level-audit-probe?level=$i"); done
ASSERTING+=(level-data-probe level-select-probe enemy-collision-probe boss-fight-probe story-beats-probe progression-chain-probe respawn-state-probe full-playthrough-probe)
REPORT_ONLY=(gap-probe walk-only-autoplay edge-transition-trace)

started_server=0
if ! curl -s -o /dev/null --max-time 2 "http://localhost:$PORT/index.html"; then
  ( cd "$ROOT" && python3 -m http.server "$PORT" >/dev/null 2>&1 & )
  started_server=1
  sleep 1
fi
cleanup() { [ "$started_server" = 1 ] && pkill -f "http.server $PORT" >/dev/null 2>&1; return 0; }
trap cleanup EXIT

run_one() {
  # Split "name?query" into page and query string.
  local page="${1%%\?*}" query=""
  [ "$page" != "$1" ] && query="?${1#*\?}"
  # The per-obstacle level audit runs a few hundred simulated jumps, which
  # needs a much longer virtual-time budget than a probe that ticks a few
  # hundred frames once.
  local budget=13000
  case "$page" in level-audit-probe|full-playthrough-probe|enemy-collision-probe) budget=120000 ;; esac
  "$BROWSER" --headless=new --disable-gpu --no-sandbox \
    --virtual-time-budget=$budget --dump-dom "http://localhost:$PORT/tools/$page.html$query" 2>/dev/null \
    | python3 "$ROOT/tools/probe-extract.py"
}

fails=0
echo "== asserting =="
for probe in "${ASSERTING[@]}"; do
  [ -n "$FILTER" ] && [[ "$probe" != *"$FILTER"* ]] && continue
  out="$(run_one "$probe")"
  bad="$(printf '%s\n' "$out" | grep -E 'FAIL|THREW|^\*\*\*' || true)"
  errline="$(printf '%s\n' "$out" | grep '^errors:' || true)"
  if [ "$out" = "NO-OUTPUT" ]; then
    printf '  %-26s DID NOT RUN (page threw before printing)\n' "$probe"; fails=$((fails+1))
  elif [ -n "$bad" ]; then
    printf '  %-26s FAILED\n' "$probe"
    printf '%s\n' "$bad" | sed 's/^/      /'
    fails=$((fails+1))
  elif [ -n "$errline" ] && [ "$errline" != "errors: none" ]; then
    printf '  %-26s %s\n' "$probe" "$errline"; fails=$((fails+1))
  else
    printf '  %-26s ok\n' "$probe"
  fi
done

echo
echo "== report only (numbers for a human, never judged) =="
for probe in "${REPORT_ONLY[@]}"; do
  [ -n "$FILTER" ] && [[ "$probe" != *"$FILTER"* ]] && continue
  echo "  --- $probe"
  run_one "$probe" | tail -n 4 | sed 's/^/      /'
done

echo
if [ "$fails" -eq 0 ]; then echo "all asserting probes passed"; else echo "$fails probe(s) failed"; fi
exit "$fails"
