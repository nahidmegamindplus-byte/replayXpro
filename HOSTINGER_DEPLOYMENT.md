# 🚀 Hostinger-এ ReplyX AI ১-ক্লিক পারফেক্ট ডেপ্লয়মেন্ট গাইড

ReplyX AI প্রজেক্টটি Hostinger-এর **VPS (Ubuntu / Debian / Docker)** এবং **Web / Cloud Hosting (hPanel Node.js Selector)** উভয় প্ল্যাটফর্মে যেন কোনো এরর ছাড়া ১-ক্লিকে ইনস্টল ও চালু করা যায়, সেভাবে সম্পূর্ণ প্রস্তুত করা হয়েছে।

---

## ⚡ পদ্ধতি ১: Hostinger VPS (১-ক্লিক সম্পূর্ণ অটোমেটিক স্ক্রিপ্ট) — সবচেয়ে সহজ ও রেকমেন্ডেড

Hostinger VPS-এ (Ubuntu 20.04/22.04/24.04 বা Debian) পুরো সেটআপটি ১টি মাত্র কমান্ডেই স্বয়ংক্রিয়ভাবে সম্পন্ন হবে। স্ক্রিপ্টটি নিজ থেকেই Node.js 20, PM2, Nginx রিভার্স প্রক্সি, ফায়ারওয়াল, ডাটাবেজ স্কিমা এবং ফ্রি SSL কনফিগার করে ফেলবে।

### ধাপসমূহ:

1. **VPS-এ SSH দিয়ে লগইন করুন:**
   ```bash
   ssh root@your_vps_ip
   ```

2. **প্রজেক্ট ফোল্ডারে প্রবেশ করুন (অথবা গিট ক্লোন করুন):**
   ```bash
   cd /var/www
   git clone https://github.com/nahidmegamindplus-byte/replayXpro.git replyx
   cd replyx
   ```
   *(অথবা যদি ফাইল আপলোড করে থাকেন, তবে সেই ফোল্ডারে যান)*

3. **১-ক্লিক ইনস্টলার স্ক্রিপ্টটি রান করুন:**
   ```bash
   sudo bash deploy-hostinger.sh
   ```

4. **স্ক্রিপ্টটি যা যা স্বয়ংক্রিয়ভাবে করবে:**
   - ✅ সব প্রয়োজনীয় সিস্টেম টুলস (`curl`, `git`, `nginx`, `ufw`, `certbot`) ইনস্টল করবে
   - ✅ Node.js 20.x ও PM2 গ্লোবালি ইনস্টল করবে
   - ✅ ক্রিপ্টোগ্রাফিক সিকিউর `JWT_SECRET` এবং `ENCRYPTION_KEY` তৈরি করে `.env` কনফিগার করবে
   - ✅ আপনার ডোমেইন নাম ইনপুট নেবে (অথবা সরাসরি VPS IP দিয়ে কনফিগার করবে)
   - ✅ `npm install` ও Prisma ORM ডাটাবেজ স্কিমা সিঙ্ক করবে
   - ✅ ডিফল্ট সুপার অ্যাডমিন (`admin@replyx.ai`) ও SaaS প্যাকেজ সিড করবে
   - ✅ Next.js প্রোডাকশন বিল্ড ও অ্যাসেট মিররিং করবে
   - ✅ Nginx রিভার্স প্রক্সি কনফিগার ও সক্রিয় করবে
   - ✅ PM2 দিয়ে ব্যাকগ্রাউন্ডে সার্ভিস চালু ও রিবুট-প্রটেক্টেড করে রাখবে
   - ✅ ফ্রি Let's Encrypt SSL ইনস্টল করার অপশন দেবে

5. **সার্ভার লাইভ!**
   স্ক্রিপ্ট শেষ হলে আপনার ব্রাউজারে ডোমেইন অথবা VPS আইপি দিলেই সম্পূর্ণ সাইট লোড হয়ে যাবে।

---

## 🌐 পদ্ধতি ২: Hostinger Web / Cloud Hosting (hPanel Node.js Selector)

যদি আপনার Hostinger-এর শেয়ার্ড বা ক্লাউড হোস্টিং থাকে এবং hPanel এর Node.js Selector ব্যবহার করতে চান:

### ধাপ ১: প্রজেক্ট প্যাকেজ তৈরি (বা সরাসরি আপলোড)
Hostinger শেয়ার্ড হোস্টিংয়ের মেমরি লিমিটের কারণে সার্ভারে বিল্ড করা কঠিন হলে আপনার কম্পিউটারে প্রজেক্ট ফোল্ডারে থাকা **`package-hostinger-release.bat`** ডাবল ক্লিক করুন।
- এটি স্বয়ংক্রিয়ভাবে বিল্ড সম্পন্ন করে **`replyx-hostinger-ready.zip`** তৈরি করে দেবে।

