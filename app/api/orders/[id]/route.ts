import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id,
      },
      include: {
        page: {
          select: {
            id: true,
            pageName: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'অর্ডারটি খুঁজে পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'অর্ডার লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'অর্ডারটি খুঁজে পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.customerName !== undefined) updateData.customerName = body.customerName.trim();
    if (body.phone !== undefined) updateData.phone = body.phone.trim();
    if (body.address !== undefined) updateData.address = body.address.trim();
    if (body.product !== undefined) updateData.product = body.product.trim();
    if (body.quantity !== undefined) updateData.quantity = parseInt(body.quantity, 10);
    if (body.totalPrice !== undefined) updateData.totalPrice = parseFloat(body.totalPrice);
    if (body.notes !== undefined) updateData.notes = body.notes ? body.notes.trim() : null;

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
    });

    await logActivity({
      userId: auth.user.id,
      pageId: updated.pageId,
      action: 'ORDER_UPDATED',
      description: `অর্ডার স্ট্যাটাস আপডেট করা হয়েছে: #${updated.id.slice(0, 8)} (${updated.status})`,
    });

    return NextResponse.json({
      success: true,
      message: 'অর্ডার সফলভাবে আপডেট হয়েছে!',
      order: updated,
    });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, error: 'অর্ডার আপডেট করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'অর্ডারটি খুঁজে পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    await prisma.order.delete({
      where: { id: params.id },
    });

    await logActivity({
      userId: auth.user.id,
      pageId: order.pageId,
      action: 'ORDER_DELETED',
      description: `অর্ডার মুছে ফেলা হয়েছে: #${order.id.slice(0, 8)}`,
    });

    return NextResponse.json({
      success: true,
      message: 'অর্ডার সফলভাবে মুছে ফেলা হয়েছে।',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'অর্ডার মুছে ফেলতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
