#!/bin/bash
set -e

echo "=== GIT STATUS ==="
git status --short
echo ""

echo "=== COMMIT NON PUSHATI ==="
git log origin/main..HEAD --oneline
echo ""

echo "=== STASH ==="
git stash list
echo ""

echo "=== FILE TRACCIATI (count) ==="
git ls-files | wc -l
echo ""

echo "=== RIGHE TS/TSX ==="
git ls-files "*.ts" "*.tsx" | xargs wc -l | tail -1
echo ""

echo "=== RIFERIMENTI RESIDUI ==="
git grep -n -i "openpitch\|cardine" -- . ':!CHANGELOG.md' ':!docs/ARCHIVE/*' ':!README.md' ':!*.log' ':!scripts/pre-build-check.*' || echo "Nessuno in codice attivo (eccetto note storiche)"
echo ""

echo "=== FILE SOSPETTI (log, env, node_modules) ==="
git ls-files | grep -E "node_modules|\.log$|\.env$|bun\.lock" || echo "Nessuno"
echo ""

echo "=== TYPECHECK ==="
npx tsc --noEmit && echo "OK" || echo "FALLITO"
echo ""

echo "=== AUDIT ==="
npx tsx scripts/audit_real_vs_stub.ts && echo "OK" || echo "FALLITO"
echo ""

echo "=== BUILD ==="
npm run build && echo "OK" || echo "FALLITO"
