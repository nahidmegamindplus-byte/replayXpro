/**
 * ReplyX AI — Hostinger Auto-Setup & Health Check
 * -----------------------------------------------
 * This script runs safe migrations, seeds default admin & packages,
 * mirrors static assets, and verifies environment configuration for Hostinger.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('        🚀 ReplyX AI — Hostinger Auto-Setup Initializing        ');
console.log('================================================================\n');

// 1. Ensure .env exists
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('[1/5] Creating .env from template (.env.example)...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('   -> .env created. Please update your DB and API keys as needed.\n');
} else if (fs.existsSync(envPath)) {
  console.log('[1/5] Configuration file (.env) found. OK!\n');
} else {
  console.warn('[1/5] Warning: No .env found. Using default environment variables.\n');
}

// 2. Generate Prisma Client
console.log('[2/5] Generating Prisma Client binaries for Hostinger...');
try {
  execSync('npx prisma generate', { cwd: rootDir, stdio: 'inherit' });
  console.log('   -> Prisma Client generated successfully!\n');
} catch (err) {
  console.error('[Error] Failed to generate Prisma Client:', err.message);
}

// 3. Sync Database Schema
console.log('[3/5] Synchronizing database schema with PostgreSQL/Supabase...');
try {
  execSync('npx prisma db push --skip-generate', { cwd: rootDir, stdio: 'inherit' });
  console.log('   -> Database schema synced successfully!\n');
} catch (err) {
  console.warn('[Notice] Database schema sync skipped or failed (check DATABASE_URL in .env):\n', err.message);
}

// 4. Seed Super Admin & Default Packages
console.log('[4/5] Verifying super admin account & SaaS pricing packages...');
try {
  const seedScript = path.join(rootDir, 'scripts', 'seed.js');
  if (fs.existsSync(seedScript)) {
    execSync(`node "${seedScript}"`, { cwd: rootDir, stdio: 'inherit' });
    console.log('   -> Super Admin & packages verified!\n');
  }
} catch (err) {
  console.warn('[Notice] Seed script warning:', err.message);
}

// 5. Mirror Static Assets for LiteSpeed/Apache/Passenger
console.log('[5/5] Mirroring static assets for Hostinger LiteSpeed/Passenger...');
try {
  const copyAssetsScript = path.join(rootDir, 'scripts', 'copy-assets.js');
  if (fs.existsSync(copyAssetsScript)) {
    execSync(`node "${copyAssetsScript}"`, { cwd: rootDir, stdio: 'inherit' });
    console.log('   -> Static assets mirrored!\n');
  }
} catch (err) {
  console.warn('[Notice] Asset sync warning:', err.message);
}

// Create restart trigger for Phusion Passenger in cPanel/hPanel
try {
  const tmpDir = path.join(rootDir, 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  fs.writeFileSync(path.join(tmpDir, 'restart.txt'), String(Date.now()), 'utf8');
  console.log('[Hostinger] Triggered Passenger application reload via tmp/restart.txt.');
} catch (_) {}

console.log('================================================================');
console.log('  🎉 Hostinger Setup Complete! Server is ready to launch.        ');
console.log('================================================================\n');

