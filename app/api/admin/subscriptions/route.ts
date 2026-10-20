import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        fullName: true,
        businessName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        plan: true,
        monthlyMessageLimit: true,
        messagesSentThisMonth: true,
        planExpiresAt: true,
        createdAt: true,
        _count: {
          select: {
            pages: true,
            products: true,
            conversations: true,
            messages: true,
            orders: true,
          },
        },
      },
      orderBy: { messagesSentThisMonth: 'desc' },
    });

    // Calculate aggregated plan statistics
    let starterUsers = 0, starterMessages = 0;
    let businessUsers = 0, businessMessages = 0;
    let proUsers = 0, proMessages = 0;
    let totalMessagesSent = 0;

    users.forEach((u) => {
      totalMessagesSent += u.messagesSentThisMonth;
      if (u.plan === 'STARTER') {
        starterUsers++;
        starterMessages += u.messagesSentThisMonth;
      } else if (u.plan === 'BUSINESS') {
        businessUsers++;
        businessMessages += u.messagesSentThisMonth;
      } else if (u.plan === 'PRO') {
        proUsers++;
        proMessages += u.messagesSentThisMonth;
      } else {
        starterUsers++;
        starterMessages += u.messagesSentThisMonth;
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalUsers: users.length,
        totalMessagesSent,
        plans: {
          starter: { users: starterUsers, messages: starterMessages, defaultLimit: 500 },
          business: { users: businessUsers, messages: businessMessages, defaultLimit: 2500 },
          pro: { users: proUsers, messages: proMessages, defaultLimit: 10000 },
        },
      },
      users,
    });
  } catch (error: any) {
    console.error('Error fetching admin subscription metrics:', error);
    return NextResponse.json(
      { success: false, error: 'সাবস্ক্রিপশন মেট্রিক্স লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { userId, plan, monthlyMessageLimit, resetUsage } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID আবশ্যক।' }, { status: 400 });
    }

    const updateData: any = {};

    if (plan) {
      updateData.plan = plan.toUpperCase();
      // Auto-assign default limit if not custom specified
      if (monthlyMessageLimit === undefined) {
        if (plan === 'STARTER') updateData.monthlyMessageLimit = 500;
        else if (plan === 'BUSINESS') updateData.monthlyMessageLimit = 2500;
        else if (plan === 'PRO') updateData.monthlyMessageLimit = 10000;
      }
    }

    if (monthlyMessageLimit !== undefined) {
      updateData.monthlyMessageLimit = parseInt(monthlyMessageLimit, 10);
    }

    if (resetUsage) {
      updateData.messagesSentThisMonth = 0;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        plan: true,
        monthlyMessageLimit: true,
        messagesSentThisMonth: true,
      },
    });

    await logActivity({
      userId: auth.user.id,
      action: 'USER_PLAN_UPDATED',
      description: `ব্যবহারকারী (${updatedUser.email}) এর প্ল্যান আপডেট করা হয়েছে: Plan=${updatedUser.plan}, Limit=${updatedUser.monthlyMessageLimit}`,
    });

    return NextResponse.json({
      success: true,
      message: 'ব্যবহারকারীর সাবস্ক্রিপশন ও মেসেজ কোটা সফলভাবে আপডেট হয়েছে!',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error updating user plan:', error);
    return NextResponse.json(
      { success: false, error: 'সাবস্ক্রিপশন আপডেট ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
