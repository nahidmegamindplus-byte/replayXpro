import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    const orders = await prisma.packageOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
            plan: true,
            planStatus: true,
          },
        },
        package: {
          select: {
            id: true,
            name: true,
            price: true,
            durationDays: true,
            messageLimit: true,
            pageLimit: true,
          },
        },
      },
    });

    const pendingCount = await prisma.packageOrder.count({ where: { status: 'PENDING' } });
    const approvedCount = await prisma.packageOrder.count({ where: { status: 'APPROVED' } });
    const rejectedCount = await prisma.packageOrder.count({ where: { status: 'REJECTED' } });

    return NextResponse.json({
      success: true,
      counts: {
        total: orders.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
      orders,
    });
  } catch (error: any) {
    console.error('Error fetching admin package orders:', error);
    return NextResponse.json(
      { success: false, error: 'প্যাকেজ অর্ডার তালিকা লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const {
      userId,
      packageId,
      paymentMethodName,
      amount,
      senderNumber,
      transactionId,
      status = 'PENDING',
      adminNote,
    } = body;

    if (!userId || !packageId || !transactionId || !senderNumber) {
      return NextResponse.json(
        { success: false, error: 'ইউজার, প্যাকেজ, প্রেরকের নম্বর এবং Transaction ID আবশ্যক।' },
        { status: 400 }
      );
    }

    const pkg = await prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) {
      return NextResponse.json({ success: false, error: 'প্যাকেজটি পাওয়া যায়নি।' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'ব্যবহারকারীকে পাওয়া যায়নি।' }, { status: 404 });
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalAmount = amount !== undefined && amount !== null && amount !== '' ? parseFloat(amount) : pkg.price;
    const finalMethod = paymentMethodName || 'bKash (Manual)';

    const isApproved = status === 'APPROVED';

    const order = await prisma.packageOrder.create({
      data: {
        orderNumber,
        userId,
        packageId,
        paymentMethodName: finalMethod,
        amount: finalAmount,
        senderNumber: senderNumber.trim(),
        transactionId: transactionId.trim(),
        status: status || 'PENDING',
        adminNote: adminNote ? adminNote.trim() : null,
        approvedAt: isApproved ? new Date() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
          },
        },
        package: true,
      },
    });

    if (isApproved) {
      const durationDays = pkg.durationDays || 30;
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: userId },
        data: {
          planStatus: 'ACTIVE',
          plan: pkg.slug.toUpperCase(),
          activePackageId: pkg.id,
          monthlyMessageLimit: pkg.messageLimit,
          planExpiresAt: expiresAt,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `ম্যানুয়াল অর্ডার ${orderNumber} সফলভাবে তৈরি করা হয়েছে!`,
      order,
    });
  } catch (error: any) {
    console.error('Error creating manual package order:', error);
    return NextResponse.json(
      { success: false, error: 'ম্যানুয়াল অর্ডার তৈরি করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

