#!/usr/bin/env bash
# ==============================================================================
# 🚀 ReplyX AI — 1-Click Setup Script for Hostinger Web / Cloud Hosting (hPanel)
# ==============================================================================

set -e

echo "================================================================"
echo "    ReplyX AI — Hostinger hPanel Node.js 1-Click Setup"
echo "================================================================"
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js পাওয়া যায়নি! অনুগ্রহ করে hPanel থেকে Node.js সক্রিয় করুন।"
    exit 1
fi
echo "[1/6] Node.js পাওয়া গেছে: $(node -v)"

# 2. Check .env
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        echo "[2/6] .env তৈরি করা হচ্ছে .env.production থেকে..."
        cp .env.production .env
    elif [ -f ".env.example" ]; then
        echo "[2/6] .env তৈরি করা হচ্ছে .env.example থেকে..."
        cp .env.example .env
    else
        touch .env
    fi
else
    echo "[2/6] কনফিগারেশন ফাইল (.env) পাওয়া গেছে... OK!"
fi

# 3. Install packages
echo "[3/6] লাইব্রেরি ও ডিপেন্ডেন্সি ইনস্টল করা হচ্ছে (npm install)..."
npm install --legacy-peer-deps

# 4. Prisma client & DB sync
echo "[4/6] ডাটাবেজ প্রিজমা ক্লায়েন্ট ও স্কিমা সিঙ্ক করা হচ্ছে..."
npx prisma generate
npx prisma db push --skip-generate || true

# Seed admin
if [ -f "scripts/seed.js" ]; then
    echo "অ্যাডমিন অ্যাকাউন্ট সিড করা হচ্ছে..."
    node scripts/seed.js || true
fi

# 5. Build Next.js
echo "[5/6] প্রোডাকশন বিল্ড তৈরি করা হচ্ছে (npm run build)..."
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=1024"
npm run build

# 6. Set proper permissions and trigger reload
echo "[6/6] পারমিশন সেট করা হচ্ছে এবং অ্যাপ্লিকেশন রিস্টার্ট সিগন্যাল দেওয়া হচ্ছে..."
chmod 755 server.js app.js .htaccess 2>/dev/null || true
mkdir -p tmp
touch tmp/restart.txt

echo ""
echo "================================================================"
echo "  🎉 সফল হয়েছে! Hostinger hPanel-এ সেটআপ সম্পন্ন!"
echo "  এখন hPanel Node.js পেজে গিয়ে 'Restart' বাটনে ক্লিক করুন।"
echo "  ডিফল্ট অ্যাডমিন ইমেইল: admin@replyx.ai"
echo "  ডিফল্ট পাসওয়ার্ড:      admin123456"
echo "================================================================"

