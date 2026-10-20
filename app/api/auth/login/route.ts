import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db-init';
import { comparePassword, signToken, AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { getClientIp, isIpBlocked } from '@/lib/ip';

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseReady();

    const clientIp = getClientIp(req);
    const blocked = await isIpBlocked(clientIp);
    if (blocked) {
      return NextResponse.json(
        { success: false, error: 'আপনার আইপি ঠিকানাটি ব্লক করা হয়েছে। বিস্তারিত জানতে সাপোর্টে যোগাযোগ করুন।' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'ইমেইল এবং পাসওয়ার্ড প্রদান করুন।' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।' },
        { status: 401 }
      );
    }

    if (user.status === 'DISABLED' || user.isBlocked) {
      return NextResponse.json(
        { success: false, error: 'আপনার অ্যাকাউন্টটি স্থগিত অথবা ব্লক করা হয়েছে। সাপোর্টে যোগাযোগ করুন।' },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।' },
        { status: 401 }
      );
    }

    // Update lastLoginIp
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginIp: clientIp },
      });
    } catch (_) {}

    // Log login activity
    try {
      await logActivity({
        userId: user.id,
        action: 'USER_LOGIN',
        description: `ব্যবহারকারী সফলভাবে লগইন করেছেন: ${user.email} (IP: ${clientIp})`,
      });
    } catch (e) {
      console.warn('Could not log login activity:', e);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: 'লগইন সফল হয়েছে!',
      user: {
        id: user.id,
        fullName: user.fullName,
        businessName: user.businessName,
        email: user.email,
        role: user.role,
        plan: user.plan,
        planStatus: user.planStatus,
      },
    });

    // Set cookie
    response.cookies.set({
      ...getAuthCookieOptions(req),
      value: token,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'লগইন প্রক্রিয়ায় ত্রুটি দেখা দিয়েছে।' },
      { status: 500 }
    );
  }
}
