import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db-init';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import crypto from 'crypto';

function generateFormattedKey(prefix = 'RPLX', plan = 'BIZ'): string {
  const cleanPlan = plan.substring(0, 4).toUpperCase();
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${cleanPlan}-${part1}-${part2}`;
}

// GET all license keys
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    await ensureDatabaseReady();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const licenses = await prisma.licenseKey.findMany({
      where,
      include: {
        package: {
          select: {
            id: true,
            name: true,
            price: true,
            slug: true,
          },
        },
        usedByUser: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
            facebookPageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const [total, active, used, expired, revoked] = await Promise.all([
      prisma.licenseKey.count(),
      prisma.licenseKey.count({ where: { status: 'ACTIVE' } }),
      prisma.licenseKey.count({ where: { status: 'USED' } }),
      prisma.licenseKey.count({ where: { status: 'EXPIRED' } }),
      prisma.licenseKey.count({ where: { status: 'REVOKED' } }),
    ]);

    return NextResponse.json({
      success: true,
      licenses,
      counts: { total, active, used, expired, revoked },
    });
  } catch (error: any) {
    console.error('Error fetching license keys:', error);
    return NextResponse.json(
      { success: false, error: 'লাইসেন্স কি তালিকা লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

// POST: Generate single or bulk license keys
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    await ensureDatabaseReady();

    const body = await req.json();
    const {
      packageId,
      plan = 'BUSINESS',
      durationDays = 30,
      messageLimit = 3000,
      pageLimit = 3,
      productLimit = 200,
      count = 1,
      clientName,
      clientPhone,
      clientNote,
      customPrefix = 'RPLX',
    } = body;

    const numKeys = Math.min(Math.max(parseInt(count) || 1, 1), 50); // limit 1 to 50

    // Fetch package if provided
    let targetPkg: any = null;
    if (packageId) {
      targetPkg = await prisma.package.findUnique({ where: { id: packageId } });
    }

    const finalPlan = targetPkg ? targetPkg.slug.toUpperCase() : (plan || 'BUSINESS').toUpperCase();
    const finalDuration = targetPkg ? targetPkg.durationDays : (parseInt(durationDays) || 30);
    const finalMessageLimit = targetPkg ? targetPkg.messageLimit : (parseInt(messageLimit) || 3000);
    const finalPageLimit = targetPkg ? targetPkg.pageLimit : (parseInt(pageLimit) || 3);
    const finalProductLimit = targetPkg ? targetPkg.productLimit : (parseInt(productLimit) || 200);

    const generatedKeys: any[] = [];

    for (let i = 0; i < numKeys; i++) {
      let uniqueKey = generateFormattedKey(customPrefix || 'RPLX', finalPlan);
      
      // Ensure key uniqueness
      let exists = await prisma.licenseKey.findUnique({ where: { key: uniqueKey } });
      while (exists) {
        uniqueKey = generateFormattedKey(customPrefix || 'RPLX', finalPlan);
        exists = await prisma.licenseKey.findUnique({ where: { key: uniqueKey } });
      }

      const license = await prisma.licenseKey.create({
        data: {
          key: uniqueKey,
          plan: finalPlan,
          packageId: targetPkg ? targetPkg.id : null,
          durationDays: finalDuration,
          messageLimit: finalMessageLimit,
          pageLimit: finalPageLimit,
          productLimit: finalProductLimit,
          clientName: clientName ? clientName.trim() : null,
          clientPhone: clientPhone ? clientPhone.trim() : null,
          clientNote: clientNote ? clientNote.trim() : null,
          status: 'ACTIVE',
        },
      });

      generatedKeys.push(license);
    }

    await logActivity({
      userId: auth.user.id,
      action: 'LICENSE_KEYS_GENERATED',
      description: `${numKeys}টি ${finalPlan} লাইসেন্স কি তৈরি করা হয়েছে (${finalDuration} দিন, ${finalMessageLimit} মেসেজ)`,
    });

    return NextResponse.json({
      success: true,
      message: `${numKeys}টি নতুন লাইসেন্স কি সফলভাবে তৈরি করা হয়েছে!`,
      keys: generatedKeys,
    });
  } catch (error: any) {
    console.error('Error generating license keys:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'লাইসেন্স কি তৈরি করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
