#!/usr/bin/env bash
# ==============================================================================
# 🚀 ReplyX AI — 1-Click Complete Auto Deployment Script for Hostinger VPS
# Compatible with Ubuntu 20.04/22.04/24.04 & Debian 11/12
# ==============================================================================

set -e

# ANSI Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear

echo -e "${CYAN}${BOLD}"
echo "========================================================================"
echo "          🤖 ReplyX AI — Hostinger VPS 1-Click Auto Deployer            "
echo "========================================================================"
echo -e "${NC}"
echo -e "${YELLOW}এই স্ক্রিপ্টটি স্বয়ংক্রিয়ভাবে Hostinger VPS-এ আপনার ReplyX AI সার্ভার${NC}"
echo -e "${YELLOW}ইনস্টল, কনফিগার ও লাইভ করে দেবে (Node.js, PM2, Nginx, SSL, Database)!${NC}\n"

# 1. Root / Sudo Check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] অনুগ্রহ করে sudo দিয়ে স্ক্রিপ্টটি চালান:${NC}"
  echo -e "${BOLD}sudo bash deploy-hostinger.sh${NC}\n"
  exit 1
fi

PROJECT_DIR=$(pwd)
echo -e "${BLUE}[1/8] বর্তমান প্রজেক্ট ডিরেক্টরি:${NC} ${BOLD}${PROJECT_DIR}${NC}"

