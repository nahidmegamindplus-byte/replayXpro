# 🚀 Hostinger-এ ReplyX AI ডেপ্লয়মেন্ট গাইড (১০০% পারফেক্ট ও এররমুক্ত)

ReplyX AI প্রজেক্টটি Hostinger-এর **Web / Cloud Hosting (hPanel Node.js Selector)** এবং **Hostinger VPS (Ubuntu/Debian with PM2)** উভয় প্ল্যাটফর্মে নির্বিঘ্নে চলার জন্য প্রস্তুত করা হয়েছে।

---

## 🛠️ পদ্ধতি ১: Hostinger Cloud / Shared Web Hosting (hPanel Node.js Selector)

যদি আপনি Hostinger-এর hPanel ব্যবহার করে Node.js অ্যাপ রান করতে চান:

### ১. প্রজেক্ট ফাইল আপলোড করুন
- আপনার ডোমেইনের রুট ডিরেক্টরিতে (যেমন `public_html` অথবা সাবডোমেইন ফোল্ডার) প্রজেক্টের সব ফাইল আপলোড করুন।

### ২. hPanel থেকে Node.js কনফিগার করুন
1. **Hostinger hPanel**-এ লগইন করুন এবং আপনার ডোমেইনে প্রবেশ করুন।
2. বাঁপাশের মেনু থেকে **Advanced** -> **Node.js**-এ যান।
3. **Create Application** অথবা কনফিগারেশনে নিচের মানগুলো দিন:
   - **Node.js version:** `20.x` (অথবা `18.x`)
   - **Application Mode:** `Production`
   - **Application Root:** `/public_html` (অথবা যে ফোল্ডারে ফাইল রেখেছেন)
   - **Application URL:** আপনার ডোমেইন বা সাবডোমেইন সিলেক্ট করুন
   - **Application Startup File:** `server.js` 👈 **(খুব গুরুত্বপূর্ণ)**
4. **Save**-এ ক্লিক করুন।

### ৩. Environment Variables (.env) সেট করুন
প্রজেক্টের রুট ফোল্ডারে `.env` ফাইলে নিচের তথ্যগুলো পূরণ করুন:
```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="apnar_strong_jwt_secret_key_minimum_32_characters"
ENCRYPTION_KEY="apnar_32_character_encryption_key!"
APP_URL="https://yourdomain.com"
PORT=3000

# AI Provider Keys
GEMINI_API_KEY=""
OPENAI_API_KEY=""

# Facebook App Credentials
FACEBOOK_APP_ID=""
FACEBOOK_APP_SECRET=""
FACEBOOK_GRAPH_API_VERSION="v20.0"
FACEBOOK_WEBHOOK_VERIFY_TOKEN="replyx_secure_verify_token"
```

### ৪. ডিপেন্ডেন্সি ইনস্টল ও বিল্ড তৈরি করুন
Hostinger hPanel-এর **Terminal / SSH** অথবা Node.js ম্যানেজারের **Run NPM Script** অপশনে গিয়ে চালান:
```bash
npm install
npm run build
```

### ৫. অ্যাপ্লিকেশন রিস্টার্ট করুন
- hPanel Node.js সেকশনে গিয়ে **Restart Application** বাটনে ক্লিক করুন।
- আপনার ডোমেইন ভিজিট করলেই হোমপেজ, লগইন এবং অ্যাডমিন প্যানেল কোনো সমস্যা ছাড়াই লোড হবে!

---

## ⚡ পদ্ধতি ২: Hostinger VPS (Ubuntu / Debian with PM2 & Nginx)

যদি আপনি Hostinger VPS ব্যবহার করেন:

### ১. প্রয়োজনীয় টুলস আপডেট ও ইনস্টল
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx

# Node.js 20 ইনস্টল
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### ২. প্রজেক্ট সেটআপ
```bash
cd /var/www
# অথবা আপনার প্রজেক্টের ডিরেক্টরিতে যান
git clone https://github.com/nahidmegamindplus-byte/update-Replyxai.git replyx
cd replyx

# ডিপেন্ডেন্সি ইনস্টল
npm install

# .env কনফিগার করুন
cp .env.example .env
nano .env   # আপনার আসল ডোমেইন এবং সিক্রেট কি বসান

# বিল্ড করুন
npm run build
```

### ৩. PM2 দিয়ে ব্যাকগ্রাউন্ডে চালু করুন
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### ৪. Nginx রিভার্স প্রক্সি কনফিগারেশন (`/etc/nginx/sites-available/replyx`)
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
এনাবল ও রিস্টার্ট করুন:
```bash
sudo ln -s /etc/nginx/sites-available/replyx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 ডেটাবেস ও নিরাপত্তা সম্পর্কিত নোট
1. **SQLite স্বয়ংক্রিয় সেলফ-হিলিং:** প্রথমবার সার্ভার চালু হওয়ার সাথে সাথে `server.js` স্বয়ংক্রিয়ভাবে ডাটাবেসের টেবিল ও প্রয়োজনীয় ডিফল্ট সেটিংস তৈরি করে নেয়।
2. **ডিফল্ট সুপার অ্যাডমিন ক্রেডেনশিয়াল:**
   - **ইমেইল:** `admin@replyx.ai`
   - **পাসওয়ার্ড:** `admin123`
   *(লগইন করে অ্যাডমিন সেটিংস থেকে পাসওয়ার্ড পরিবর্তন করে নিবেন)*
