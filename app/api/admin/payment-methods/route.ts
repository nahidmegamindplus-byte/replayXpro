import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const methods = await prisma.paymentMethod.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      paymentMethods: methods,
    });
  } catch (error: any) {
    console.error('Error fetching admin payment methods:', error);
    return NextResponse.json(
      { success: false, error: 'পেমেন্ট মেথড লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { name, displayName, accountNumber, accountType, instructions, isActive } = body;

    if (!name || !displayName || !accountNumber) {
      return NextResponse.json(
        { success: false, error: 'পেমেন্ট মেথডের নাম, ডিসপ্লে নাম এবং একাউন্ট নম্বর আবশ্যক।' },
        { status: 400 }
      );
    }

    const cleanName = name.trim().toUpperCase();

    const existing = await prisma.paymentMethod.findUnique({
      where: { name: cleanName },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'এই নামের পেমেন্ট মেথড ইতিমধ্যে রয়েছে।' },
        { status: 400 }
      );
    }

    const newMethod = await prisma.paymentMethod.create({
      data: {
        name: cleanName,
        displayName: displayName.trim(),
        accountNumber: accountNumber.trim(),
        accountType: accountType ? accountType.trim() : 'Personal',
        instructions: instructions ? instructions.trim() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    await logActivity({
      userId: auth.user.id,
      action: 'PAYMENT_METHOD_CREATED',
      description: `নতুন পেমেন্ট মেথড তৈরি: ${newMethod.displayName} (${newMethod.accountNumber})`,
    });

    return NextResponse.json({
      success: true,
      message: 'নতুন পেমেন্ট মেথড সফলভাবে তৈরি হয়েছে!',
      paymentMethod: newMethod,
    });
  } catch (error: any) {
    console.error('Error creating payment method:', error);
    return NextResponse.json(
      { success: false, error: 'পেমেন্ট মেথড তৈরি করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { id, displayName, accountNumber, accountType, instructions, isActive } = body;

    if (!id || !accountNumber) {
      return NextResponse.json({ success: false, error: 'Payment Method ID এবং একাউন্ট নম্বর আবশ্যক।' }, { status: 400 });
    }

    const updated = await prisma.paymentMethod.update({
      where: { id },
      data: {
        accountNumber: accountNumber.trim(),
        ...(displayName && { displayName: displayName.trim() }),
        ...(accountType && { accountType: accountType.trim() }),
        ...(instructions !== undefined && { instructions: instructions ? instructions.trim() : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    await logActivity({
      userId: auth.user.id,
      action: 'PAYMENT_METHOD_UPDATED',
      description: `পেমেন্ট মেথড আপডেট: ${updated.displayName} (${updated.accountNumber})`,
    });

    return NextResponse.json({
      success: true,
      message: `${updated.displayName} সেটিংস সফলভাবে আপডেট হয়েছে!`,
      paymentMethod: updated,
    });
  } catch (error: any) {
    console.error('Error updating payment method:', error);
    return NextResponse.json(
      { success: false, error: 'পেমেন্ট মেথড আপডেট করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Payment Method ID আবশ্যক।' }, { status: 400 });
    }

    await prisma.paymentMethod.delete({
      where: { id },
    });

    await logActivity({
      userId: auth.user.id,
      action: 'PAYMENT_METHOD_DELETED',
      description: `পেমেন্ট মেথড মুছে ফেলা হয়েছে: ${id}`,
    });

    return NextResponse.json({
      success: true,
      message: 'পেমেন্ট মেথড সফলভাবে মুছে ফেলা হয়েছে!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'পেমেন্ট মেথড মুছতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
