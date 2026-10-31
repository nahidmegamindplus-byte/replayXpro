@echo off
setlocal enabledelayedexpansion

echo ==============================================================
echo   ReplyX AI - Buyer Release Packaging Tool
echo ==============================================================
echo.
echo This script will package a clean, production-ready ZIP file
echo for the buyer without leaking your private .env secrets,
echo node_modules, or local database caches.
echo.

cd /d "%~dp0"

set "RELEASE_NAME=replyx-ai-buyer-release.zip"

if exist "%RELEASE_NAME%" (
    echo [Info] Removing previous release archive...
    del /f /q "%RELEASE_NAME%"
)

echo [1/3] Checking environment and security sanity...
if not exist ".env.example" (
    echo [Error] .env.example not found! Please ensure template exists.
    pause
    exit /b 1
)

echo [2/3] Preparing clean bundle (excluding .env, node_modules, .next, .git, temp dbs)...
if exist "temp_bundle" rmdir /s /q "temp_bundle"
robocopy . temp_bundle /E /XD node_modules .next _next .git scratch temp_bundle /XF .env .env.local *.db *.db-wal *.db-shm %RELEASE_NAME% >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path 'temp_bundle\*' -DestinationPath '%RELEASE_NAME%' -Force"
if exist "temp_bundle" rmdir /s /q "temp_bundle"

echo.
echo ==============================================================
echo [3/3] Package complete!
echo ==============================================================
echo Output file: %RELEASE_NAME%
echo.
echo You can safely send "%RELEASE_NAME%" to your buyer!
echo It contains the full source code and setup guides,
echo but NO private API keys or database passwords.
echo ==============================================================
pause
