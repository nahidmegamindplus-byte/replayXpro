import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { ensureDatabaseReady } from '@/lib/db-init';
import { safeJsonParse } from '@/lib/json-safe';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    await ensureDatabaseReady();
    const packages = await prisma.package.findMany({
      orderBy: { price: 'asc' },
      include: {
        _count: {
          select: {
            orders: true,
            users: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      packages: packages.map((p) => ({
        ...p,
        features: safeJsonParse(p.features, []),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching admin packages:', error);
    return NextResponse.json(
      { success: false, error: 'প্যাকেজ লোড করতে সমস্যা হয়েছে।' },
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
      name,
      slug,
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

    if (!name || price === undefined) {
      return NextResponse.json({ success: false, error: 'প্যাকেজের নাম এবং মূল্য আবশ্যক।' }, { status: 400 });
    }

    const generatedSlug = slug
      ? slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
      : name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

    const newPackage = await prisma.package.create({
      data: {
        name: name.trim(),
        slug: generatedSlug,
        description: description ? description.trim() : null,
        price: parseFloat(price),
        durationDays: parseInt(durationDays || 30, 10),
        messageLimit: parseInt(messageLimit || 1000, 10),
        pageLimit: parseInt(pageLimit || 1, 10),
        productLimit: parseInt(productLimit || 50, 10),
        features: typeof features === 'string' ? features : JSON.stringify(features || []),
        isPopular: Boolean(isPopular),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    await logActivity({
      userId: auth.user.id,
      action: 'PACKAGE_CREATED',
      description: `নতুন প্যাকেজ তৈরি করা হয়েছে: ${newPackage.name} (৳${newPackage.price})`,
    });

    return NextResponse.json({
      success: true,
      message: 'প্যাকেজ সফলভাবে তৈরি হয়েছে!',
      package: newPackage,
    });
  } catch (error: any) {
    console.error('Error creating package:', error);
    return NextResponse.json(
      { success: false, error: 'প্যাকেজ তৈরি করতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
