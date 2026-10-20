import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const channel = searchParams.get('channel') || '';
    const pageId = searchParams.get('pageId') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = { userId: auth.user.id };

    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { senderPsid: { contains: search } },
        { lastMessage: { contains: search } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (channel && channel !== 'ALL') {
      where.channel = channel.toUpperCase();
    }

    if (pageId && pageId !== 'ALL') {
      where.pageId = pageId;
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
        include: {
          page: {
            select: {
              id: true,
              channel: true,
              channelIdentifier: true,
              pageName: true,
              facebookPageId: true,
            },
          },
          _count: {
            select: {
              messages: true,
              orders: true,
            },
          },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      conversations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { success: false, error: 'কথোপকথন তালিকা লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
