@echo off
setlocal
cd /d "%~dp0"

set "PATH=C:\Users\User\nodejs;C:\Program Files\nodejs;%LOCALAPPDATA%\Programs\node;%PATH%"

title ReplyX AI - Production Build
cls
echo ================================================================
echo         ReplyX AI - Building Project for Production
echo ================================================================
echo.
echo [*] Working Directory: %CD%
echo [*] Generating Prisma Client...
call node node_modules\prisma\build\index.js generate
echo [*] Running Next.js Build...
call node node_modules\next\dist\bin\next build

if %ERRORLEVEL% NEQ 0 goto :BUILD_FAIL

echo.
echo ================================================================
echo [SUCCESS] Production build completed successfully!
echo Run start-production.bat or npm run start to launch.
echo ================================================================
echo.
pause
exit /b 0

:BUILD_FAIL
echo.
echo [ERROR] Production build failed!
echo.
pause
exit /b 1
