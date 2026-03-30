# Crea el repo en GitHub y hace push (requiere: gh auth login previo)
$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\GitHub CLI;" + $env:Path

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Primero iniciá sesión en GitHub:" -ForegroundColor Yellow
  Write-Host "  gh auth login" -ForegroundColor Cyan
  Write-Host "Elegí GitHub.com, HTTPS y autenticación por navegador." -ForegroundColor Gray
  exit 1
}

$repoName = if ($args[0]) { $args[0] } else { "VentasxLink" }
Write-Host "Creando repositorio '$repoName' (privado) y haciendo push..." -ForegroundColor Green
gh repo create $repoName --private --source=. --remote=origin --push
