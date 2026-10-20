import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const pageId = searchParams.get('pageId') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = { userId: auth.user.id };

    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { phone: { contains: search } },
        { address: { contains: search } },
        { product: { contains: search } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (pageId && pageId !== 'ALL') {
      where.pageId = pageId;
    }

    const [orders, total, statusCounts] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          page: {
            select: {
              id: true,
              pageName: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
      prisma.order.groupBy({
        by: ['status'],
        where: { userId: auth.user.id },
        _count: { status: true },
      }),
    ]);

    const counts: Record<string, number> = {
      ALL: 0,
      PENDING: 0,
      CONFIRMED: 0,
      PROCESSING: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    statusCounts.forEach((sc) => {
      counts[sc.status] = sc._count.status;
      counts.ALL += sc._count.status;
    });

    return NextResponse.json({
      success: true,
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      counts,
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'অর্ডার তালিকা লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const {
      pageId,
      conversationId,
      customerName,
      phone,
      address,
      product,
      productId,
      quantity,
      price,
      totalPrice,
      notes,
      status,
      source,
    } = body;

    if (!customerName || !phone || !address || !product || !pageId) {
      return NextResponse.json(
        { success: false, error: 'গ্রাহকের নাম, ফোন নম্বর, ঠিকানা, পণ্য এবং পেজ নির্বাচন আবশ্যক।' },
        { status: 400 }
      );
    }

    const page = await prisma.page.findFirst({
      where: { id: pageId, userId: auth.user.id },
    });

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'নির্বাচিত পেজটি সঠিক নয়।' },
        { status: 400 }
      );
    }

    const qty = quantity ? parseInt(quantity, 10) : 1;
    const unitPrice = price ? parseFloat(price) : 0;
    const total = totalPrice ? parseFloat(totalPrice) : unitPrice * qty;

    const order = await prisma.order.create({
      data: {
        userId: auth.user.id,
        pageId: page.id,
        conversationId: conversationId || null,
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        product: product.trim(),
        productId: productId || null,
        quantity: qty,
        price: unitPrice,
        totalPrice: total,
        notes: notes ? notes.trim() : null,
        status: status || 'PENDING',
        source: source || 'MANUAL',
      },
    });

    await logActivity({
      userId: auth.user.id,
      pageId: page.id,
      action: 'ORDER_CREATED',
      description: `নতুন অর্ডার তৈরি করা হয়েছে: #${order.id.slice(0, 8)} (${order.customerName} - ${order.totalPrice} টাকা)`,
    });

    return NextResponse.json({
      success: true,
      message: 'অর্ডার সফলভাবে তৈরি হয়েছে!',
      order,
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, error: 'অর্ডার তৈরি করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
