# ReplyX AI — AI-Powered Facebook Messenger Automation SaaS

> **আপনার Messenger-এর জন্য স্মার্ট AI Assistant**  
> Complete, production-ready, self-hosted AI SaaS platform designed for Bangladeshi e-commerce businesses to automate customer interactions, inquiries, product recommendations, and order captures on Facebook Messenger in Bangla, English, and Banglish.

---

## 🌟 Features Overview

- 🇧🇩 **Bangla-First Multi-Language AI**: Understands natural Bangla (বাংলা), English, and Banglish (e.g., *"vai eitar dam koto?"*, *"COD hobe?"*).
- 💬 **24/7 Automated Messenger Replies**: Connects directly to Facebook Messenger via official Graph API (`v20.0`) and secure Webhooks.
- 📦 **Live Product Knowledge & Image Delivery**: Synchronizes with your inventory database and automatically sends product details, prices, and high-res images.
- 👁️ **Customer Image & Vision AI**: Vision-capable AI models (Gemini 1.5 Flash / GPT-4o) analyze customer sent images to match product catalog.
- 🎙️ **Voice Message Support**: Transcribes incoming customer audio/voice notes and replies intelligently.
- 🛒 **Automated Order Capture Engine**: Detects customer purchase intent and automatically collects Customer Name, Phone Number, Delivery Address, Product, and Quantity into structured orders.
- ⏸️ **1-Click Human Handoff**: Pause AI instantly on any conversation when a human agent takes over.
- 📑 **Multi-Page Management**: Connect and manage multiple Facebook Pages with independent tokens, AI instructions, products, and analytics.
- 📊 **Real Database Analytics**: Daily message volume, AI reply metrics, order pipeline, and conversion rates without fake statistics.
- 🛡️ **Enterprise Security**:
  - `AES-256-GCM` encryption at rest for Facebook Page Access Tokens and AI API Keys.
  - `X-Hub-Signature-256` HMAC-SHA256 signature verification on Webhooks.
  - Complete tenant data isolation at API and database layers.
  - Prompt injection defense preventing hallucination of prices, stock, or secret leakage.
- 👑 **Role-Based Admin Panel**: System health metrics, user account management (Enable/Disable/Delete), page monitoring, and a **1-Click Demo Data Generator**.

---

## 🏗️ Technology Architecture

- **Frontend**: Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Next.js Server Endpoints, Edge-ready architecture.
- **Database & ORM**: Prisma ORM with **SQLite** (default zero-configuration for immediate self-hosting) and full **PostgreSQL** compatibility (Supabase / Neon / Cloud SQL).
- **AI Providers**: Google Gemini (via `@google/generative-ai`) and OpenAI (via `openai`).
- **Security**: AES-256-GCM crypto, Bcrypt password hashing, JWT HTTP-only authentication cookies.

---

## 🚀 Quick Start & Installation

### 1. Windows 1-Click Launch (Recommended)
1. **Initialize Database** (First time only):
   Double-click `setup-db.bat` or run:
   ```cmd
   setup-db.bat
   ```
2. **Start Local Development Server**:
   Double-click `run-dev.bat` or run:
   ```cmd
   run-dev.bat
   ```
   *The launcher automatically detects Node.js, cleans up port 3000 conflicts, verifies database integrity, and opens http://localhost:3000 in your browser.*

---

### 2. Manual CLI Installation
```bash
# 1. Install dependencies
npm install

# 2. Setup SQLite Database & Seed Admin
npm run prisma:push
npm run seed

# 3. Start Development Server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Default Credentials & Access

- **Super Admin Account**:
  - URL: `http://localhost:3000/login`
  - Email: `admin@replyx.ai`
  - Password: `admin123456`
  - Admin Panel: `http://localhost:3000/admin`

- **Payment Methods Preconfigured**:
  - bKash, Nagad, Rocket, Upay (Managed in Admin Panel -> `/admin/payment-methods`)

---

## 🌐 Live Server Deployment Options

