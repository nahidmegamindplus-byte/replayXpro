import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin, hashPassword } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { ensureDatabaseReady } from '@/lib/db-init';

export async function GET(req: NextRequest) {
  try {
    await ensureDatabaseReady();
    const adminAuth = await requireAdmin(req);
    if ('response' in adminAuth) return adminAuth.response;

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        businessName: true,
        facebookPageUrl: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        plan: true,
        planStatus: true,
        monthlyMessageLimit: true,
        messagesSentThisMonth: true,
        planExpiresAt: true,
        aiChatEnabled: true,
        isBlocked: true,
        registrationIp: true,
        lastLoginIp: true,
        createdAt: true,
        _count: {
          select: {
            pages: true,
            products: true,
            conversations: true,
            orders: true,
            messages: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { success: false, error: 'ব্যবহারকারী তালিকা লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureDatabaseReady();
    const adminAuth = await requireAdmin(req);
    if ('response' in adminAuth) return adminAuth.response;

    const body = await req.json();
    const targetUserId = body.userId || body.id;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'User ID আবশ্যক।' },
        { status: 400 }
      );
    }

    const {
      fullName,
      businessName,
      facebookPageUrl,
      phone,
      status,
      role,
      plan,
      planStatus,
      monthlyMessageLimit,
      planExpiresAt,
      aiChatEnabled,
      isBlocked,
      password,
    } = body;

    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = String(fullName).trim();
    if (businessName !== undefined) updateData.businessName = String(businessName).trim();
    if (facebookPageUrl !== undefined) updateData.facebookPageUrl = facebookPageUrl ? String(facebookPageUrl).trim() : null;
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (status !== undefined) updateData.status = String(status);
    if (role !== undefined) updateData.role = String(role);
    if (plan !== undefined) updateData.plan = String(plan);
    if (planStatus !== undefined) updateData.planStatus = String(planStatus);
    if (monthlyMessageLimit !== undefined) updateData.monthlyMessageLimit = parseInt(monthlyMessageLimit, 10) || 500;
    if (planExpiresAt !== undefined) updateData.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null;
    if (aiChatEnabled !== undefined) updateData.aiChatEnabled = Boolean(aiChatEnabled);
    if (isBlocked !== undefined) updateData.isBlocked = Boolean(isBlocked);

    let passwordChanged = false;
    if (password && typeof password === 'string' && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return NextResponse.json(
          { success: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' },
          { status: 400 }
        );
      }
      updateData.passwordHash = await hashPassword(password.trim());
      passwordChanged = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    await logActivity({
      userId: adminAuth.user.id,
      action: passwordChanged ? 'ADMIN_USER_PASSWORD_RESET' : 'ADMIN_USER_UPDATED',
      description: passwordChanged
        ? `অ্যাডমিন দ্বারা ব্যবহারকারী ${updatedUser.email}-এর পাসওয়ার্ড রিসেট করা হয়েছে`
        : `অ্যাডমিন দ্বারা ব্যবহারকারী ${updatedUser.email}-এর তথ্য আপডেট করা হয়েছে (${status || role || plan || (aiChatEnabled !== undefined ? `AI:${aiChatEnabled}` : '')})`,
    });

    return NextResponse.json({
      success: true,
      message: passwordChanged
        ? 'ব্যবহারকারীর পাসওয়ার্ড ও তথ্য সফলভাবে আপডেট হয়েছে!'
        : 'ব্যবহারকারীর তথ্য সফলভাবে আপডেট হয়েছে!',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'ব্যবহারকারী আপডেট করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureDatabaseReady();
    const adminAuth = await requireAdmin(req);
    if ('response' in adminAuth) return adminAuth.response;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID আবশ্যক।' },
        { status: 400 }
      );
    }

    // Protect super admin from self-deletion
    if (userId === adminAuth.user.id) {
      return NextResponse.json(
        { success: false, error: 'আপনি নিজের অ্যাডমিন অ্যাকাউন্ট মুছে ফেলতে পারবেন না।' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    await logActivity({
      userId: adminAuth.user.id,
      action: 'ADMIN_USER_DELETED',
      description: `অ্যাডমিন দ্বারা ব্যবহারকারী মুছে ফেলা হয়েছে: ${user.fullName} (${user.email})`,
    });

    return NextResponse.json({
      success: true,
      message: 'ব্যবহারকারী এবং তার সংশ্লিষ্ট সকল ডাটা সফলভাবে মুছে ফেলা হয়েছে।',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'ব্যবহারকারী মুছতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
