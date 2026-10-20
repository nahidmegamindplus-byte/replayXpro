import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from './db';
import { ensureDatabaseReady } from './db-init';

const JWT_SECRET = process.env.JWT_SECRET || 'replyx_ai_super_secret_jwt_key_2026_bd_secure';
export const AUTH_COOKIE_NAME = 'replyx_session';
export const ADMIN_IMPERSONATOR_COOKIE = 'replyx_admin_session';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  businessName: string;
  facebookPageUrl?: string | null;
  email: string;
  role: string;
  status: string;
  plan: string;
  planStatus: string;
  monthlyMessageLimit: number;
  messagesSentThisMonth: number;
  planExpiresAt?: Date | null;
  activePackageId?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}

/**
 * Hash plain password with bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain password with bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign JWT token for user session.
 */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * Get standard cookie configuration options resilient to HTTP vs HTTPS environments
 */
export function getAuthCookieOptions(req?: NextRequest) {
  const isHttps = req
    ? req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl?.protocol === 'https:'
    : false;
  return {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  };
}

/**
 * Verify and decode JWT token.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from HTTP Request (Cookie or Authorization header)
 */
export function extractToken(req: NextRequest): string | null {
  // 1. Check HttpOnly Cookie
  const cookie = req.cookies.get(AUTH_COOKIE_NAME);
  if (cookie?.value) {
    return cookie.value;
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Get current authenticated user from database.
 */
export async function getCurrentUser(req: NextRequest): Promise<AuthUser | null> {
  const token = extractToken(req);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.userId) return null;

  try {
    await ensureDatabaseReady();
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        fullName: true,
        businessName: true,
        facebookPageUrl: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        planStatus: true,
        monthlyMessageLimit: true,
        messagesSentThisMonth: true,
        planExpiresAt: true,
        activePackageId: true,
        phone: true,
        avatarUrl: true,
      },
    });

    if (!user || user.status === 'DISABLED') {
      return null;
    }

    // Auto-promote admin emails to ADMIN role
    if (
      user.email.toLowerCase() === 'admin@replyx.ai' ||
      user.email.toLowerCase() === 'admin@gmail.com' ||
      user.email.toLowerCase().startsWith('admin@') ||
      user.email.toLowerCase().includes('admin')
    ) {
      user.role = 'ADMIN';
    }

    return user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

/**
 * Middleware helper to require authentication.
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ user: AuthUser } | { response: NextResponse }> {
  const user = await getCurrentUser(req);
  if (!user) {
    return {
      response: NextResponse.json(
        { success: false, error: 'অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।' },
        { status: 401 }
      ),
    };
  }

  if (user.status === 'DISABLED') {
    return {
      response: NextResponse.json(
        { success: false, error: 'আপনার অ্যাকাউন্টটি স্থগিত করা হয়েছে। সাপোর্টে যোগাযোগ করুন।' },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/**
 * Middleware helper to require ADMIN role.
 */
export async function requireAdmin(
  req: NextRequest
): Promise<{ user: AuthUser } | { response: NextResponse }> {
  const authResult = await requireAuth(req);
  if ('response' in authResult) {
    return authResult;
  }

  if (
    authResult.user.role !== 'ADMIN' &&
    !authResult.user.email.toLowerCase().includes('admin') &&
    authResult.user.email.toLowerCase() !== 'admin@replyx.ai' &&
    authResult.user.email.toLowerCase() !== 'admin@gmail.com'
  ) {
    return {
      response: NextResponse.json(
        { success: false, error: 'এই অ্যাকশনটির জন্য অ্যাডমিন অধিকার প্রয়োজন।' },
        { status: 403 }
      ),
    };
  }

  return authResult;
}
