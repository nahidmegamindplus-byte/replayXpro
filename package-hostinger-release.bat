@echo off
setlocal enabledelayedexpansion

title ReplyX AI - Hostinger 1-Click Release Packager
cls

echo ==============================================================================
echo        ReplyX AI - Hostinger 1-Click Pre-Built Release Packager
echo ==============================================================================
echo.
echo এই স্ক্রিপ্টটি আপনার কম্পিউটারে Next.js এবং সব অ্যাসেট সম্পূর্ণ বিল্ড করে
echo একটি রেডি-টু-ডেপ্লয় ZIP ফাইল (replyx-hostinger-ready.zip) তৈরি করবে।
echo এটি Hostinger hPanel-এ আপলোড করলে সার্ভারে বিল্ড করার কোনো ঝামেলা বা 
echo মেমরি লিমিটের কোনো এরর হবে না!
echo.

cd /d "%~dp0"

set "ZIP_NAME=replyx-hostinger-ready.zip"

if exist "%ZIP_NAME%" (
    echo [Info] পূর্বের রিলিজ আর্কাইভ মুছে ফেলা হচ্ছে...
    del /f /q "%ZIP_NAME%"
)

:: ১. বিল্ড তৈরি করা
echo [1/3] লোকাল মেশিনে প্রোডাকশন বিল্ড তৈরি হচ্ছে...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [Error] বিল্ড ব্যর্থ হয়েছে! অনুগ্রহ করে এরর মেসেজ চেক করুন।
    pause
    exit /b 1
)

:: ২. ক্লিন টেম্পোরারি বান্ডেল তৈরি
echo [2/3] Hostinger-এর জন্য প্রয়োজনীয় ফাইল গুছানো হচ্ছে...
if exist "temp_hostinger" rmdir /s /q "temp_hostinger"
mkdir "temp_hostinger"

:: মূল ফাইলসমূহ কপি করা
copy "server.js" "temp_hostinger\" >nul
copy "app.js" "temp_hostinger\" >nul
copy "ecosystem.config.js" "temp_hostinger\" >nul
copy ".htaccess" "temp_hostinger\" >nul
copy "package.json" "temp_hostinger\" >nul
copy "package-lock.json" "temp_hostinger\" >nul
copy "next.config.js" "temp_hostinger\" >nul
copy ".env.example" "temp_hostinger\" >nul
copy "deploy-hostinger.sh" "temp_hostinger\" >nul
copy "hostinger-hpanel-setup.sh" "temp_hostinger\" >nul
copy "HOSTINGER_DEPLOYMENT.md" "temp_hostinger\" >nul
if exist "global.css" copy "global.css" "temp_hostinger\" >nul

:: ফোল্ডারসমূহ কপি করা
robocopy "public" "temp_hostinger\public" /E >nul
robocopy ".next" "temp_hostinger\.next" /E >nul
robocopy "_next" "temp_hostinger\_next" /E >nul
robocopy "prisma" "temp_hostinger\prisma" /E /XF *.db *.db-wal *.db-shm >nul
robocopy "scripts" "temp_hostinger\scripts" /E >nul

:: ৩. ZIP ফাইল তৈরি
echo [3/3] %ZIP_NAME% তৈরি করা হচ্ছে...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path 'temp_hostinger\*' -DestinationPath '%ZIP_NAME%' -Force"

if exist "temp_hostinger" rmdir /s /q "temp_hostinger"

echo.
echo ==============================================================================
echo   🎉 অভিনন্দন! Hostinger রেডি প্যাকেজ তৈরি সম্পন্ন হয়েছে!
echo ==============================================================================
echo   ফাইল: %ZIP_NAME%
echo.
echo   Hostinger-এ ডেপ্লয় করার ৩টি সহজ ধাপ:
echo   ১. Hostinger hPanel File Manager-এ গিয়ে public_html-এ %ZIP_NAME% আপলোড করে Extract করুন।
echo   ২. .env.example কে .env নামে রিনেম করে আপনার DATABASE_URL বসিয়ে দিন।
echo   ৩. hPanel Node.js পেজে গিয়ে Startup File হিসেবে 'server.js' সিলেক্ট করে Restart চাপুন!
echo ==============================================================================
echo.
pause

