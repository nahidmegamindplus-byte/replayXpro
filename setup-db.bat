@echo off
setlocal
cd /d "%~dp0"

set "PATH=C:\Users\User\nodejs;C:\Program Files\nodejs;%LOCALAPPDATA%\Programs\node;%PATH%"

title ReplyX AI - Database Setup
cls
echo ================================================================
echo         ReplyX AI - Database Initialization ^& Setup
echo ================================================================
echo.
echo [*] Working Directory: %CD%
echo [*] Pushing Prisma Schema to SQLite Database...
call node node_modules\prisma\build\index.js db push --skip-generate

echo [*] Generating Prisma Client...
call node node_modules\prisma\build\index.js generate

echo [*] Seeding Super Admin, Packages and Payment Methods...
call node scripts\seed.js

echo.
echo ================================================================
echo [SUCCESS] Database setup ^& seed completed successfully!
echo Super Admin Account:  admin@replyx.ai / admin123456
echo ================================================================
echo.
pause
