import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { ensureDatabaseReady } from '@/lib/db-init';
import { parseFlexibleNumber, parseFlexibleInt } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    await ensureDatabaseReady();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const stockStatus = searchParams.get('stockStatus') || '';
    const pageId = searchParams.get('pageId') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = { userId: auth.user.id };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } },
        { category: { contains: search } },
      ];
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (stockStatus && stockStatus !== 'ALL') {
      where.stockStatus = stockStatus;
    }

    if (pageId && pageId !== 'ALL') {
      where.pageId = pageId;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          page: {
            select: {
              id: true,
              pageName: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Distinct categories for filter
    const distinctCategories = await prisma.product.findMany({
      where: { userId: auth.user.id, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });

    const categories = distinctCategories.map((c) => c.category).filter(Boolean) as string[];

    const parsedProducts = products.map((p) => {
      let imagesList: string[] = [];
      if (p.images) {
        try {
          imagesList = JSON.parse(p.images);
        } catch (_) {}
      }
      if (imagesList.length === 0 && p.imageUrl) {
        imagesList = [p.imageUrl];
      }
      return {
        ...p,
        images: imagesList,
      };
    });

    return NextResponse.json({
      success: true,
      products: parsedProducts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      categories,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'প্রোডাক্ট তালিকা লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    await ensureDatabaseReady();
    const body = await req.json();
    const {
      name,
      description,
      sku,
      category,
      price,
      discountPrice,
      stockQuantity,
      stockStatus,
      imageUrl,
      images,
      deliveryInfo,
      productAiInstructions,
      pageId,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'পণ্যের নাম আবশ্যক।' },
        { status: 400 }
      );
    }

    const numericPrice = parseFlexibleNumber(price, -1);
    if (numericPrice < 0) {
      return NextResponse.json(
        { success: false, error: 'সঠিক মূল্য (দাম) প্রদান করুন।' },
        { status: 400 }
      );
    }

    const numericDiscount = discountPrice ? parseFlexibleNumber(discountPrice, 0) : null;
    const numericQty = parseFlexibleInt(stockQuantity, 10);

    // Validate pageId to avoid foreign key errors
    let validPageId: string | null = null;
    if (pageId && pageId !== 'ALL') {
      const pageExists = await prisma.page.findFirst({
        where: { id: pageId, userId: auth.user.id },
        select: { id: true },
      });
      if (pageExists) {
        validPageId = pageExists.id;
      }
    }

    let cleanImagesArray: string[] = [];
    if (Array.isArray(images)) {
      cleanImagesArray = images.filter((img) => typeof img === 'string' && img.trim().length > 0);
    } else if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0) {
      cleanImagesArray = [imageUrl.trim()];
    }

    const primaryImageUrl = cleanImagesArray.length > 0 ? cleanImagesArray[0] : (imageUrl ? imageUrl.trim() : null);

    const product = await prisma.product.create({
      data: {
        userId: auth.user.id,
        pageId: validPageId,
        name: name.trim(),
        description: description ? description.trim() : null,
        sku: sku ? sku.trim() : null,
        category: category ? category.trim() : null,
        price: numericPrice,
        discountPrice: numericDiscount && numericDiscount > 0 ? numericDiscount : null,
        stockQuantity: numericQty >= 0 ? numericQty : 0,
        stockStatus: stockStatus || (numericQty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'),
        imageUrl: primaryImageUrl,
        images: cleanImagesArray.length > 0 ? JSON.stringify(cleanImagesArray) : null,
        deliveryInfo: deliveryInfo ? deliveryInfo.trim() : null,
        productAiInstructions: productAiInstructions ? productAiInstructions.trim() : null,
        isActive: true,
      },
    });

    await logActivity({
      userId: auth.user.id,
      pageId: product.pageId,
      action: 'PRODUCT_CREATED',
      description: `নতুন প্রোডাক্ট যুক্ত করা হয়েছে: ${product.name} (দাম: ${product.price} টাকা)`,
    });

    return NextResponse.json({
      success: true,
      message: 'প্রোডাক্ট সফলভাবে যুক্ত হয়েছে!',
      product,
    });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'প্রোডাক্ট যুক্ত করতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
