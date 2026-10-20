import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('response' in adminAuth) return adminAuth.response;

  try {
    const pages = await prisma.page.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
          },
        },
        _count: {
          select: {
            conversations: true,
            orders: true,
            products: true,
            messages: true,
          },
        },
      },
    });

    const safePages = pages.map((p) => ({
      id: p.id,
      pageName: p.pageName,
      facebookPageId: p.facebookPageId,
      webhookStatus: p.webhookStatus,
      connectionStatus: p.connectionStatus,
      autoReplyEnabled: p.autoReplyEnabled,
      humanHandoffEnabled: p.humanHandoffEnabled,
      replyLanguage: p.replyLanguage,
      replyStyle: p.replyStyle,
      createdAt: p.createdAt,
      owner: p.user,
      counts: p._count,
    }));

    return NextResponse.json({ success: true, pages: safePages });
  } catch (error: any) {
    console.error('Error fetching admin pages:', error);
    return NextResponse.json(
      { success: false, error: 'পেজ তালিকা লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
