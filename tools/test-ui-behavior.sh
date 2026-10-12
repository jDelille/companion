#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT
cd "$ROOT"
./node_modules/.bin/tsc --strict --target ES2022 --module commonjs --skipLibCheck --outDir "$BUILD" src/domain/dock-scroll.ts
export DOJANG_DOCK_MODULE="$BUILD/dock-scroll.js"
node --test tests/dock-scroll.test.cjs
