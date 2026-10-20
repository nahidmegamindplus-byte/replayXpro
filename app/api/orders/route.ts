import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { deliverDigitalOrder } from '@/lib/digital-delivery';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const pageId = searchParams.get('pageId') || '';
    const productType = searchParams.get('productType') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = { userId: auth.user.id };

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { product: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (productType && productType !== 'ALL') {
      where.productType = productType;
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
      customerEmail,
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
      productType,
      paymentStatus,
    } = body;

    // Check product type if product exists in database
    let resolvedProductType = productType || 'PHYSICAL';
    if (productId) {
      const dbProduct = await prisma.product.findUnique({
        where: { id: productId },
        select: { productType: true },
      });
      if (dbProduct?.productType) {
        resolvedProductType = dbProduct.productType;
      }
    }

    const isDigital = resolvedProductType === 'DIGITAL';

    if (!customerName || !product || !pageId) {
      return NextResponse.json(
        { success: false, error: 'গ্রাহকের নাম, পণ্য এবং পেজ নির্বাচন আবশ্যক।' },
        { status: 400 }
      );
    }

    // For physical products, phone and address are required
    if (!isDigital && (!phone || !address)) {
      return NextResponse.json(
        { success: false, error: 'ফিজিক্যাল পণ্যের ক্ষেত্রে ফোন নম্বর ও ডেলিভারি ঠিকানা আবশ্যক।' },
        { status: 400 }
      );
    }

    // For digital products, customerEmail is strongly required
    if (isDigital && !customerEmail) {
      return NextResponse.json(
        { success: false, error: 'ডিজিটাল পণ্যের ইনস্ট্যান্ট ডেলিভারির জন্য গ্রাহকের ইমেইল এড্রেস আবশ্যক।' },
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

    const initialStatus = status || (isDigital ? 'CONFIRMED' : 'PENDING');
    const initialPaymentStatus = paymentStatus || (isDigital ? 'PAID' : 'PENDING');

    const order = await prisma.order.create({
      data: {
        userId: auth.user.id,
        pageId: page.id,
        conversationId: conversationId || null,
        customerName: customerName.trim(),
        customerEmail: customerEmail ? customerEmail.trim().toLowerCase() : null,
        phone: phone ? phone.trim() : (customerEmail ? customerEmail.trim() : 'N/A'),
        address: address ? address.trim() : (isDigital ? 'ডিজিটাল ডেলিভারি (ইমেইল)' : 'N/A'),
        product: product.trim(),
        productId: productId || null,
        productType: resolvedProductType,
        quantity: qty,
        price: unitPrice,
        totalPrice: total,
        notes: notes ? notes.trim() : null,
        status: initialStatus,
        paymentStatus: initialPaymentStatus,
        source: source || 'MANUAL',
      },
    });

    // Auto-fulfill if digital product
    let digitalFulfillmentResult = null;
    if (isDigital && order.customerEmail) {
      try {
        digitalFulfillmentResult = await deliverDigitalOrder(order.id);
      } catch (err) {
        console.error('Digital auto-fulfillment error on creation:', err);
      }
    }

    await logActivity({
      userId: auth.user.id,
      pageId: page.id,
      action: 'ORDER_CREATED',
      description: `নতুন ${isDigital ? 'ডিজিটাল' : 'ফিজিক্যাল'} অর্ডার তৈরি: #${order.id.slice(0, 8)} (${order.customerName} - ${order.totalPrice} টাকা)`,
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
