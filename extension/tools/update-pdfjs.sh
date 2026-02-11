#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PDFJS_DIR="$PROJECT_DIR/public/pdfjs"

if [ -n "${1:-}" ]; then
  VERSION="$1"
else
  echo "Fetching latest PDF.js version..."
  VERSION=$(curl -sL "https://api.github.com/repos/mozilla/pdf.js/releases/latest" \
    | grep '"tag_name"' | head -1 | sed -E 's/.*"v([^"]+)".*/\1/')
  if [ -z "$VERSION" ]; then
    echo "Error: Could not determine latest version." >&2
    exit 1
  fi
fi

echo "Updating PDF.js to v${VERSION}..."

DOWNLOAD_URL="https://github.com/mozilla/pdf.js/releases/download/v${VERSION}/pdfjs-${VERSION}-dist.zip"
TMPFILE=$(mktemp /tmp/pdfjs-XXXXXX.zip)
echo "Downloading from ${DOWNLOAD_URL}..."
curl -L -o "$TMPFILE" "$DOWNLOAD_URL"

INIT_SCRIPT=""
if [ -f "$PDFJS_DIR/margin-pdfjs-init.js" ]; then
  INIT_SCRIPT=$(cat "$PDFJS_DIR/margin-pdfjs-init.js")
fi

rm -rf "$PDFJS_DIR"
mkdir -p "$PDFJS_DIR"

echo "Extracting..."
unzip -q -o "$TMPFILE" -d "$PDFJS_DIR"
rm -f "$TMPFILE"

if [ -n "$INIT_SCRIPT" ]; then
  echo "$INIT_SCRIPT" > "$PDFJS_DIR/margin-pdfjs-init.js"
fi

echo "Cleaning up..."
rm -f "$PDFJS_DIR/web/compressed.tracemonkey-pldi-09.pdf"
rm -f "$PDFJS_DIR/web/debugger.css" "$PDFJS_DIR/web/debugger.mjs"
rm -rf "$PDFJS_DIR/web/wasm"
find "$PDFJS_DIR" -name '*.map' -delete

KEEP_LOCALES="ar bg ca cs da de el en-GB en-US es-AR es-CL es-ES es-MX et fi fr he hi-IN hr hu id it ja ko lt lv ms nb-NO nl pl pt-BR pt-PT ro ru sk sl sr sv-SE th tr uk vi zh-CN zh-TW"
LOCALE_DIR="$PDFJS_DIR/web/locale"
if [ -d "$LOCALE_DIR" ]; then
  for dir in "$LOCALE_DIR"/*/; do
    locale=$(basename "$dir")
    if ! echo " $KEEP_LOCALES " | grep -q " $locale "; then
      rm -rf "$dir"
    fi
  done
  if command -v python3 &>/dev/null && [ -f "$LOCALE_DIR/locale.json" ]; then
    python3 -c "
import json, sys
keep = set('$KEEP_LOCALES'.split())
d = json.load(open('$LOCALE_DIR/locale.json'))
filtered = {k:v for k,v in d.items() if k in keep}
json.dump(filtered, open('$LOCALE_DIR/locale.json','w'), ensure_ascii=False, separators=(',',':'))
print(f'  Kept {len(filtered)} of {len(d)} locales')
"
  fi
fi

echo "Patching viewer.mjs (origin check bypass)..."
sed -i '' 's/if (HOSTED_VIEWER_ORIGINS.has(viewerOrigin)) {/if (true) {/' \
  "$PDFJS_DIR/web/viewer.mjs"

echo "Patching viewer.html (script injection)..."
sed -i '' 's|<script src="viewer.mjs" type="module"></script>|<script src="viewer.mjs" type="module"></script>\
  <script src="/pdfjs/margin-pdfjs-init.js"></script>\
  <script src="/pdf-viewer.js" type="module"></script>|' \
  "$PDFJS_DIR/web/viewer.html"

FINAL_SIZE=$(du -sh "$PDFJS_DIR" | cut -f1)
echo ""
echo "PDF.js v${VERSION} installed successfully (${FINAL_SIZE})"
echo "Location: $PDFJS_DIR"
