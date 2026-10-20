import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = params;
    const body = await req.json();
    const { adminNote } = body;

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

    const note = adminNote ? adminNote.trim() : 'Transaction ID যাচাইকরণ ব্যর্থ হয়েছে। অনুগ্রহ করে সঠিক তথ্য দিয়ে পুনরায় অর্ডার করুন।';

    // 1. Update order status
    const updatedOrder = await prisma.packageOrder.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNote: note,
      },
    });

    // 2. If user is in PENDING_APPROVAL and has no other approved package, set to INACTIVE
    if (order.user.planStatus === 'PENDING_APPROVAL') {
      await prisma.user.update({
        where: { id: order.userId },
        data: {
          planStatus: 'INACTIVE',
        },
      });
    }

    await logActivity({
      userId: auth.user.id,
      action: 'PACKAGE_ORDER_REJECTED',
      description: `প্যাকেজ অর্ডার বাতিল: ${order.user.businessName} (${order.user.email}) -> ${order.package.name} | কারণ: ${note}`,
    });

    return NextResponse.json({
      success: true,
      message: `অর্ডার ${order.orderNumber} বাতিল করা হয়েছে।`,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Error rejecting package order:', error);
    return NextResponse.json(
      { success: false, error: 'অর্ডার বাতিল করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