### ধাপ ২: ফাইল আপলোড
- Hostinger **hPanel**-এ লগইন করুন -> **File Manager** খুলুন।
- আপনার ডোমেইনের ডিরেক্টরিতে (`public_html` অথবা সাবডোমেইন ফোল্ডার) ফাইলগুলো আপলোড করে **Extract** করুন।

### ধাপ ৩: hPanel থেকে Node.js কনফিগারেশন
1. hPanel-এর বাঁপাশের মেনু থেকে **Advanced** -> **Node.js** অপশনে যান।
2. **Create Application** অথবা সেটিংসে নিচের মানগুলো দিন:
   - **Node.js version:** `20.x` (অথবা `18.x`)
   - **Application Mode:** `Production`
   - **Application Root:** `/public_html` (অথবা আপনার ফোল্ডার)
   - **Application URL:** আপনার ডোমেইন সিলেক্ট করুন
   - **Application Startup File:** `server.js` *(অথবা `app.js`)*
3. **Save** বাটনে ক্লিক করুন।

### ধাপ ৪: Environment Variables (.env) সেটআপ
প্রজেক্টের রুট ফোল্ডারে `.env.example` ফাইলটিকে রিনেম করে `.env` করুন অথবা এডিট করে আপনার আসল তথ্যগুলো দিন:
```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
JWT_SECRET="apnar_strong_jwt_secret_key_minimum_32_characters"
ENCRYPTION_KEY="apnar_32_character_encryption_key!"
APP_URL="https://yourdomain.com"
PORT=3000

# Facebook Webhook Credentials
FACEBOOK_APP_ID="your_app_id"
FACEBOOK_APP_SECRET="your_app_secret"
FACEBOOK_GRAPH_API_VERSION="v20.0"
FACEBOOK_WEBHOOK_VERIFY_TOKEN="replyx_secure_token"
```

### ধাপ ৫: ১-ক্লিক hPanel রান বা রিস্টার্ট
- যদি আপনি `package-hostinger-release.bat` দিয়ে তৈরি জিপ আপলোড করে থাকেন, তবে hPanel Node.js সেকশনে গিয়ে শুধু **"Run NPM install"** ক্লিক করুন এবং **"Restart"** বাটনে ক্লিক করুন!
- অথবা hPanel এর **Terminal / SSH** ওপেন করে রান করুন:
  ```bash
  bash hostinger-hpanel-setup.sh
  ```
  *(এই স্ক্রিপ্টটি স্কিমা সিঙ্ক, অ্যাডমিন সিডিং এবং অ্যাসেট কপি স্বয়ংক্রিয়ভাবে করে নেয়)*

---

## 🐳 পদ্ধতি ৩: Hostinger VPS-এ Docker Compose দিয়ে ডেপ্লয়

যদি আপনি ডকার পছন্দ করেন:
1. প্রজেক্ট ফোল্ডারে `.env` ফাইল প্রস্তুত করুন।
2. চালান:
   ```bash
   docker compose up -d --build
   ```
3. আপনার ReplyX AI কনটেইনার স্বয়ংক্রিয়ভাবে পোর্ট `3000`-এ চালু হয়ে যাবে!

---

## 🔑 ডিফল্ট অ্যাডমিন লগইন ক্রেডেনশিয়ালস

- **লগইন লিংক:** `https://yourdomain.com/login`
- **ইমেইল:** `admin@replyx.ai`
- **পাসওয়ার্ড:** `admin123456`

*(প্রথমবার লগইন করার পর অ্যাডমিন ড্যাশবোর্ড থেকে পাসওয়ার্ড পরিবর্তন করে নিবেন)*

---

## 🛠️ সাধারণ সমস্যার সমাধান (Troubleshooting)

| সমস্যা | কারণ | সমাধান |
|---|---|---|
| **502 Bad Gateway** | Node.js অ্যাপ ব্যাকগ্রাউন্ডে চলছে না | VPS-এ `pm2 logs replyx-ai` দিয়ে এরর দেখুন অথবা `pm2 restart replyx-ai` দিন। |
| **Prisma Connection Error** | `.env` ফাইলে ভুল বা মিসিং DATABASE_URL | `.env` ফাইলে সঠিক PostgreSQL / Supabase কানেকশন স্ট্রিং নিশ্চিত করুন। |
| **CSS / Layout ঠিকমতো আসছে না** | স্ট্যাটিক ফাইল পাথ ক্যাশিং | `server.js` এবং `.htaccess` স্বয়ংক্রিয়ভাবে `/global.css` ও `/_next/static/` ফাইল সার্ভ করে। ব্রাউজার ক্যাশ ক্লিয়ার (Ctrl+F5) করে রিলোড দিন। |
| **Facebook Webhook Not Verifying** | Verify Token অমিল | Meta Developer কনসোলের টোকেন আর `.env` এর `FACEBOOK_WEBHOOK_VERIFY_TOKEN` একই কিনা যাচাই করুন। |
