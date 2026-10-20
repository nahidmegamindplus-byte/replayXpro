import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

// PATCH: Update license status, extend duration, or update client note
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = params;
    const body = await req.json();
    const { status, durationDays, messageLimit, pageLimit, productLimit, clientName, clientPhone, clientNote } = body;

    const license = await prisma.licenseKey.findUnique({
      where: { id },
      include: { usedByUser: true },
    });

    if (!license) {
      return NextResponse.json({ success: false, error: 'লাইসেন্স কি পাওয়া যায়নি।' }, { status: 404 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (durationDays !== undefined) updateData.durationDays = parseInt(durationDays);
    if (messageLimit !== undefined) updateData.messageLimit = parseInt(messageLimit);
    if (pageLimit !== undefined) updateData.pageLimit = parseInt(pageLimit);
    if (productLimit !== undefined) updateData.productLimit = parseInt(productLimit);
    if (clientName !== undefined) updateData.clientName = clientName ? clientName.trim() : null;
    if (clientPhone !== undefined) updateData.clientPhone = clientPhone ? clientPhone.trim() : null;
    if (clientNote !== undefined) updateData.clientNote = clientNote ? clientNote.trim() : null;

    // If extending or revoking and a user was already linked
    if (status === 'REVOKED' && license.usedByUserId) {
      await prisma.user.update({
        where: { id: license.usedByUserId },
        data: { planStatus: 'INACTIVE' },
      });
    } else if (status === 'ACTIVE' && license.usedByUserId) {
      await prisma.user.update({
        where: { id: license.usedByUserId },
        data: { planStatus: 'ACTIVE' },
      });
    }

    const updatedLicense = await prisma.licenseKey.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      userId: auth.user.id,
      action: 'LICENSE_KEY_UPDATED',
      description: `লাইসেন্স কি ${updatedLicense.key} আপডেট করা হয়েছে (${status || 'Updated'})`,
    });

    return NextResponse.json({
      success: true,
      message: 'লাইসেন্স কি সফলভাবে আপডেট করা হয়েছে!',
      license: updatedLicense,
    });
  } catch (error: any) {
    console.error('Error updating license key:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'লাইসেন্স কি আপডেট করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

// DELETE: Remove license key
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = params;

    const license = await prisma.licenseKey.findUnique({
      where: { id },
    });

    if (!license) {
      return NextResponse.json({ success: false, error: 'লাইসেন্স কি পাওয়া যায়নি।' }, { status: 404 });
    }

    await prisma.licenseKey.delete({ where: { id } });

    await logActivity({
      userId: auth.user.id,
      action: 'LICENSE_KEY_DELETED',
      description: `লাইসেন্স কি মুছে ফেলা হয়েছে: ${license.key}`,
    });

    return NextResponse.json({
      success: true,
      message: `লাইসেন্স কি ${license.key} সফলভাবে মুছে ফেলা হয়েছে!`,
    });
  } catch (error: any) {
    console.error('Error deleting license key:', error);
    return NextResponse.json(
      { success: false, error: 'লাইসেন্স কি মুছতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
