import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('response' in adminAuth) return adminAuth.response;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      totalPages,
      messagesToday,
      aiRepliesToday,
      totalOrders,
      totalRevenueAggregate,
      recentLogs,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'USER', status: 'ACTIVE' } }),
      prisma.page.count(),
      prisma.message.count(),
      prisma.message.count({ where: { aiGenerated: true } }),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { totalPrice: true },
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          user: { select: { fullName: true, businessName: true, email: true } },
          page: { select: { pageName: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalPages,
        totalMessages: messagesToday,
        aiMessages: aiRepliesToday,
        totalOrders,
        totalRevenue: totalRevenueAggregate._sum.totalPrice || 0,
      },
      recentLogs,
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, error: 'অ্যাডমিন পরিসংখ্যান লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
