Set-Location -Path $PSScriptRoot
$env:PATH = "C:\Users\User\nodejs;$env:PATH"
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  ReplyX AI - Facebook Messenger AI Automation SaaS" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Starting Local Development Server at http://localhost:3000" -ForegroundColor Yellow
Start-Process "http://localhost:3000"
npm run dev
