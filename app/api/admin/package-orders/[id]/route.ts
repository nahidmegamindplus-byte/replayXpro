import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

// GET single package order details
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = params;

    const order = await prisma.packageOrder.findUnique({
      where: { id },
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
        package: true,
        paymentMethod: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'অর্ডারটি পাওয়া যায়নি।' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('Error getting package order:', error);
    return NextResponse.json(
      { success: false, error: 'অর্ডার তথ্য লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

// PUT / EDIT package order
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = params;
    const body = await req.json();

    const existingOrder = await prisma.packageOrder.findUnique({
      where: { id },
      include: { package: true, user: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ success: false, error: 'অর্ডারটি পাওয়া যায়নি।' }, { status: 404 });
    }

    const {
      userId,
      packageId,
      paymentMethodName,
      amount,
      senderNumber,
      transactionId,
      status,
      adminNote,
    } = body;

    const targetUserId = userId || existingOrder.userId;
    const targetPackageId = packageId || existingOrder.packageId;

    // Fetch package details or fallback safely
    let pkg = await prisma.package.findFirst({
      where: {
        OR: [
          { id: targetPackageId },
          { slug: targetPackageId?.toLowerCase() },
          { name: targetPackageId },
        ],
      },
    });

    if (!pkg) {
      pkg = existingOrder.package || (await prisma.package.findFirst());
    }

    const newStatus = status || existingOrder.status;

    // Update order
    const updatedOrder = await prisma.packageOrder.update({
      where: { id },
      data: {
        userId: targetUserId,
        packageId: pkg ? pkg.id : existingOrder.packageId,
        paymentMethodName: paymentMethodName !== undefined ? paymentMethodName : existingOrder.paymentMethodName,
        amount: amount !== undefined ? parseFloat(amount) : existingOrder.amount,
        senderNumber: senderNumber !== undefined ? senderNumber.trim() : existingOrder.senderNumber,
        transactionId: transactionId !== undefined ? transactionId.trim().toUpperCase() : existingOrder.transactionId,
        status: newStatus,
        adminNote: adminNote !== undefined ? adminNote.trim() : existingOrder.adminNote,
        approvedAt: newStatus === 'APPROVED' ? (existingOrder.approvedAt || new Date()) : null,
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

    // If status is APPROVED, activate user's plan
    if (newStatus === 'APPROVED' && pkg) {
      const durationDays = pkg.durationDays || 30;
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          planStatus: 'ACTIVE',
          plan: pkg.slug.toUpperCase(),
          activePackageId: pkg.id,
          monthlyMessageLimit: pkg.messageLimit,
          planExpiresAt: expiresAt,
        },
      });
    } else if (newStatus === 'REJECTED' && existingOrder.status === 'APPROVED') {
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          planStatus: 'INACTIVE',
        },
      });
    }

    await logActivity({
      userId: auth.user.id,
      action: 'PACKAGE_ORDER_UPDATED',
      description: `অর্ডার ${updatedOrder.orderNumber} আপডেট করা হয়েছে (${newStatus})`,
    });

    return NextResponse.json({
      success: true,
      message: `অর্ডার ${updatedOrder.orderNumber} সফলভাবে আপডেট করা হয়েছে!`,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Error updating package order:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'অর্ডার আপডেট করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

// DELETE package order
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = params;

    const order = await prisma.packageOrder.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'অর্ডারটি পাওয়া যায়নি।' }, { status: 404 });
    }

    await prisma.packageOrder.delete({ where: { id } });

    await logActivity({
      userId: auth.user.id,
      action: 'PACKAGE_ORDER_DELETED',
      description: `অর্ডার মুছে ফেলা হয়েছে: ${order.orderNumber} (${order.user?.email || 'N/A'})`,
    });

    return NextResponse.json({
      success: true,
      message: `অর্ডার ${order.orderNumber} সফলভাবে ডিলিট করা হয়েছে!`,
    });
  } catch (error: any) {
    console.error('Error deleting package order:', error);
    return NextResponse.json(
      { success: false, error: 'অর্ডার ডিলিট করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
