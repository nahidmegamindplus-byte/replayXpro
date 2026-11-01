#!/usr/bin/env node
/**
 * ReplyX AI — Ultra-Reliable Single-Threaded Build Runner for Hostinger & Cloud
 * ----------------------------------------------------------------------------
 * Prevents Hostinger container resource crash:
 * "OS can't spawn worker thread: Resource temporarily unavailable (os error 11)"
 */

const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. Enforce strict single-threaded execution for Tokio and Node.js
process.env.NEXT_PRIVATE_BUILD_WORKER = '0';
process.env.UV_THREADPOOL_SIZE = '1';
process.env.TOKIO_WORKER_THREADS = '1';
process.env.NEXT_TELEMETRY_DISABLED = '1';

const buildEnv = {
  ...process.env,
  NEXT_PRIVATE_BUILD_WORKER: '0',
  UV_THREADPOOL_SIZE: '1',
  TOKIO_WORKER_THREADS: '1',
  NEXT_TELEMETRY_DISABLED: '1',
  NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --max-old-space-size=2048`.trim(),
};

// 2. Ensure .env exists with production credentials
try {
  require('./ensure-env.js');
} catch (e) {
  console.warn('[Build Warning] ensure-env notice:', e.message);
}

// 3. Generate Prisma client
console.log('\n> [Build 1/3] Generating Prisma client...');
try {
  execSync('npx prisma generate', {
    cwd: rootDir,
    stdio: 'inherit',
    env: buildEnv,
  });
} catch (err) {
  console.error('[Build Error] Prisma generate failed:', err.message);
  process.exit(1);
}

// 4. Build Next.js
console.log('\n> [Build 2/3] Building Next.js application (Single-Thread Mode)...');
try {
  execSync('npx next build', {
    cwd: rootDir,
    stdio: 'inherit',
    env: buildEnv,
  });
} catch (err) {
  console.error('[Build Error] Next.js build failed:', err.message);
  process.exit(1);
}

// 5. Static Assets Sync
console.log('\n> [Build 3/3] Synchronizing static assets...');
try {
  require('./copy-assets.js');
} catch (e) {
  console.warn('[Build Warning] copy-assets notice:', e.message);
}

console.log('\n✨ [ReplyX AI] Production build completed successfully!\n');

