import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ensureDatabaseReady } from '@/lib/db-init';
import { logActivity } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    await ensureDatabaseReady();
    const adminAuth = await requireAdmin(req);
    if ('response' in adminAuth) return adminAuth.response;

    const blockedIps = await prisma.ipBlockList.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      blockedIps,
    });
  } catch (error: any) {
    console.error('Error fetching blocked IPs:', error);
    return NextResponse.json(
      { success: false, error: 'আইপি ব্লক তালিকা লোড করতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseReady();
    const adminAuth = await requireAdmin(req);
    if ('response' in adminAuth) return adminAuth.response;

    const body = await req.json();
    const { ipAddress, reason, blockUserWithIp } = body;

    if (!ipAddress || typeof ipAddress !== 'string' || !ipAddress.trim()) {
      return NextResponse.json(
        { success: false, error: 'বৈধ আইপি ঠিকানা প্রদান করুন।' },
        { status: 400 }
      );
    }

    const cleanIp = ipAddress.trim();

    // Create or update IP block
    const record = await prisma.ipBlockList.upsert({
      where: { ipAddress: cleanIp },
      update: {
        reason: reason || 'অ্যাডমিন দ্বারা ব্লক করা হয়েছে',
        blockedBy: adminAuth.user.email,
        updatedAt: new Date(),
      },
      create: {
        ipAddress: cleanIp,
        reason: reason || 'অ্যাডমিন দ্বারা ব্লক করা হয়েছে',
        blockedBy: adminAuth.user.email,
      },
    });

    // Optionally also mark users with this registration or login IP as isBlocked
    if (blockUserWithIp) {
      await prisma.user.updateMany({
        where: {
          OR: [
            { registrationIp: cleanIp },
            { lastLoginIp: cleanIp },
          ],
        },
        data: {
          isBlocked: true,
        },
      });
    }

    await logActivity({
      userId: adminAuth.user.id,
      action: 'ADMIN_IP_BLOCKED',
      description: `আইপি ঠিকানা ব্লক করা হয়েছে: ${cleanIp} (কারণ: ${reason || 'অ্যাডমিন একশন'})`,
    });

    return NextResponse.json({
      success: true,
      message: `আইপি (${cleanIp}) সফলভাবে ব্লক করা হয়েছে!`,
      record,
    });
  } catch (error: any) {
    console.error('Error blocking IP:', error);
    return NextResponse.json(
      { success: false, error: 'আইপি ব্লক করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureDatabaseReady();
    const adminAuth = await requireAdmin(req);
    if ('response' in adminAuth) return adminAuth.response;

    const { searchParams } = new URL(req.url);
    const ipAddress = searchParams.get('ipAddress');
    const id = searchParams.get('id');

    if (!ipAddress && !id) {
      return NextResponse.json(
        { success: false, error: 'আইপি বা রেকর্ড আইডি প্রয়োজন।' },
        { status: 400 }
      );
    }

    if (id) {
      await prisma.ipBlockList.delete({ where: { id } });
    } else if (ipAddress) {
      await prisma.ipBlockList.deleteMany({ where: { ipAddress: ipAddress.trim() } });
    }

    await logActivity({
      userId: adminAuth.user.id,
      action: 'ADMIN_IP_UNBLOCKED',
      description: `আইপি ঠিকানা আনব্লক করা হয়েছে: ${ipAddress || id}`,
    });

    return NextResponse.json({
      success: true,
      message: 'আইপি সফলভাবে আনব্লক করা হয়েছে!',
    });
  } catch (error: any) {
    console.error('Error unblocking IP:', error);
    return NextResponse.json(
      { success: false, error: 'আইপি আনব্লক করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
