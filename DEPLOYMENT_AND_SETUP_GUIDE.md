# 📦 ReplyX AI — Buyer Setup & Deployment Guide

> **অভিনন্দন!** ReplyX AI সোর্স কোডটি কেনার জন্য ধন্যবাদ। এটি একটি কমপ্লিট, প্রোডাকশন-রেডি **AI-Powered Facebook Messenger Automation & E-Commerce SaaS** প্ল্যাটফর্ম। এই গাইডে আপনি লোকালহোস্ট, হোস্টিংগার (Hostinger/cPanel), এবং ভিপিএস (VPS)-এ কিভাবে প্রজেক্টটি সেটআপ করবেন তার সম্পূর্ণ নির্দেশিকা পাবেন।

---

## 📑 সূচিপত্র (Table of Contents)
1. [সিস্টেম রিকোয়ারমেন্টস (Prerequisites)](#1-সিস্টেম-রিকোয়ারমেন্টস)
2. [এনভায়রনমেন্ট কনফিগারেশন (.env Setup)](#2-এনভায়রনমেন্ট-কনফিগারেশন)
3. [ডাটাবেজ সেটআপ ও অ্যাডমিন অ্যাকাউন্ট](#3-ডাটাবেজ-সেটআপ-ও-অ্যাডমিন-অ্যাকাউন্ট)
4. [লোকালহোস্টে চালানো (Localhost Running)](#4-লোকালহোস্টে-চালানো)
5. [Hostinger / cPanel এ লাইভ ডেপ্লয়মেন্ট](#5-hostinger--cpanel-এ-লাইভ-ডেপ্লয়মেন্ট)
6. [Facebook Developer App & Webhook ইন্টিগ্রেশন](#6-facebook-developer-app--webhook-ইন্টিগ্রেশন)
7. [AI Provider (Gemini / OpenAI) সেটআপ](#7-ai-provider-সেটআপ)
8. [কুরিয়ার ও লাইসেন্স কি সিস্টেম পরিচালনা](#8-কুরিয়ার-ও-লাইসেন্স-কি-সিস্টেম-পরিচালনা)
9. [রিব্র্যান্ডিং (নাম, লোগো ও কালার পরিবর্তন)](#9-রিব্র্যান্ডিং-নাম-লোগো-ও-কালার-পরিবর্তন)

---

## 1. সিস্টেম রিকোয়ারমেন্টস
- **Node.js**: `v18.17.0` বা এর উপরে (`v20.x` রিকমেন্ডেড)
- **NPM**: `v9.x` বা এর উপরে
- **Database**: PostgreSQL (Supabase, Neon, Cloud SQL) অথবা SQLite (ডিফল্ট ডেভেলপমেন্টের জন্য)
- **Git** (অপশনাল)

---

## 2. এনভায়রনমেন্ট কনফিগারেশন
প্রজেক্টের রুটে থাকা `.env.example` ফাইলটি কপি করে `.env` নামে একটি ফাইল তৈরি করুন:

```bash
cp .env.example .env
```

`.env` ফাইলে নিচের প্রয়োজনীয় মানগুলো দিন:

```env
# ১. ডাটাবেজ URL (Supabase বা PostgreSQL)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# ২. সিকিউরিটি কি (আপনার পছন্দমতো ৩২ অক্ষরের সিক্রেট কি দিন)
JWT_SECRET="your_custom_32_character_jwt_secret_key_here"
ENCRYPTION_KEY="your_custom_32_character_encryption_key!"

# ৩. লাইভ ডোমেইন URL
APP_URL="https://yourdomain.com"

# ৪. ফেসবুক ডেভেলপার অ্যাপ ক্রেডেনশিয়াল
FACEBOOK_APP_ID="your_facebook_app_id"
FACEBOOK_APP_SECRET="your_facebook_app_secret"
FACEBOOK_GRAPH_API_VERSION="v20.0"
FACEBOOK_WEBHOOK_VERIFY_TOKEN="replyx_secure_verify_token_2026"

# ৫. গ্লোবাল AI API Keys (ঐচ্ছিক — ইউজাররা নিজস্ব কি ড্যাশবোর্ডে দিতে পারবে)
GEMINI_API_KEY="AIzaSy..."
OPENAI_API_KEY="sk-proj-..."
```

---

## 3. ডাটাবেজ সেটআপ ও অ্যাডমিন অ্যাকাউন্ট
ডাটাবেজে টেবিল তৈরি এবং ডিফল্ট প্যাকেজ ও অ্যাডমিন অ্যাকাউন্ট তৈরি করতে নিচের কমান্ডগুলো চালান:

```bash
# ১. ডিপেন্ডেন্সি ইন্সটল করুন
npm install

# ২. ডাটাবেজ স্কিমা পুশ করুন
npm run prisma:push

# ৩. সুপার অ্যাডমিন ও প্যাকেজ ডাটা সিড করুন
npm run seed
```

### 🔑 ডিফল্ট অ্যাডমিন লগইন ক্রেডেনশিয়াল:
- **লগইন URL**: `https://yourdomain.com/login` বা `http://localhost:3000/login`
- **ইমেইল**: `admin@replyx.ai`
- **পাসওয়ার্ড**: `admin123456`
*(লগইন করার পর অবশ্যই ড্যাশবোর্ড বা সেটিংস থেকে পাসওয়ার্ড পরিবর্তন করে নিন)*

---

## 4. লোকালহোস্টে চালানো
উইন্ডোজে ১-ক্লিকে চালাতে:
- সরাসরি `run-dev.bat` ফাইলে ডাবল ক্লিক করুন।

ম্যানুয়ালি টার্মিনাল দিয়ে চালাতে:
```bash
npm run dev
```
ব্রাউজারে যান: `http://localhost:3000`

---

## 5. Hostinger / cPanel এ লাইভ ডেপ্লয়মেন্ট
প্রজেক্টটিতে রয়েছে ডেডিকেটেড `server.js` যা Hostinger Cloud Linux / Phusion Passenger ও LiteSpeed-এর সাথে ১০০% অপ্টিমাইজড।

### ধাপ ১: বিল্ড তৈরি
লোকালে বা সার্ভারে বিল্ড রান করুন:
```bash
npm run build
```

### ধাপ ২: Hostinger hPanel-এ সেটআপ
1. Hostinger hPanel থেকে **Node.js** সেকশনে যান।
2. **Node.js Version**: `20.x` সিলেক্ট করুন।
3. **Application Root**: আপনার ডোমেনের ফোল্ডার পাথ দিন (যেমন: `/home/u123456/domains/yourdomain.com/public_html`)।
4. **Application Startup File**: `server.js` দিন।
5. **Environment Variables**: `.env` এর ভ্যালুগুলো সেখানে পেস্ট করুন।
6. **NPM Install** ও **Restart** দিন।
*(বিস্তারিত তথ্যের জন্য প্রজেক্টের `HOSTINGER_DEPLOYMENT.md` ফাইলটি দেখুন)*

---

## 6. Facebook Developer App & Webhook ইন্টিগ্রেশন
ক্লায়েন্টদের ফেসবুক পেজে AI অটো-রিপ্লাই কাজ করাতে:

1. [developers.facebook.com](https://developers.facebook.com)-এ গিয়ে একটি Business App তৈরি করুন।
2. **Messenger API** প্রোডাক্ট যুক্ত করুন।
3. **Webhooks Setup**:
   - **Callback URL**: `https://yourdomain.com/api/webhooks/facebook`
   - **Verify Token**: আপনার `.env`-এর `FACEBOOK_WEBHOOK_VERIFY_TOKEN` (যেমন: `replyx_secure_verify_token_2026`)
   - **Subscription Fields**: `messages`, `messaging_postbacks`, `message_deliveries` চেকমার্ক দিন।
4. আপনার অ্যাপের App ID ও App Secret এনে অ্যাডমিন সেটিংস অথবা `.env`-এ সেভ করুন।

---

## 7. AI Provider সেটআপ
ReplyX AI মাল্টিপল এআই ইঞ্জিন সাপোর্ট করে:
- **Google Gemini**: Gemini 1.5 Flash ও Pro (অত্যন্ত দ্রুত এবং সাশ্রয়ী, ইমেজ ও ভয়েস বুঝতে সক্ষম)। [aistudio.google.com](https://aistudio.google.com) থেকে ফ্রি API কি পাবেন।
- **OpenAI**: GPT-4o, GPT-4o-mini। [platform.openai.com](https://platform.openai.com) থেকে কি পাবেন।

**অ্যাডমিন গ্লোবাল কি দিতে পারবে অথবা প্রতিটি ইউজার ড্যাশবোর্ড থেকে তাদের নিজস্ব কি বসাতে পারবে।**

---

## 8. কুরিয়ার ও লাইসেন্স কি সিস্টেম পরিচালনা

### ক. লাইসেন্স কি তৈরি ও ক্লায়েন্টকে বিক্রি:
1. সুপার অ্যাডমিন হিসেবে `/admin/licenses`-এ যান।
2. **"নতুন কি জেনারেট"** বাটনে ক্লিক করুন।
3. প্যাকেজ (Starter / Business / Pro), মেয়াদ (যেমন ৩০ দিন), মেসেজ লিমিট নির্ধারণ করে জেনারেট করুন।
4. তৈরি হওয়া কি (যেমন: `RPLX-BIZ-8942-1204`) ক্লায়েন্টকে দিন।
5. ক্লায়েন্ট `yourdomain.com/activate` লিংকে গিয়ে কি দিলেই সাথে সাথে তার সাবস্ক্রিপশন ও AI সক্রিয় হয়ে যাবে।

### খ. কুরিয়ার ইন্টিগ্রেশন (Steadfast & Pathao):
- ড্যাশবোর্ডের **কুরিয়ার সেটিংস** থেকে Steadfast API Key এবং Secret Key দিলেই AI মেসেঞ্জারে সংগৃহীত অর্ডারগুলো ১-ক্লিকে কুরিয়ারে বুকিং করতে পারবে।

---

## 9. রিব্র্যান্ডিং (নাম, লোগো ও কালার পরিবর্তন)
আপনি যদি নিজের নামে বা কোম্পানির নামে সফটওয়্যারটি বিক্রি করতে চান:

1. **ব্র্যান্ড নেম**: `package.json` এবং `components/common/Logo.tsx`-এ গিয়ে **ReplyX AI** এর জায়গায় আপনার নাম দিন।
2. **লোগো ও ফেভিকন**: `public/` ফোল্ডারের লোগো ইমেজ ও আইকন পরিবর্তন করুন।
3. **প্রাইমারি কালার**: `tailwind.config.js` এবং `global.css`-এ ব্র্যান্ড কালার পরিবর্তন করতে পারেন।

---

## 📞 সাপোর্ট ও টেকনিক্যাল সহায়তা
কোনো জটিলতা বা অতিরিক্ত ফিচারের জন্য কোডবেজের `README.md` ফাইলটি দেখুন।
Happy Building & Selling! 🚀
