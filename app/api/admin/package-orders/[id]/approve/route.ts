import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db-init';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    await ensureDatabaseReady();

    const { id } = params;

    const order = await prisma.packageOrder.findUnique({
      where: { id },
      include: {
        package: true,
        user: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'অর্ডারটি পাওয়া যায়নি।' }, { status: 404 });
    }

    if (!order.user) {
      return NextResponse.json({ success: false, error: 'এই অর্ডারের সাথে সংশ্লিষ্ট গ্রাহক অ্যাকাউন্টটি পাওয়া যায়নি।' }, { status: 404 });
    }

    // Determine package details or fallback safely
    let pkg: any = order.package;
    if (!pkg && order.packageId) {
      pkg = await prisma.package.findUnique({ where: { id: order.packageId } });
    }
    if (!pkg) {
      pkg = await prisma.package.findFirst();
    }

    const durationDays = pkg?.durationDays || 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const messageLimit = pkg?.messageLimit || 10000;
    const planName = (pkg?.slug || 'STARTER').toUpperCase();

    // 1. Update order status to APPROVED
    const updatedOrder = await prisma.packageOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        packageId: pkg ? pkg.id : order.packageId,
      },
      include: {
        package: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            businessName: true,
            plan: true,
            planStatus: true,
          },
        },
      },
    });

    // 2. Activate user package & plan immediately
    await prisma.user.update({
      where: { id: order.userId },
      data: {
        planStatus: 'ACTIVE',
        plan: planName,
        activePackageId: pkg ? pkg.id : null,
        monthlyMessageLimit: messageLimit,
        planExpiresAt: expiresAt,
      },
    });

    await logActivity({
      userId: auth.user.id,
      action: 'PACKAGE_ORDER_APPROVED',
      description: `প্যাকেজ অর্ডার অনুমোদিত: ${order.user.businessName || order.user.fullName} (${order.user.email}) -> ${pkg?.name || planName} (৳${order.amount}) | TrxID: ${order.transactionId}`,
    });

    return NextResponse.json({
      success: true,
      message: `অর্ডার ${order.orderNumber} সফলভাবে অনুমোদিত হয়েছে এবং গ্রাহকের অ্যাকাউন্ট সক্রিয় করা হয়েছে!`,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Error approving package order:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'অর্ডার অনুমোদন করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
