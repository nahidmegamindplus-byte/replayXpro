import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const existing = await prisma.product.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'প্রোডাক্টটি খুঁজে পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    const duplicated = await prisma.product.create({
      data: {
        userId: auth.user.id,
        pageId: existing.pageId,
        name: `${existing.name} (কপি)`,
        description: existing.description,
        sku: existing.sku ? `${existing.sku}-COPY` : null,
        category: existing.category,
        price: existing.price,
        discountPrice: existing.discountPrice,
        stockQuantity: existing.stockQuantity,
        stockStatus: existing.stockStatus,
        imageUrl: existing.imageUrl,
        deliveryInfo: existing.deliveryInfo,
        productAiInstructions: existing.productAiInstructions,
        isActive: true,
      },
    });

    await logActivity({
      userId: auth.user.id,
      pageId: duplicated.pageId,
      action: 'PRODUCT_DUPLICATED',
      description: `প্রোডাক্ট ডুপ্লিকেট করা হয়েছে: ${duplicated.name}`,
    });

    return NextResponse.json({
      success: true,
      message: 'প্রোডাক্ট সফলভাবে ডুপ্লিকেট হয়েছে!',
      product: duplicated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'প্রোডাক্ট ডুপ্লিকেট করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
