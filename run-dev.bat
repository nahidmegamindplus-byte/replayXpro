@echo off
setlocal
cd /d "%~dp0"

:: Add common Node.js install directories to PATH
set "PATH=C:\Users\User\nodejs;C:\Program Files\nodejs;%LOCALAPPDATA%\Programs\node;%PATH%"

title ReplyX AI - Local Development Server
cls
echo ================================================================
echo         ReplyX AI - Facebook Messenger AI SaaS
echo                Local Development Launcher
echo ================================================================
echo.
echo [*] Working Directory: %CD%

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto :NO_NODE

echo [*] Node.js is ready.

:: Free port 3000 if occupied
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: Check and initialize database if missing
if exist "prisma\dev.db" goto :DB_READY
echo [*] Initializing database (prisma\dev.db)...
call node node_modules\prisma\build\index.js db push --skip-generate
call node scripts\seed.js
echo [OK] Database ready!

:DB_READY
echo.
echo ================================================================
echo  Localhost URL:     http://localhost:3000
echo  Admin Panel:       http://localhost:3000/admin
echo  Admin Account:     admin@replyx.ai / admin123456
echo ================================================================
echo.
echo [*] Starting Server at http://localhost:3000 ...
echo [*] Press Ctrl+C in this window to stop the server anytime.
echo.

:: Open browser automatically in background
start "" "http://localhost:3000"

:: Start Next.js directly with node
call node node_modules\next\dist\bin\next dev -p 3000
goto :END

:NO_NODE
echo.
echo [ERROR] Node.js was not found on your system!
echo Please install Node.js from https://nodejs.org
echo.
pause
exit /b 1

:END
echo.
echo Server stopped.
pause
