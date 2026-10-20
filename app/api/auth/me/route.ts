import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, comparePassword, hashPassword, ADMIN_IMPERSONATOR_COOKIE } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) {
    return auth.response;
  }

  const impersonatorToken = req.cookies.get(ADMIN_IMPERSONATOR_COOKIE)?.value;
  let isImpersonated = false;
  let impersonatorEmail: string | undefined;

  if (impersonatorToken) {
    const { verifyToken } = await import('@/lib/auth');
    const adminPayload = verifyToken(impersonatorToken);
    if (adminPayload && (adminPayload.role === 'ADMIN' || adminPayload.email?.toLowerCase().includes('admin'))) {
      if (adminPayload.userId && adminPayload.userId !== auth.user.id) {
        isImpersonated = true;
        impersonatorEmail = adminPayload.email;
      }
    }
  }

  return NextResponse.json({
    success: true,
    user: auth.user,
    isImpersonated,
    impersonatorEmail,
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { fullName, businessName, phone, currentPassword, newPassword } = body;

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (businessName) updateData.businessName = businessName.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;

    let passwordChanged = false;
    if (newPassword && typeof newPassword === 'string' && newPassword.trim().length > 0) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'বর্তমান পাসওয়ার্ড প্রদান করুন।' },
          { status: 400 }
        );
      }

      if (newPassword.trim().length < 6) {
        return NextResponse.json(
          { success: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' },
          { status: 400 }
        );
      }

      // Fetch user password hash
      const dbUser = await prisma.user.findUnique({
        where: { id: auth.user.id },
        select: { passwordHash: true },
      });

      if (!dbUser || !(await comparePassword(currentPassword, dbUser.passwordHash))) {
        return NextResponse.json(
          { success: false, error: 'বর্তমান পাসওয়ার্ড সঠিক নয়।' },
          { status: 400 }
        );
      }

      updateData.passwordHash = await hashPassword(newPassword.trim());
      passwordChanged = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.user.id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        businessName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        plan: true,
        planStatus: true,
      },
    });

    await logActivity({
      userId: auth.user.id,
      action: passwordChanged ? 'USER_PASSWORD_CHANGED' : 'USER_PROFILE_UPDATED',
      description: passwordChanged
        ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে'
        : `প্রোফাইল তথ্য আপডেট করা হয়েছে: ${updatedUser.fullName}`,
    });

    return NextResponse.json({
      success: true,
      message: passwordChanged
        ? 'পাসওয়ার্ড ও প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে!'
        : 'প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে!',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: 'তথ্য আপডেট করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
