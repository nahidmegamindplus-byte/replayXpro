import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export interface BulkProductItem {
  name: string;
  price: number | string;
  discountPrice?: number | string;
  stockQuantity?: number | string;
  sku?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  deliveryInfo?: string;
  productAiInstructions?: string;
  pageId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const body = await req.json();
    const { products, defaultPageId } = body as { products: BulkProductItem[]; defaultPageId?: string };

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'কোনো প্রোডাক্ট তালিকা প্রদান করা হয়নি।' },
        { status: 400 }
      );
    }

    if (products.length > 500) {
      return NextResponse.json(
        { success: false, error: 'একবারে সর্বোচ্চ ৫০০ টি প্রোডাক্ট আপলোড করা যাবে।' },
        { status: 400 }
      );
    }

    // Check user's package product limit
    const currentCount = await prisma.product.count({
      where: { userId: auth.user.id },
    });

    const activePackage = auth.user.activePackageId
      ? await prisma.package.findUnique({ where: { id: auth.user.activePackageId } })
      : null;
    const productLimit = activePackage?.productLimit || 100;

    if (currentCount + products.length > productLimit) {
      return NextResponse.json(
        {
          success: false,
          error: `আপনার বর্তমান প্যাকেজের প্রোডাক্ট লিমিট (${productLimit} টি) অতিক্রম হচ্ছে। বর্তমানে ${currentCount} টি প্রোডাক্ট আছে। অনুগ্রহ করে প্যাকেজ আপগ্রেড করুন।`,
        },
        { status: 403 }
      );
    }

    // Validate and sanitize products
    const validProducts = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      const rowNum = i + 1;

      if (!item.name || !String(item.name).trim()) {
        errors.push(`সারি ${rowNum}: প্রোডাক্টের নাম ফাঁকা রাখা যাবে না।`);
        continue;
      }

      const numPrice = parseFloat(String(item.price || 0));
      if (isNaN(numPrice) || numPrice < 0) {
        errors.push(`সারি ${rowNum} (${item.name}): মূল্যের মান সঠিক সংখ্যা হতে হবে।`);
        continue;
      }

      const numDiscount = item.discountPrice !== undefined && item.discountPrice !== ''
        ? parseFloat(String(item.discountPrice))
        : null;

      const numStock = parseInt(String(item.stockQuantity ?? 10), 10);
      const stockQuantity = isNaN(numStock) ? 10 : numStock;

      const targetPageId =
        item.pageId && item.pageId !== 'ALL'
          ? item.pageId
          : defaultPageId && defaultPageId !== 'ALL'
          ? defaultPageId
          : null;

      validProducts.push({
        userId: auth.user.id,
        pageId: targetPageId,
        name: String(item.name).trim(),
        price: numPrice,
        discountPrice: numDiscount && !isNaN(numDiscount) ? numDiscount : null,
        stockQuantity,
        stockStatus: stockQuantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
        sku: item.sku ? String(item.sku).trim() : null,
        category: item.category ? String(item.category).trim() : 'অন্যান্য',
        description: item.description ? String(item.description).trim() : null,
        imageUrl: item.imageUrl ? String(item.imageUrl).trim() : null,
        deliveryInfo: item.deliveryInfo ? String(item.deliveryInfo).trim() : null,
        productAiInstructions: item.productAiInstructions ? String(item.productAiInstructions).trim() : null,
        isActive: true,
      });
    }

    if (validProducts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'কোনো বৈধ প্রোডাক্ট পাওয়া যায়নি। ডেটা ঠিকমতো সাজিয়ে আবার চেষ্টা করুন।',
          details: errors,
        },
        { status: 400 }
      );
    }

    // Insert all valid products inside a transaction
    await prisma.product.createMany({
      data: validProducts,
    });

    await logActivity({
      userId: auth.user.id,
      action: 'BULK_PRODUCT_IMPORT',
      description: `${validProducts.length} টি প্রোডাক্ট বাল্ক আপলোডের মাধ্যমে যুক্ত করা হয়েছে।`,
      metadata: { count: validProducts.length, skipped: errors.length },
    });

    return NextResponse.json({
      success: true,
      message: `সফলভাবে ${validProducts.length} টি প্রোডাক্ট আপলোড ও সংরক্ষণ করা হয়েছে!`,
      importedCount: validProducts.length,
      skippedCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'বাল্ক প্রোডাক্ট আপলোড প্রক্রিয়ায় সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
