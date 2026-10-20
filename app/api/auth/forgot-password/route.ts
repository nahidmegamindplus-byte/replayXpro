import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { getAppUrl } from '@/lib/url';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !String(email).trim()) {
      return NextResponse.json({ success: false, error: 'ইমেইল অ্যাড্রেস প্রদান করুন।' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      // Security: return generic success so user enumeration is prevented
      return NextResponse.json({
        success: true,
        message: 'যদি এই ইমেইলে কোনো অ্যাকাউন্ট থেকে থাকে, তবে পাসওয়ার্ড রিসেট লিংক প্রস্তুত করা হয়েছে।',
      });
    }

    // Clean up old tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: cleanEmail },
    });

    // Generate token valid for 1 hour
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        email: cleanEmail,
        token,
        expiresAt,
      },
    });

    const appUrl = getAppUrl(req);
    const resetUrl = `${appUrl}/forgot-password?token=${token}`;

    return NextResponse.json({
      success: true,
      message: 'পাসওয়ার্ড রিসেট লিংক তৈরি হয়েছে।',
      resetUrl, // Provided directly for immediate self-hosted / local access
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'পাসওয়ার্ড রিসেট প্রক্রিয়ায় ত্রুটি হয়েছে।' },
      { status: 500 }
    );
  }
}
