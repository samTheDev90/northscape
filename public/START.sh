#!/usr/bin/env bash
echo ""
echo "============================================"
echo " Panchagarh Voyage - Local Launcher"
echo "============================================"
echo ""
echo "Starting a local web server..."
echo "Close this terminal window to stop."
echo ""

URL="http://localhost:8000/index.html"

open_browser() {
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  elif command -v open >/dev/null 2>&1; then open "$URL"
  fi
}

if command -v python3 >/dev/null 2>&1; then
  open_browser &
  python3 -m http.server 8000
elif command -v python >/dev/null 2>&1; then
  open_browser &
  python -m http.server 8000
elif command -v node >/dev/null 2>&1; then
  open_browser &
  npx --yes serve -l 8000 .
else
  echo "No local server available. Open index.html directly."
fi