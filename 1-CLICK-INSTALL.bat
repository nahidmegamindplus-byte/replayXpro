@echo off
setlocal
cd /d "%~dp0"

set "PATH=C:\Users\User\nodejs;C:\Program Files\nodejs;%LOCALAPPDATA%\Programs\node;%PATH%"

title ReplyX AI - Automatic 1-Click Installer
cls
echo ================================================================
echo             ReplyX AI - ১-ক্লিক অটোমেটিক ইনস্টলার
echo ================================================================
echo.

:: ১. Node.js চেক করা
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] আপনার কম্পিউটারে Node.js ইনস্টল করা নেই!
    echo অনুগ্রহ করে https://nodejs.org থেকে Node.js ইনস্টল করে নিন।
    echo.
    pause
    exit /b 1
)
echo [1/5] Node.js সনাক্ত করা হয়েছে... OK!

:: ২. .env ফাইল তৈরি করা
if not exist ".env" (
    echo [2/5] কনফিগারেশন ফাইল (.env) তৈরি করা হচ্ছে...
    if exist ".env.production" (
        copy ".env.production" ".env" >nul
    ) else if exist ".env.example" (
        copy ".env.example" ".env" >nul
    )
) else (
    echo [2/5] কনফিগারেশন ফাইল (.env) উপস্থিত আছে... OK!
)

:: ৩. ডিপেন্ডেন্সি প্যাকেজ ইনস্টল
if not exist "node_modules\" (
    echo [3/5] প্রয়োজনীয় লাইব্রেরি ইনস্টল হচ্ছে (১-২ মিনিট সময় লাগতে পারে)...
    call npm install
) else (
    echo [3/5] লাইব্রেরি ইতিমধ্যে ইনস্টল করা আছে... OK!
)

:: ৪. ডাটাবেজ তৈরি ও অ্যাডমিন অ্যাকাউন্ট সিড করা
echo [4/5] ডাটাবেজ ও সুপার অ্যাডমিন তৈরি হচ্ছে...
call node node_modules\prisma\build\index.js generate >nul 2>&1
call node node_modules\prisma\build\index.js db push --skip-generate >nul 2>&1
call node scripts\seed.js

:: পোর্ট ৩০০০ ক্লিয়ার করা (যদি কোনো প্রসেস আটকে থাকে)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: ৫. সার্ভার চালু করা এবং ব্রাউজার ওপেন করা
echo [5/5] সার্ভার চালু হচ্ছে এবং ব্রাউজারে ওপেন হচ্ছে...
echo.
echo ================================================================
echo   অভিনন্দন! ইনস্টলেশন সফল হয়েছে!
echo.
echo   ওয়েবসাইট লিংক:   http://localhost:3000
echo   লগইন লিংক:        http://localhost:3000/login
echo.
echo   ডিফল্ট অ্যাডমিন ইমেইল:   admin@replyx.ai
echo   ডিফল্ট পাসওয়ার্ড:        admin123456
echo ================================================================
echo.

start "" "http://localhost:3000"

call npm run dev
