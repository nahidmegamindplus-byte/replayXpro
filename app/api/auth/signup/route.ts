import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db-init';
import { hashPassword, signToken, AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { getClientIp, isIpBlocked } from '@/lib/ip';

export async function POST(req: NextRequest) {
  try {
    // Ensure DB tables exist before processing request
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
    const { fullName, businessName, facebookPageUrl, email, password, confirmPassword, phone } = body;

    // Bangla validation messages
    if (!fullName || !businessName || !email || !password || !facebookPageUrl) {
      return NextResponse.json(
        { success: false, error: 'অনুগ্রহ করে ফেসবুক পেজ URL সহ সকল প্রয়োজনীয় তথ্য প্রদান করুন।' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' },
        { status: 400 }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড মেলেনি।' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanFbUrl = facebookPageUrl.trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে লগইন করুন।' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user profile
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        facebookPageUrl: cleanFbUrl,
        email: cleanEmail,
        passwordHash,
        phone: phone ? phone.trim() : null,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'STARTER',
        planStatus: 'INACTIVE',
        aiChatEnabled: true,
        isBlocked: false,
        registrationIp: clientIp,
        lastLoginIp: clientIp,
      },
    });

    // Create default AI settings for user (isolated error handling)
    try {
      await prisma.aiSetting.upsert({
        where: { userId_provider: { userId: user.id, provider: 'GEMINI' } },
        update: {},
        create: {
          userId: user.id,
          provider: 'GEMINI',
          model: 'gemini-1.5-flash',
          temperature: 0.7,
          maxTokens: 800,
        },
      });
    } catch (e) {
      console.warn('Could not create default AiSetting during signup:', e);
    }

    // Log activity (isolated error handling)
    try {
      await logActivity({
        userId: user.id,
        action: 'USER_SIGNUP',
        description: `নতুন অ্যাকাউন্ট তৈরি করা হয়েছে: ${user.fullName} (${user.businessName}) - Page: ${cleanFbUrl}`,
      });
    } catch (e) {
      console.warn('Could not log signup activity:', e);
    }

    // Sign JWT token
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: 'রেজিস্ট্রেশন সফল হয়েছে!',
      user: {
        id: user.id,
        fullName: user.fullName,
        businessName: user.businessName,
        facebookPageUrl: user.facebookPageUrl,
        email: user.email,
        role: user.role,
        plan: user.plan,
        planStatus: user.planStatus,
      },
    });

    // Set HTTP-only Cookie
    response.cookies.set({
      ...getAuthCookieOptions(req),
      value: token,
    });

    return response;
  } catch (error: any) {
    console.error('Signup error details:', error);

    // Handle unique constraint failure from Prisma (e.g. P2002)
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'এই ইমেইল বা পেজ তথ্যটি ইতিমধ্যে সিস্টেমে নিবন্ধিত হয়েছে।' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message
          ? `রেজিস্ট্রেশন করতে সমস্যা হয়েছে: ${error.message.substring(0, 150)}`
          : 'রেজিস্ট্রেশন প্রক্রিয়ায় ত্রুটি দেখা দিয়েছে। আবার চেষ্টা করুন।',
      },
      { status: 500 }
    );
  }
}
