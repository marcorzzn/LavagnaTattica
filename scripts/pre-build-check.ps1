# Pre-build automated check script for Windows PowerShell
Write-Host "=== GIT STATUS ===" -ForegroundColor Cyan
git status --short
Write-Host ""

Write-Host "=== COMMIT NON PUSHATI ===" -ForegroundColor Cyan
git log origin/main..HEAD --oneline
Write-Host ""

Write-Host "=== STASH ===" -ForegroundColor Cyan
git stash list
Write-Host ""

Write-Host "=== FILE TRACCIATI (count) ===" -ForegroundColor Cyan
$tracked = (git ls-files)
Write-Host "Totale file tracciati: $($tracked.Count)"
Write-Host ""

Write-Host "=== RIGHE TS/TSX ===" -ForegroundColor Cyan
$tsLines = (Get-ChildItem -Path src, scripts, server.ts -Recurse -Include *.ts,*.tsx | Get-Content | Measure-Object -Line).Lines
Write-Host "Totale righe TS/TSX: $tsLines"
Write-Host ""

Write-Host "=== RIFERIMENTI RESIDUI A OPENPITCH / CARDINE ===" -ForegroundColor Cyan
$residui = git grep -n -i "openpitch\|cardine" -- . ':!CHANGELOG.md' ':!docs/BLUEPRINT.md' ':!README.md' ':!*.log'
if ($residui) {
    Write-Host $residui -ForegroundColor Yellow
} else {
    Write-Host "Nessun riferimento residuo in codice (eccetto note storiche)" -ForegroundColor Green
}
Write-Host ""

Write-Host "=== FILE SOSPETTI TRACCIATI (log, env, node_modules, bun.lock) ===" -ForegroundColor Cyan
$suspicious = git ls-files | Select-String "node_modules|\.log$|\.env$|bun\.lock"
if ($suspicious) {
    Write-Host $suspicious -ForegroundColor Red
} else {
    Write-Host "Nessun file sospetto tracciato" -ForegroundColor Green
}
Write-Host ""

Write-Host "=== TYPECHECK (tsc) ===" -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -eq 0) { Write-Host "Typecheck OK (exit 0)" -ForegroundColor Green } else { Write-Host "Typecheck FALLITO" -ForegroundColor Red; exit 1 }
Write-Host ""

Write-Host "=== AUDIT MATEMATICO (scripts/audit_real_vs_stub.ts) ===" -ForegroundColor Cyan
npx tsx scripts/audit_real_vs_stub.ts
if ($LASTEXITCODE -eq 0) { Write-Host "Audit Matematico OK (exit 0)" -ForegroundColor Green } else { Write-Host "Audit FALLITO" -ForegroundColor Red; exit 1 }
Write-Host ""

Write-Host "=== VITE BUILD (npm run build) ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -eq 0) { Write-Host "Build di produzione OK (exit 0)" -ForegroundColor Green } else { Write-Host "Build FALLITA" -ForegroundColor Red; exit 1 }
Write-Host ""

Write-Host "=== VERIFICA PRE-BUILD COMPLETATA CON SUCCESSO! ===" -ForegroundColor Green
