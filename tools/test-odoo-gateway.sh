#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT
cd "$ROOT"
./node_modules/.bin/tsc --strict --target ES2022 --module commonjs \
  --moduleResolution node --lib ES2022,DOM --types node \
  --typeRoots ./node_modules/@types --outDir "$BUILD" \
  src/server/odoo-gateway.ts src/contracts/kiosk-attendance.ts
DOJANG_GATEWAY_MODULE="$BUILD/server/odoo-gateway.js" node --test tests/odoo-gateway.test.cjs
