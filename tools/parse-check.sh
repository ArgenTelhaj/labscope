#!/bin/sh
# Runs the ingestion pipeline over PDFs on disk. Usage: tools/parse-check.sh a.pdf b.pdf
set -e
cd "$(dirname "$0")/.."
npx rolldown tools/parse-check.mts --format esm --platform node \
  --external 'pdfjs-dist/legacy/build/pdf.mjs' \
  --external 'pdfjs-dist/build/pdf.worker.min.mjs?url' \
  --external 'pdfjs-dist' \
  -d .parse-check-out >/dev/null
node .parse-check-out/parse-check.js "$@" 2>&1 | grep -v 'Warning: '
