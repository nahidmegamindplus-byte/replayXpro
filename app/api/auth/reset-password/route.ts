import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ success: false, error: 'টোকেন এবং নতুন পাসওয়ার্ড প্রদান করুন।' }, { status: 400 });
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json({ success: false, error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' }, { status: 400 });
    }

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: String(token).trim() },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'রিসেট টোকেনটি সঠিক নয় বা এর মেয়াদ শেষ হয়ে গেছে।' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: resetRecord.email },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'ব্যবহারকারী পাওয়া যায়নি।' }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete token
    await prisma.passwordResetToken.delete({
      where: { id: resetRecord.id },
    });

    return NextResponse.json({
      success: true,
      message: 'আপনার পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে! এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
