#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT
export DOJANG_MEMBER_TEST_BUILD="$BUILD"
export DOJANG_MEMBER_TEST_ROOT="$ROOT"
node <<'JS'
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.DOJANG_MEMBER_TEST_ROOT;
fs.writeFileSync(path.join(process.env.DOJANG_MEMBER_TEST_BUILD, 'tsconfig.json'), JSON.stringify({
  extends: path.join(root, 'tsconfig.json'),
  compilerOptions: { noEmit: false, incremental: false, module: 'commonjs', moduleResolution: 'node', target: 'ES2022', types: ['node'], typeRoots: [path.join(root, 'node_modules/@types')], outDir: path.join(process.env.DOJANG_MEMBER_TEST_BUILD, 'compiled'), rootDir: path.join(root, 'src') },
  include: [path.join(root, 'src/integrations/member.ts'), path.join(root, 'src/integrations/mock/routes/companion-context.ts'), path.join(root, 'src/integrations/mock/routes/companion-requests.ts'), path.join(root, 'src/integrations/mock/routes/companion-approvals.ts')],
  exclude: []
}));
JS
cd "$ROOT"
./node_modules/.bin/tsc --project "$BUILD/tsconfig.json"
NEXT_PUBLIC_DEMO_MODE=true node --test tests/member-context.test.cjs
