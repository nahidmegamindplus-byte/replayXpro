import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db-init';
import { safeJsonParse } from '@/lib/json-safe';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureDatabaseReady();
    let packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    // Auto-seed default packages if database is empty
    if (packages.length === 0) {
      await prisma.package.createMany({
        data: [
          {
            id: 'pkg_starter',
            name: 'স্টার্টার প্যাকেজ',
            slug: 'starter',
            description: 'ছোট ব্যবসার জন্য আদর্শ AI অটোমেশন প্যাকেজ',
            price: 990,
            durationDays: 30,
            messageLimit: 1000,
            pageLimit: 1,
            productLimit: 50,
            features: JSON.stringify(['১টি ফেসবুক পেজ অটোমেশন', '১,০০০ চ্যাট অটো-রিপ্লাই', 'বাংলা ও ইংলিশ এআই রিপ্লাই', 'অর্ডার নেওয়ার সুবিধা']),
            isPopular: false,
            isActive: true,
          },
          {
            id: 'pkg_business',
            name: 'বিজনেস প্যাকেজ',
            slug: 'business',
            description: 'মাঝারি সাইজের পেজের জন্য সবচেয়ে জনপ্রিয় প্যাকেজ',
            price: 1990,
            durationDays: 30,
            messageLimit: 3000,
            pageLimit: 3,
            productLimit: 200,
            features: JSON.stringify(['৩টি ফেসবুক পেজ সংযোগ', '৩,০০০ চ্যাট অটো-রিপ্লাই', 'প্রোডাক্ট ছবি দেখে ছবিসহ উত্তর', 'মেসেঞ্জারে অটোমেটিক অর্ডার']),
            isPopular: true,
            isActive: true,
          },
          {
            id: 'pkg_pro',
            name: 'প্রো প্যাকেজ',
            slug: 'pro',
            description: 'বড় ই-কমার্স পেজের জন্য আনলিমিটেড স্কেলিং প্যাকেজ',
            price: 3490,
            durationDays: 30,
            messageLimit: 10000,
            pageLimit: 10,
            productLimit: 1000,
            features: JSON.stringify(['১০টি ফেসবুক পেজ কানেকশন', '১০,০০০ চ্যাট অটো-রিপ্লাই', 'ভয়েস ও টেক্সট দুই চ্যাটেই রিপ্লাই', 'প্রাইওরিটি কাস্টমার সাপোর্ট']),
            isPopular: false,
            isActive: true,
          },
        ],
      });

      packages = await prisma.package.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });
    }

    return NextResponse.json({
      success: true,
      packages: packages.map((p) => ({
        ...p,
        features: safeJsonParse(p.features, []),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching public packages:', error);
    return NextResponse.json(
      { success: false, error: 'প্যাকেজ তালিকা লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