### Option A: Netlify Deployment (Serverless)
ReplyX AI is pre-configured for deployment on **Netlify** using `@netlify/plugin-nextjs` and `netlify.toml`.

1. Push your code to GitHub / GitLab / Bitbucket.
2. In **Netlify**, click **Add new site** -> **Import an existing project**.
3. Set:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
4. In **Netlify -> Site configuration -> Environment variables**, add:
   - `DATABASE_URL`: PostgreSQL connection string (from Neon, Supabase, Railway, etc.)
   - `JWT_SECRET`: Random 32+ character string
   - `ENCRYPTION_KEY`: Exact 32 character key
   - `APP_URL`: `https://your-site.netlify.app`
   - `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_WEBHOOK_VERIFY_TOKEN`
5. Deploy Site!

---

### Option B: Vercel Deployment (Serverless)
1. Import repository on [Vercel](https://vercel.com).
2. Configure Environment Variables in Project Settings.
3. Deploy!

---

### Option C: Linux VPS Deployment (Ubuntu / Debian with PM2)
For dedicated VPS hosting (DigitalOcean, AWS, Linode, Hetzner, Vultr):

```bash
# 1. Clone repo & install dependencies
git clone <your-repo-url> /var/www/replyx
cd /var/www/replyx
npm install

# 2. Setup environment variables
cp .env.example .env
nano .env

# 3. Setup Database
npx prisma db push
node scripts/seed.js

# 4. Build for production
npm run build

# 5. Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

### Option D: Docker & Docker Compose
```bash
docker compose up -d --build
```
ReplyX AI will start running on port 3000 inside Docker.

---

## 📖 Facebook Messenger Setup Guide

1. Go to [developers.facebook.com](https://developers.facebook.com) and create a **Business App**.
2. Add the **Messenger** product to your app.
3. Under **Page Access Tokens**, select your Facebook Page and generate a Token with `pages_messaging`, `pages_manage_metadata`, and `pages_read_engagement` permissions.
4. In ReplyX AI, navigate to **Pages (পেজ সমূহ)** -> Click **নতুন Page সংযুক্ত করুন**, enter your Page Name, Page ID, and Token.
5. Copy the generated **Webhook Callback URL** and **Verify Token** into Facebook's Webhooks configuration.
6. Subscribe to `messages`, `messaging_postbacks`, and `message_reads` events.
7. Click **কানেকশন টেস্ট** on your page card to verify live connectivity!

## 🌐 Localhost Facebook Testing with Tunnels

Facebook requires an HTTPS URL to send webhook events. For local testing:
1. Start an HTTPS tunnel pointing to port 3000:
   ```bash
   # Using Cloudflare Tunnel:
   cloudflared tunnel --url http://localhost:3000

   # Or using ngrok:
   ngrok http 3000
   ```
2. Set `WEBHOOK_BASE_URL` in `.env.local`:
   ```env
   WEBHOOK_BASE_URL="https://your-tunnel-subdomain.ngrok-free.app"
   ```
3. Restart `npm run dev`. The Pages screen will automatically generate webhook URLs using the tunnel address.

---

## 🛡️ Security Best Practices

- **Never expose secrets**: Access Tokens, App Secrets, and AI API keys are stored encrypted (`AES-256-GCM`) and masked in all UI responses.
- **Webhook Signature**: If `FACEBOOK_APP_SECRET` is set, all webhook calls validate `X-Hub-Signature-256` using HMAC-SHA256.
- **Deduplication**: In-memory event tracking prevents duplicate replies during Facebook webhook retries.
- **Strict Role Verification**: Protected endpoints enforce server-side authentication (`requireAuth`) and admin authorization (`requireAdmin`).

---

## 📦 Build Commands

- **Localhost Development**:
  ```bash
  npm run dev
  ```
- **Production Build (Netlify / Server)**:
  ```bash
  npm run build
  ```
- **Production Start**:
  ```bash
  npm run start
  ```

---

## 📄 License
MIT © ReplyX AI
