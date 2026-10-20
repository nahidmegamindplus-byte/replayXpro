import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

import os from 'os';

function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL;

  // If a remote database URL is configured (PostgreSQL, MySQL, Turso/LibSQL, etc.), use it directly
  if (envUrl && !envUrl.startsWith('file:') && !envUrl.startsWith('./') && !envUrl.includes('dev.db')) {
    return envUrl;
  }

  // Detect genuine serverless environment (Vercel, Netlify, AWS Lambda)
  // NEVER treat standard servers (Windows/Linux/Docker/PM2) as serverless simply due to NODE_ENV === 'production'
  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.NETLIFY) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.LAMBDA_TASK_ROOT);

  if (isServerless) {
    try {
      const tmpDir = os.tmpdir() || '/tmp';
      const tmpDbPath = path.join(tmpDir, 'replyx_dev.db');

      if (!fs.existsSync(tmpDbPath)) {
        // Look for source seed db in package bundle
        const sourcePaths = [
          path.resolve(process.cwd(), 'prisma', 'dev.db'),
          path.resolve(process.cwd(), 'dev.db'),
          path.join(__dirname, '..', '..', 'prisma', 'dev.db'),
          path.join(__dirname, '..', 'prisma', 'dev.db'),
        ];

        let copied = false;
        for (const src of sourcePaths) {
          if (fs.existsSync(src)) {
            try {
              fs.copyFileSync(src, tmpDbPath);
              fs.chmodSync(tmpDbPath, 0o666);
              copied = true;
              break;
            } catch (err) {
              console.warn('Failed to copy seed db to serverless temp directory:', err);
            }
          }
        }

        if (!copied) {
          // Create empty file in temp so SQLite can open and write schema
          fs.writeFileSync(tmpDbPath, '');
          fs.chmodSync(tmpDbPath, 0o666);
        }
      }

      return `file:${tmpDbPath}?connection_limit=1&busy_timeout=30000`;
    } catch (e) {
      console.warn('Serverless temp db setup fallback:', e);
    }
  }

  // Local / standard server environment (Windows, Linux VPS, Hostinger, Docker)
  function findProjectRoot(): string {
    // 1. Check process.cwd()
    if (fs.existsSync(path.join(process.cwd(), 'prisma'))) {
      return process.cwd();
    }
    // 2. Check __dirname and parent hierarchy
    let currentDir = __dirname;
    for (let i = 0; i < 5; i++) {
      if (fs.existsSync(path.join(currentDir, 'prisma'))) {
        return currentDir;
      }
      const parent = path.dirname(currentDir);
      if (parent === currentDir) break;
      currentDir = parent;
    }
    return process.cwd();
  }

  const rootDir = findProjectRoot();
  const localPrismaDir = path.resolve(rootDir, 'prisma');
  if (!fs.existsSync(localPrismaDir)) {
    try {
      fs.mkdirSync(localPrismaDir, { recursive: true, mode: 0o777 });
    } catch (e) {}
  }
  const localDb = path.resolve(localPrismaDir, 'dev.db');
  if (fs.existsSync(localDb)) {
    try {
      fs.chmodSync(localDb, 0o666);
    } catch (_) {}
  }
  return `file:${localDb}?connection_limit=1&busy_timeout=30000`;
}

const dbUrl = getDatabaseUrl();
process.env.DATABASE_URL = dbUrl;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Always retain PrismaClient singleton on globalThis across all environments (including production)
// to prevent multiple PrismaClient instances opening competing SQLite file descriptors/locks
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

// Global server process crash protection
// Prevents unhandled background async errors or webhook socket drops from terminating the server process
if (typeof process !== 'undefined') {
  if (!(globalThis as any).__replyx_guards_installed) {
    (globalThis as any).__replyx_guards_installed = true;
    process.on('unhandledRejection', (reason) => {
      console.warn('[Server Guard] Handled unhandledRejection safely:', reason);
    });
    process.on('uncaughtException', (err) => {
      console.error('[Server Guard] Handled uncaughtException safely:', err);
    });
  }
}

export default prisma;
