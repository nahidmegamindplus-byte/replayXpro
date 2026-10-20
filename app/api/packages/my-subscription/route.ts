import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        fullName: true,
        businessName: true,
        email: true,
        role: true,
        plan: true,
        planStatus: true,
        monthlyMessageLimit: true,
        messagesSentThisMonth: true,
        planExpiresAt: true,
        activePackage: true,
        packageOrders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            package: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'ইউজার পাওয়া যায়নি।' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      subscription: {
        plan: user.plan,
        planStatus: user.planStatus,
        planExpiresAt: user.planExpiresAt,
        monthlyMessageLimit: user.monthlyMessageLimit,
        messagesSentThisMonth: user.messagesSentThisMonth,
        activePackage: user.activePackage,
        latestOrder: user.packageOrders[0] || null,
        allOrders: user.packageOrders,
      },
    });
  } catch (error: any) {
    console.error('Error fetching my subscription:', error);
    return NextResponse.json(
      { success: false, error: 'সাবস্ক্রিপশন তথ্য লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
