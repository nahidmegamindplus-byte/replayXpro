@echo off
setlocal
cd /d "%~dp0"
set "PATH=C:\Users\User\nodejs;C:\Program Files\nodejs;%LOCALAPPDATA%\Programs\node;%PATH%"

title ReplyX AI - Production Server
cls
echo ================================================================
echo         ReplyX AI - Facebook Messenger AI SaaS
echo                Production Server Launcher
echo ================================================================
echo.

:: Free Port 3000 if occupied
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [*] Generating Prisma Client...
call node node_modules\prisma\build\index.js generate
echo [*] Building project for production...
call node node_modules\next\dist\bin\next build

if %ERRORLEVEL% NEQ 0 goto :BUILD_ERR

echo.
echo [*] Starting Production Server on port 3000...
start "" "http://localhost:3000"
call node node_modules\next\dist\bin\next start -p 3000
goto :END

:BUILD_ERR
echo.
echo [ERROR] Build failed!
pause
exit /b 1

:END
pause
