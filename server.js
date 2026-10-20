/**
 * ReplyX AI — Ultra-Resilient Production Server for Hostinger & VPS
 * ------------------------------------------------------------------
 * 100% Fix for Site Load & Layout on Hostinger (Phusion Passenger / LiteSpeed / Node):
 *  1. Native Phusion Passenger socket ('passenger') + Dynamic Unix Socket + TCP PORT support
 *  2. Direct High-Speed Static Delivery for /_next/static/ with exact MIME types
 *  3. Direct Delivery for /global.css and /public/ assets
 *  4. Automatic _next/static disk mirroring for LiteSpeed Web Server
 *  5. Absolute SQLite database path and fallback env vars
 *  6. Process crash shields and non-blocking background initialization
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

// 1. Phusion Passenger Hook (CloudLinux / Hostinger cPanel / hPanel)
if (typeof PhusionPassenger !== 'undefined') {
  try {
    PhusionPassenger.configure({ autoInstall: false });
  } catch (_) {}
}

// 2. Force current working directory to application root
try {
  process.chdir(__dirname);
} catch (e) {
  console.warn('[Server] Could not change directory to __dirname:', e);
}

// 3. Pre-parse .env file immediately
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (key === 'DATABASE_URL' || key === 'DIRECT_URL') {
            if (!process.env[key] || process.env[key]?.startsWith('file:')) {
              process.env[key] = val;
            }
          } else if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
    });
  } catch (_) {}
}

// 4. Force production mode and safe fallback environment variables
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const prismaDbPath = path.resolve(__dirname, 'prisma', 'dev.db');
if (!process.env.DATABASE_URL) {
  try {
    const schemaContent = fs.readFileSync(path.resolve(__dirname, 'prisma', 'schema.prisma'), 'utf8');
    if (schemaContent.includes('provider = "sqlite"') || schemaContent.includes('provider  = "sqlite"')) {
      process.env.DATABASE_URL = `file:${prismaDbPath}`;
    }
  } catch (_) {}
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'replyx_ai_super_secret_jwt_key_2026_bd_secure';
}
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = 'replyx_32_bytes_secret_key_2026!';
}

// 5. Ensure prisma directory exists with write permissions for SQLite
const prismaDir = path.resolve(__dirname, 'prisma');
if (!fs.existsSync(prismaDir)) {
  try {
    fs.mkdirSync(prismaDir, { recursive: true, mode: 0o777 });
  } catch (_) {}
}
if (fs.existsSync(prismaDbPath)) {
  try {
    fs.chmodSync(prismaDbPath, 0o666);
  } catch (_) {}
}

// 6. Ensure _next directory mirror exists on disk for LiteSpeed Web Server
function ensureStaticMirror() {
  try {
    const nextStatic = path.join(__dirname, '.next', 'static');
    const underscoreNext = path.join(__dirname, '_next');
    const underscoreNextStatic = path.join(underscoreNext, 'static');
    if (fs.existsSync(nextStatic)) {
      if (!fs.existsSync(underscoreNext)) {
        fs.mkdirSync(underscoreNext, { recursive: true });
      }
      if (fs.cpSync) {
        fs.cpSync(nextStatic, underscoreNextStatic, { recursive: true, force: true, dereference: true });
      }
    }
  } catch (err) {
    // Non-blocking warning
  }
}
ensureStaticMirror();

// 7. Global Process Crash Guards
process.on('uncaughtException', (err) => {
  console.error('[ReplyX Server Guard] Uncaught Exception caught safely:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.warn('[ReplyX Server Guard] Unhandled Rejection caught safely at:', promise, 'reason:', reason);
});

// Exact MIME Types to prevent browser MIME-type checking errors
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json',
};

function serveStaticFile(filePath, res, customCache) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', customCache || 'public, max-age=31536000, immutable');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Accept-Encoding');
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
  stream.pipe(res);
}

// 8. Initialize Next.js in Production Mode
const app = next({
  dev: false,
  dir: __dirname,
  conf: {
    compress: true,
    poweredByHeader: false,
  },
});
const handle = app.getRequestHandler();

// Track Next.js readiness
let isReady = false;
const preparePromise = app
  .prepare()
  .then(() => {
    isReady = true;
    console.log(`> [ReplyX AI] Next.js engine prepared and ready for traffic (Mode: ${process.env.NODE_ENV}).`);
  })
  .catch((err) => {
    console.error('[Server Error] Next.js preparation error:', err);
  });

// 9. Create HTTP Server that serves static CSS/JS instantly and forwards pages to Next.js
const server = createServer(async (req, res) => {
  try {
    const parsedUrl = parse(req.url, true);
    const pathname = parsedUrl.pathname || '';

    // Handle OPTIONS preflight requests for static assets and API
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.statusCode = 204;
      return res.end();
    }

    // A. INSTANT STATIC DELIVERY FOR /global.css (Revalidates on new build so layout never breaks)
    if (pathname === '/global.css') {
      const candidates = [
        path.join(__dirname, 'public', 'global.css'),
        path.join(__dirname, 'global.css'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p) && !fs.statSync(p).isDirectory()) {
          return serveStaticFile(p, res, 'public, max-age=0, must-revalidate');
        }
      }
    }

    // B. INSTANT STATIC DELIVERY FOR /_next/static/ (Fixes broken styles & 404s completely)
    if (pathname.startsWith('/_next/static/')) {
      const relPath = pathname.slice('/_next/static/'.length);
      const candidates = [
        path.normalize(path.join(__dirname, '.next', 'static', relPath)),
        path.normalize(path.join(__dirname, '_next', 'static', relPath)),
      ];
      for (const fullPath of candidates) {
        if (
          (fullPath.startsWith(path.join(__dirname, '.next', 'static')) ||
           fullPath.startsWith(path.join(__dirname, '_next', 'static'))) &&
          fs.existsSync(fullPath) &&
          !fs.statSync(fullPath).isDirectory()
        ) {
          return serveStaticFile(fullPath, res, 'public, max-age=31536000, immutable');
        }
      }
    }

    // C. INSTANT STATIC DELIVERY FOR /public/ assets (favicon, icons, images, robots)
    if (pathname.length > 1 && !pathname.startsWith('/api/')) {
      const publicFilePath = path.normalize(path.join(__dirname, 'public', pathname));
      if (
        publicFilePath.startsWith(path.join(__dirname, 'public')) &&
        fs.existsSync(publicFilePath) &&
        !fs.statSync(publicFilePath).isDirectory()
      ) {
        return serveStaticFile(publicFilePath, res, 'public, max-age=86400, must-revalidate');
      }
    }

    // C2. ROUTE ALIASES: Direct friendly URLs redirect to canonical dashboard routes
    const routeAliases = {
      '/automation': '/dashboard/ai-rules',
      '/customers': '/dashboard/conversations',
      '/messages': '/dashboard/conversations',
      '/analytics': '/dashboard/reports',
      '/settings': '/dashboard/settings',
      '/profile': '/dashboard/settings',
    };
    if (routeAliases[pathname]) {
      res.statusCode = 307;
      res.setHeader('Location', routeAliases[pathname]);
      return res.end();
    }

    // D. DYNAMIC PAGES & API ROUTES: Await engine if still preparing
    if (!isReady) {
      await preparePromise;
    }
    await handle(req, res, parsedUrl);
  } catch (err) {
    console.error('[Server Error] Request handler error for', req.url, ':', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><title>Loading ReplyX AI...</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
          <body style="font-family: system-ui, sans-serif; padding: 2rem; text-align: center; background: #f8fafc; color: #1e293b;">
            <div style="max-width: 500px; margin: 3rem auto; background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              <h2 style="font-size: 1.3rem; font-weight: 700; color: #4f46e5; margin-bottom: 0.5rem;">ReplyX AI প্রস্তুত হচ্ছে...</h2>
              <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 1.5rem;">সার্ভারটি চালু হচ্ছে। কয়েক সেকেন্ড পর পেজটি স্বয়ংক্রিয়ভাবে রিফ্রেশ হবে।</p>
              <button onclick="window.location.reload()" style="background: #4f46e5; color: white; border: none; padding: 0.6rem 1.25rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer;">পেজ রিফ্রেশ করুন</button>
            </div>
            <script>setTimeout(function(){ window.location.reload(); }, 3000);</script>
          </body>
        </html>
      `);
    }
  }
});

// 10. Determine Port / Socket and Listen Immediately
const rawPort = process.env.PORT;
let listenTarget;

if (typeof PhusionPassenger !== 'undefined' || rawPort === 'passenger') {
  listenTarget = 'passenger';
} else if (rawPort && !isNaN(Number(rawPort))) {
  listenTarget = Number(rawPort);
} else if (rawPort && typeof rawPort === 'string' && rawPort.trim().length > 0) {
  listenTarget = rawPort.trim();
} else {
  listenTarget = 3000;
}

if (typeof listenTarget === 'number') {
  server.listen(listenTarget, '0.0.0.0', () => {
    console.log(`> [ReplyX AI] Production server listening on http://0.0.0.0:${listenTarget}`);
    console.log(`> Environment: ${process.env.NODE_ENV}`);
    triggerWarmup(listenTarget);
  });
} else {
  server.listen(listenTarget, () => {
    console.log(`> [ReplyX AI] Production server listening on target: ${listenTarget}`);
    console.log(`> Environment: ${process.env.NODE_ENV}`);
    triggerWarmup(listenTarget);
  });
}

// 11. Graceful Shutdown Handlers
const shutdown = (signal) => {
  console.log(`[Server] Received ${signal}. Closing HTTP server...`);
  server.close(() => {
    console.log('[Server] HTTP server closed cleanly. Exiting.');
    process.exit(0);
  });
  setTimeout(() => {
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 * Ensures _next directory exists on disk so LiteSpeed Web Server can find static assets directly
 */
function ensureStaticMirror() {
  try {
    const srcDir = path.join(__dirname, '.next', 'static');
    const targetDir = path.join(__dirname, '_next', 'static');
    if (fs.existsSync(srcDir)) {
      const parentDir = path.join(__dirname, '_next');
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      try {
        const stat = fs.lstatSync(targetDir);
        if (stat.isSymbolicLink()) {
          fs.unlinkSync(targetDir);
        }
      } catch (_) {}
      copyDirSync(srcDir, targetDir);
    }
  } catch (_) {}
}

function copyDirSync(src, dest) {
  try {
    if (fs.cpSync) {
      fs.cpSync(src, dest, { recursive: true, force: true, dereference: true });
      return;
    }
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  } catch (_) {}
}

/**
 * Background warmup: triggers /api/health to self-heal database tables
 */
function triggerWarmup(target) {
  setTimeout(() => {
    try {
      if (typeof target === 'number') {
        const http = require('http');
        const req = http.get(`http://127.0.0.1:${target}/api/health`, (res) => {
          console.log(`> [Warmup] Pre-flight database check status: ${res.statusCode}`);
        });
        req.on('error', () => {});
        req.setTimeout(5000, () => req.destroy());
      }
    } catch (_) {}
  }, 1200);
}
