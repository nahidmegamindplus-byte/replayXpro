import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ensureDatabaseReady } from '@/lib/db-init';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    await ensureDatabaseReady();
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '7d';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const pageId = searchParams.get('pageId') || '';

    const now = new Date();
    let startDate = new Date();

    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '7d') {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '30d') {
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'custom' && startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      now.setTime(new Date(endDateParam).getTime());
    } else {
      startDate.setDate(now.getDate() - 7);
    }

    const baseWhere: any = {
      userId: auth.user.id,
      createdAt: { gte: startDate, lte: now },
    };

    if (pageId && pageId !== 'ALL') {
      baseWhere.pageId = pageId;
    }

    // 1. Fetch data efficiently
    const [messages, orders, pages, products, allTimeMessagesCount, allTimeIncomingCount, allTimeAiRepliesCount, allTimeConversationsCount, userRecord] = await Promise.all([
      prisma.message.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        take: 2000,
        select: {
          direction: true,
          aiGenerated: true,
          messageType: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        take: 1000,
        select: {
          status: true,
          totalPrice: true,
          product: true,
          createdAt: true,
        },
      }),
      prisma.page.findMany({
        where: { userId: auth.user.id },
        select: {
          id: true,
          pageName: true,
          connectionStatus: true,
          _count: { select: { conversations: true, orders: true } },
        },
      }),
      prisma.product.findMany({
        where: { userId: auth.user.id },
        take: 50,
        select: { id: true, name: true, price: true, category: true },
      }),
      prisma.message.count({
        where: { userId: auth.user.id },
      }),
      prisma.message.count({
        where: { userId: auth.user.id, direction: 'INCOMING' },
      }),
      prisma.message.count({
        where: { userId: auth.user.id, aiGenerated: true },
      }),
      prisma.conversation.count({
        where: { userId: auth.user.id },
      }),
      prisma.user.findUnique({
        where: { id: auth.user.id },
        select: {
          messagesSentThisMonth: true,
          monthlyMessageLimit: true,
          activePackage: {
            select: {
              name: true,
              messageLimit: true,
            },
          },
        },
      }),
    ]);

    const totalMessages = messages.length;
    const totalIncoming = messages.filter((m) => m.direction === 'INCOMING').length;
    const totalAiReplies = messages.filter((m) => m.aiGenerated).length;
    const totalHumanReplies = messages.filter((m) => m.direction === 'OUTGOING' && !m.aiGenerated).length;
    const totalOrders = orders.length;
    const totalRevenue = orders.filter((o) => o.status !== 'CANCELLED').reduce((acc, o) => acc + (o.totalPrice || 0), 0);
    const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'DELIVERED').length;

    // Conversion rate
    const conversionRate = totalIncoming > 0 ? ((totalOrders / totalIncoming) * 100).toFixed(1) : '0.0';

    // Daily breakdown for charts
    const dailyMap: Record<string, { date: string; incoming: number; aiReplies: number; orders: number }> = {};

    // Generate date keys for the range
    const cur = new Date(startDate);
    while (cur <= now) {
      const key = cur.toISOString().split('T')[0];
      dailyMap[key] = { date: key, incoming: 0, aiReplies: 0, orders: 0 };
      cur.setDate(cur.getDate() + 1);
    }

    messages.forEach((m) => {
      const key = m.createdAt.toISOString().split('T')[0];
      if (dailyMap[key]) {
        if (m.direction === 'INCOMING') dailyMap[key].incoming += 1;
        if (m.aiGenerated) dailyMap[key].aiReplies += 1;
      }
    });

    orders.forEach((o) => {
      const key = o.createdAt.toISOString().split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].orders += 1;
      }
    });

    const dailyTrends = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Top products
    const productFrequency: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.product) {
        productFrequency[o.product] = (productFrequency[o.product] || 0) + 1;
      }
    });

    const topProducts = Object.entries(productFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      metrics: {
        totalMessages,
        totalIncoming,
        totalAiReplies,
        totalHumanReplies,
        allTimeTotalMessages: allTimeMessagesCount,
        allTimeIncoming: allTimeIncomingCount,
        allTimeAiReplies: allTimeAiRepliesCount,
        allTimeConversations: allTimeConversationsCount,
        messagesSentThisMonth: userRecord?.messagesSentThisMonth || 0,
        monthlyMessageLimit: userRecord?.activePackage?.messageLimit || userRecord?.monthlyMessageLimit || 0,
        packageName: userRecord?.activePackage?.name || 'স্ট্যান্ডার্ড প্যাকেজ',
        totalOrders,
        confirmedOrders,
        totalRevenue,
        conversionRate,
      },
      dailyTrends,
      topProducts,
      pagesBreakdown: pages.map((p) => ({
        id: p.id,
        name: p.pageName,
        status: p.connectionStatus,
        conversations: p._count.conversations,
        orders: p._count.orders,
      })),
    });
  } catch (error: any) {
    console.error('Error generating reports:', error);
    return NextResponse.json(
      { success: false, error: 'রিপোর্ট ডাটা লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
