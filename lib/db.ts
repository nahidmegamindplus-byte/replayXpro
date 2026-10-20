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

function getDatabaseUrl(): string {
  loadEnvFromDisk();
  const envUrl = process.env.DATABASE_URL;

  // 1. If a PostgreSQL URL is configured, use it directly
  if (envUrl && (envUrl.startsWith('postgresql://') || envUrl.startsWith('postgres://'))) {
    return envUrl;
  }

  // 2. Check DIRECT_URL fallback for Supabase/PostgreSQL
  const directUrl = process.env.DIRECT_URL;
  if (directUrl && (directUrl.startsWith('postgresql://') || directUrl.startsWith('postgres://'))) {
    return directUrl;
  }

  // 3. If another remote database URL (e.g. mysql, libsql)
  if (envUrl && !envUrl.startsWith('file:') && !envUrl.startsWith('./') && !envUrl.includes('dev.db')) {
    return envUrl;
  }

  // 4. Check if schema.prisma expects postgresql
  try {
    const schemaPath = path.resolve(process.cwd(), 'prisma', 'schema.prisma');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      if (schema.includes('provider = "postgresql"') || schema.includes('provider  = "postgresql"')) {
        // Must never return file: for postgresql schema
        return envUrl || '';
      }
    }
  } catch (_) {}

  // 5. Fallback for SQLite only if explicitly using SQLite schema
  function findProjectRoot(): string {
    if (fs.existsSync(path.join(process.cwd(), 'prisma'))) {
      return process.cwd();
    }
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
  const localDb = path.resolve(localPrismaDir, 'dev.db');
  return `file:${localDb}?connection_limit=1&busy_timeout=30000`;
}

const dbUrl = getDatabaseUrl();
if (dbUrl && !dbUrl.startsWith('file:')) {
  process.env.DATABASE_URL = dbUrl;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))
      ? { datasources: { db: { url: dbUrl } } }
      : {}),
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
