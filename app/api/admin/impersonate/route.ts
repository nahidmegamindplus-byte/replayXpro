import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin, signToken, getAuthCookieOptions, extractToken, verifyToken, AUTH_COOKIE_NAME, ADMIN_IMPERSONATOR_COOKIE } from '@/lib/auth';
import { ensureDatabaseReady } from '@/lib/db-init';
import { logActivity } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseReady();
    const adminAuth = await requireAdmin(req);
    if ('response' in adminAuth) {
      return adminAuth.response;
    }

    const currentAdminToken = extractToken(req);
    if (!currentAdminToken) {
      return NextResponse.json(
        { success: false, error: 'অ্যাডমিন সেশন পাওয়া যায়নি।' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const targetUserId = body.targetUserId || body.userId;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'ইউজার আইডি প্রদান করুন।' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        businessName: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'ইউজার পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    // Generate token for target user
    const targetToken = signToken({
      userId: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      message: `সফলভাবে ${targetUser.fullName}-এর অ্যাকাউন্টে লগইন করা হয়েছে।`,
      redirect: '/dashboard',
      user: targetUser,
    });

    // Set target user token as the active replyx_session
    const cookieOptions = getAuthCookieOptions(req);
    response.cookies.set(AUTH_COOKIE_NAME, targetToken, cookieOptions);

    // Save admin original token into replyx_admin_session for 1-click restore
    response.cookies.set(ADMIN_IMPERSONATOR_COOKIE, currentAdminToken, {
      ...cookieOptions,
      name: ADMIN_IMPERSONATOR_COOKIE,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    await logActivity({
      userId: adminAuth.user.id,
      action: 'ADMIN_IMPERSONATE_USER',
      description: `অ্যাডমিন (${adminAuth.user.email}) ইউজার (${targetUser.email} - ${targetUser.fullName}) এর ড্যাশবোর্ডে প্রবেশ করেছেন`,
      metadata: { targetUserId: targetUser.id, targetEmail: targetUser.email },
    });

    return response;
  } catch (error: any) {
    console.error('Impersonate error:', error);
    return NextResponse.json(
      { success: false, error: 'ইউজার অ্যাকাউন্টে প্রবেশ করতে ত্রুটি হয়েছে।' },
      { status: 500 }
    );
  }
}
