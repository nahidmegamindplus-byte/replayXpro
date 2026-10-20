import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Force load .env from disk if process.env.DATABASE_URL is not set or starts with file:
function loadEnvFromDisk(): void {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(__dirname, '..', '.env'),
    path.resolve(__dirname, '.env'),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx !== -1) {
              const key = trimmed.slice(0, eqIdx).trim();
              let val = trimmed.slice(eqIdx + 1).trim();
              if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
              }
              // If DATABASE_URL or DIRECT_URL in process.env is missing or starts with file:, override with .env value
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
  }
}

// Ensure env is loaded from disk immediately
loadEnvFromDisk();

const DEFAULT_SUPABASE_DATABASE_URL =
  'postgresql://postgres.toucabgdgfrkpohwkzki:Nm%40102060%40nm@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const DEFAULT_SUPABASE_DIRECT_URL =
  'postgresql://postgres.toucabgdgfrkpohwkzki:Nm%40102060%40nm@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

function getDatabaseUrl(): string {
  loadEnvFromDisk();
  let envUrl = process.env.DATABASE_URL;

  // 1. If a PostgreSQL URL is configured, use it directly
  if (envUrl && (envUrl.startsWith('postgresql://') || envUrl.startsWith('postgres://'))) {
    return envUrl;
  }

  // 2. Check DIRECT_URL fallback for Supabase/PostgreSQL
  const directUrl = process.env.DIRECT_URL;
  if (directUrl && (directUrl.startsWith('postgresql://') || directUrl.startsWith('postgres://'))) {
    return directUrl;
  }

  // 3. Fallback to Supabase project URL
  return DEFAULT_SUPABASE_DATABASE_URL;
}

const dbUrl = getDatabaseUrl();
process.env.DATABASE_URL = dbUrl;
if (!process.env.DIRECT_URL || !process.env.DIRECT_URL.startsWith('postgres')) {
  process.env.DIRECT_URL = DEFAULT_SUPABASE_DIRECT_URL;
}

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

// Retain PrismaClient singleton on globalThis
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

// Global server process crash protection
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
