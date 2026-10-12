#!/usr/bin/env bash
# Visual regression harness for PaperGit.
# Usage: shoot.sh <prefix> [width]   e.g. shoot.sh before 1440,900
set -u
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
QA="$(cd "$(dirname "$0")" && pwd)"
DIR="$QA/shots"
mkdir -p "$DIR"
PREFIX="${1:-before}"
WIN="${2:-1440,900}"

ROUTES=(
  "/|home"
  "/routes|routes"
  "/routes/usd|route_detail"
  "/nodes/ai|node_ai"
  "/nodes/ai?tab=papers|node_papers"
  "/nodes/ai?tab=timeline|node_timeline"
  "/search?q=diffusion|search"
  "/watchlist|watchlist"
  "/papers/1|paper_detail"
)

for entry in "${ROUTES[@]}"; do
  route="${entry%%|*}"
  out="${entry##*|}"
  png="$DIR/${PREFIX}_${out}_${WIN%%,*}.png"
  if "$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run \
      --window-size="$WIN" --virtual-time-budget=9000 \
      --screenshot="$png" "http://localhost:3000$route" 2>&1 | grep -q "bytes written"; then
    echo "ok   $out  $route"
  else
    echo "FAIL $out  $route"
  fi
done
echo "-> $DIR"