# Detect Server Public IP
PUBLIC_IP=$(curl -s -4 https://ifconfig.me || curl -s -4 https://api.ipify.org || echo "127.0.0.1")

# Prompt for Domain
echo ""
echo -e "${CYAN}------------------------------------------------------------------------${NC}"
read -p "আপনার ডোমেইন বা সাবডোমেইন নাম লিখুন (যেমন: app.yourdomain.com অথবা এন্টার চাপলে IP ${PUBLIC_IP} ব্যবহার হবে): " USER_DOMAIN
if [ -z "$USER_DOMAIN" ]; then
    SERVER_NAME="${PUBLIC_IP}"
    DOMAIN_DISPLAY="http://${PUBLIC_IP}"
    USE_SSL=false
else
    SERVER_NAME="${USER_DOMAIN}"
    DOMAIN_DISPLAY="http://${USER_DOMAIN}"
    USE_SSL=true
fi
echo -e "${GREEN}-> নির্বাচিত ডোমেইন/হোস্ট:${NC} ${BOLD}${SERVER_NAME}${NC}"
echo -e "${CYAN}------------------------------------------------------------------------${NC}\n"

# 2. System Packages & Dependencies
echo -e "${BLUE}[2/8] সিস্টেম প্যাকেজ আপডেট ও প্রয়োজনীয় ডিপেন্ডেন্সি ইনস্টল করা হচ্ছে...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl wget git build-essential nginx ufw openssl certbot python3-certbot-nginx

# Check & Install Node.js 20.x
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
    echo -e "${YELLOW}Node.js 20.x ইনস্টল করা হচ্ছে...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

NODE_VER=$(node -v)
NPM_VER=$(npm -v)
echo -e "${GREEN}-> Node.js ভার্সন:${NC} ${NODE_VER} | ${GREEN}npm:${NC} ${NPM_VER}"

# Check & Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 প্রসেস ম্যানেজার ইনস্টল করা হচ্ছে...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}-> PM2 ইনস্টল সম্পন্ন!${NC}\n"

# 3. Environment (.env) Setup
echo -e "${BLUE}[3/8] এনভায়রনমেন্ট কনফিগারেশন (.env) যাচাই করা হচ্ছে...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        echo -e "${YELLOW}.env পাওয়া যায়নি, .env.production থেকে তৈরি হচ্ছে...${NC}"
        cp .env.production .env
    elif [ -f ".env.example" ]; then
        echo -e "${YELLOW}.env পাওয়া যায়নি, .env.example থেকে নতুন .env তৈরি হচ্ছে...${NC}"
        cp .env.example .env
    else
        touch .env
    fi
fi

# Generate cryptographically secure JWT_SECRET and ENCRYPTION_KEY if empty or default
GEN_JWT=$(openssl rand -hex 32)
GEN_ENC=$(openssl rand -hex 16) # 32 chars hex

if ! grep -q "JWT_SECRET=" .env || grep -q 'JWT_SECRET="your_secure_jwt_secret_key_here"' .env || grep -q 'JWT_SECRET=""' .env; then
    sed -i '/JWT_SECRET=/d' .env 2>/dev/null || true
    echo "JWT_SECRET=\"${GEN_JWT}\"" >> .env
fi

if ! grep -q "ENCRYPTION_KEY=" .env || grep -q 'ENCRYPTION_KEY="your_32_character_encryption_key!"' .env || grep -q 'ENCRYPTION_KEY=""' .env; then
    sed -i '/ENCRYPTION_KEY=/d' .env 2>/dev/null || true
    echo "ENCRYPTION_KEY=\"${GEN_ENC}\"" >> .env
fi

if ! grep -q "PORT=" .env; then
    echo "PORT=3000" >> .env
fi

if ! grep -q "NODE_ENV=" .env; then
    echo "NODE_ENV=production" >> .env
fi

# Update APP_URL with the chosen domain/IP
sed -i '/APP_URL=/d' .env 2>/dev/null || true
echo "APP_URL=\"${DOMAIN_DISPLAY}\"" >> .env

echo -e "${GREEN}-> .env ফাইল সফলভাবে প্রস্তুত করা হয়েছে!${NC}\n"

# 4. NPM Dependencies Installation
echo -e "${BLUE}[4/8] প্রজেক্ট প্যাকেজ ইনস্টল করা হচ্ছে (npm install)...${NC}"
npm install --legacy-peer-deps
echo -e "${GREEN}-> ডিপেন্ডেন্সি ইনস্টলেশন সম্পন্ন!${NC}\n"

# 5. Prisma ORM & Database Setup
echo -e "${BLUE}[5/8] ডাটাবেজ স্কিমা ও প্রিজমা ক্লায়েন্ট সিঙ্ক করা হচ্ছে...${NC}"
npx prisma generate

# Attempt DB push safely
echo -e "${YELLOW}ডাটাবেজ টেবিল আপডেট করা হচ্ছে...${NC}"
if npx prisma db push --skip-generate; then
    echo -e "${GREEN}-> ডাটাবেজ স্কিমা সফলভাবে আপডেট হয়েছে!${NC}"
else
    echo -e "${RED}[WARNING] ডাটাবেজ কানেকশন করতে পারেনি। আপনার .env ফাইলে DATABASE_URL চেক করুন।${NC}"
    echo -e "${YELLOW}ইনস্টলেশন চালিয়ে যাওয়া হচ্ছে...${NC}"
fi

# Seed Super Admin and packages
if [ -f "scripts/seed.js" ]; then
    echo -e "${YELLOW}সুপার অ্যাডমিন অ্যাকাউন্ট ও ডিফল্ট প্যাকেজ সিড করা হচ্ছে...${NC}"
    node scripts/seed.js || true
fi
echo ""

# 6. Build Next.js Production Bundle
echo -e "${BLUE}[6/8] Next.js প্রোডাকশন বিল্ড তৈরি করা হচ্ছে (npm run build)...${NC}"
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build
echo -e "${GREEN}-> প্রোডাকশন বিল্ড এবং স্ট্যাটিক অ্যাসেট মিররিং সম্পন্ন!${NC}\n"

# 7. Configure Nginx Reverse Proxy
echo -e "${BLUE}[7/8] Nginx রিভার্স প্রক্সি কনফিগার করা হচ্ছে...${NC}"
NGINX_CONF="/etc/nginx/sites-available/replyx"

cat > "${NGINX_CONF}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME};

    # Maximum file upload size (for attachments and webhooks)
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_vary on;

    # Static assets direct caching
    location /_next/static/ {
        alias ${PROJECT_DIR}/.next/static/;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /public/ {
        alias ${PROJECT_DIR}/public/;
        expires 30d;
        access_log off;
    }

    # Reverse proxy to Node.js / PM2
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF

# Enable Nginx Site
ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/
# Remove default nginx site if active
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# Configure Firewall
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
ufw allow 22/tcp >/dev/null 2>&1 || true

echo -e "${GREEN}-> Nginx কনফিগারেশন সফলভাবে সক্রিয় করা হয়েছে!${NC}\n"

# 8. Start / Restart PM2
echo -e "${BLUE}[8/8] PM2 দিয়ে ReplyX AI ব্যাকগ্রাউন্ড সার্ভিস চালু করা হচ্ছে...${NC}"
pm2 delete replyx-ai 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo -e "${GREEN}-> PM2 সার্ভিস সফলভাবে চালু হয়েছে!${NC}\n"

# 9. Free SSL Setup with Certbot (Optional if real domain provided)
if [ "$USE_SSL" = true ] && [ "$SERVER_NAME" != "${PUBLIC_IP}" ]; then
    echo -e "${CYAN}------------------------------------------------------------------------${NC}"
    read -p "আপনি কি এখনই Let's Encrypt ফ্রি SSL সার্টিফিকেট সেটআপ করতে চান? (y/N): " INSTALL_SSL
    if [[ "$INSTALL_SSL" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Certbot SSL সার্টিফিকেট ইনস্টল হচ্ছে...${NC}"
        certbot --nginx -d "${SERVER_NAME}" --non-interactive --agree-tos --register-unsafely-without-email --redirect || true
        DOMAIN_DISPLAY="https://${SERVER_NAME}"
        # Update APP_URL to https in .env
        sed -i "s|APP_URL=.*|APP_URL=\"https://${SERVER_NAME}\"|g" .env
        pm2 restart replyx-ai
    fi
fi

# Set proper folder permissions
chmod -R 755 "${PROJECT_DIR}"
chown -R root:root "${PROJECT_DIR}" 2>/dev/null || true

# Summary Banner
echo ""
echo -e "${GREEN}${BOLD}========================================================================${NC}"
echo -e "${GREEN}${BOLD}       🎉 অভিনন্দন! ReplyX AI সফলভাবে Hostinger VPS-এ ডেপ্লয় হয়েছে!       ${NC}"
echo -e "${GREEN}${BOLD}========================================================================${NC}"
echo ""
echo -e " 🌐 ${BOLD}ওয়েবসাইট লিংক:${NC}         ${CYAN}${BOLD}${DOMAIN_DISPLAY}${NC}"
echo -e " 🔑 ${BOLD}লগইন লিংক:${NC}             ${CYAN}${BOLD}${DOMAIN_DISPLAY}/login${NC}"
echo -e " 👤 ${BOLD}ডিফল্ট অ্যাডমিন ইমেইল:${NC}  ${BOLD}admin@replyx.ai${NC}"
echo -e " 🔒 ${BOLD}ডিফল্ট পাসওয়ার্ড:${NC}       ${BOLD}admin123456${NC}"
echo ""
echo -e " 💡 ${BOLD}দরকারী কমান্ডসমূহ:${NC}"
echo -e "    - লগ দেখতে:            ${YELLOW}pm2 logs replyx-ai${NC}"
echo -e "    - সার্ভার রিস্টার্ট করতে: ${YELLOW}pm2 restart replyx-ai${NC}"
echo -e "    - স্ট্যাটাস চেক করতে:   ${YELLOW}pm2 status${NC}"
echo ""
if [ "$USE_SSL" = false ] || [ "$DOMAIN_DISPLAY" = "http://${SERVER_NAME}" ]; then
echo -e " 🔒 ${BOLD}ভবিষ্যতে ফ্রি SSL সার্টিফিকেট ইনস্টল করার নিয়ম:${NC}"
echo -e "    ${YELLOW}certbot --nginx -d আপনার_ডোমেইন${NC}"
echo ""
fi
echo -e "${GREEN}========================================================================${NC}\n"

