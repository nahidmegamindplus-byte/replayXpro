import prisma from './db';

// List of sensitive keys to redact from logs and metadata
const REDACT_KEYS = [
  'password',
  'passwordHash',
  'confirmPassword',
  'apiKey',
  'encryptedApiKey',
  'pageAccessToken',
  'pageAccessTokenEncrypted',
  'verifyToken',
  'verifyTokenEncrypted',
  'facebookAppSecret',
  'appSecret',
  'encryptionKey',
  'secret',
  'token',
];

/**
 * Sanitize an object or string to remove sensitive secrets before logging
 */
export function sanitizeLogData(data: any): any {
  if (!data) return data;
  if (typeof data === 'string') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (REDACT_KEYS.some((rk) => k.toLowerCase().includes(rk.toLowerCase()))) {
        clean[k] = '[REDACTED]';
      } else if (typeof v === 'object' && v !== null) {
        clean[k] = sanitizeLogData(v);
      } else {
        clean[k] = v;
      }
    }
    return clean;
  }
  return data;
}

/**
 * Record an activity in the database audit log.
 */
export async function logActivity(params: {
  userId: string;
  pageId?: string | null;
  action: string;
  description: string;
  metadata?: Record<string, any> | null;
}) {
  try {
    const safeMetadata = params.metadata ? JSON.stringify(sanitizeLogData(params.metadata)) : null;
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        pageId: params.pageId || null,
        action: params.action,
        description: params.description,
        metadata: safeMetadata,
      },
    });
  } catch (error) {
    console.error('Failed to write activity log:', error);
  }
}

/**
 * Server console logger with sanitization
 */
export const serverLogger = {
  info: (message: string, context?: any) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, context ? sanitizeLogData(context) : '');
  },
  warn: (message: string, context?: any) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, context ? sanitizeLogData(context) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error ? sanitizeLogData(error) : '');
  },
};
