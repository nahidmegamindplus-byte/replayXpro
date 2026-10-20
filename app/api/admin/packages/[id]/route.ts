import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = params;
    const body = await req.json();
    const {
      name,
      description,
      price,
      durationDays,
      messageLimit,
      pageLimit,
      productLimit,
      features,
      isPopular,
      isActive,
    } = body;

    const updatedPackage = await prisma.package.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(durationDays !== undefined && { durationDays: parseInt(durationDays, 10) }),
        ...(messageLimit !== undefined && { messageLimit: parseInt(messageLimit, 10) }),
        ...(pageLimit !== undefined && { pageLimit: parseInt(pageLimit, 10) }),
        ...(productLimit !== undefined && { productLimit: parseInt(productLimit, 10) }),
        ...(features !== undefined && {
          features: typeof features === 'string' ? features : JSON.stringify(features || []),
        }),
        ...(isPopular !== undefined && { isPopular: Boolean(isPopular) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    await logActivity({
      userId: auth.user.id,
      action: 'PACKAGE_UPDATED',
      description: `প্যাকেজ আপডেট করা হয়েছে: ${updatedPackage.name} (৳${updatedPackage.price})`,
    });

    return NextResponse.json({
      success: true,
      message: 'প্যাকেজ সফলভাবে আপডেট হয়েছে!',
      package: updatedPackage,
    });
  } catch (error: any) {
    console.error('Error updating package:', error);
    return NextResponse.json(
      { success: false, error: 'প্যাকেজ আপডেট করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = params;

    // Check if package has active users or orders
    const activeUsersCount = await prisma.user.count({ where: { activePackageId: id } });
    if (activeUsersCount > 0) {
      // Deactivate instead of hard delete
      await prisma.package.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: 'প্যাকেজে সক্রিয় গ্রাহক থাকায় এটি ডিলিটের পরিবর্তে নিষ্ক্রিয় (Deactivated) করা হয়েছে।',
      });
    }

    await prisma.package.delete({ where: { id } });

    await logActivity({
      userId: auth.user.id,
      action: 'PACKAGE_DELETED',
      description: `প্যাকেজ ডিলিট করা হয়েছে (ID: ${id})`,
    });

    return NextResponse.json({
      success: true,
      message: 'প্যাকেজ সফলভাবে মুছে ফেলা হয়েছে!',
    });
  } catch (error: any) {
    console.error('Error deleting package:', error);
    return NextResponse.json(
      { success: false, error: 'প্যাকেজ মুছতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
