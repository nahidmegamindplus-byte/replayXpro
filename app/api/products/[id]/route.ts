import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { parseFlexibleNumber, parseFlexibleInt } from '@/lib/format';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id,
      },
      include: {
        page: {
          select: {
            id: true,
            pageName: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'প্রোডাক্টটি খুঁজে পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    let imagesList: string[] = [];
    if (product.images) {
      try {
        imagesList = JSON.parse(product.images);
      } catch (_) {}
    }
    if (imagesList.length === 0 && product.imageUrl) {
      imagesList = [product.imageUrl];
    }

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        images: imagesList,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'প্রোডাক্ট লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'প্রোডাক্টটি খুঁজে পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description ? body.description.trim() : null;
    if (body.sku !== undefined) updateData.sku = body.sku ? body.sku.trim() : null;
    if (body.category !== undefined) updateData.category = body.category ? body.category.trim() : null;
    if (body.price !== undefined) {
      const p = parseFlexibleNumber(body.price, -1);
      if (p >= 0) updateData.price = p;
    }
    if (body.discountPrice !== undefined) {
      const d = parseFlexibleNumber(body.discountPrice, 0);
      updateData.discountPrice = d > 0 ? d : null;
    }
    if (body.stockQuantity !== undefined) {
      updateData.stockQuantity = Math.max(0, parseFlexibleInt(body.stockQuantity, 0));
    }
    if (body.stockStatus !== undefined) updateData.stockStatus = body.stockStatus;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl ? body.imageUrl.trim() : null;
    if (body.images !== undefined) {
      if (Array.isArray(body.images)) {
        const cleanList = body.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
        updateData.images = cleanList.length > 0 ? JSON.stringify(cleanList) : null;
        if (cleanList.length > 0 && (!body.imageUrl || body.imageUrl === '')) {
          updateData.imageUrl = cleanList[0];
        }
      } else if (body.images === null) {
        updateData.images = null;
      }
    }
    if (body.deliveryInfo !== undefined) updateData.deliveryInfo = body.deliveryInfo ? body.deliveryInfo.trim() : null;
    if (body.productAiInstructions !== undefined) updateData.productAiInstructions = body.productAiInstructions ? body.productAiInstructions.trim() : null;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.pageId !== undefined) {
      if (body.pageId && body.pageId !== 'ALL') {
        const pExists = await prisma.page.findFirst({
          where: { id: body.pageId, userId: auth.user.id },
          select: { id: true },
        });
        updateData.pageId = pExists ? pExists.id : null;
      } else {
        updateData.pageId = null;
      }
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
    });

    await logActivity({
      userId: auth.user.id,
      pageId: updated.pageId,
      action: 'PRODUCT_UPDATED',
      description: `প্রোডাক্ট তথ্য আপডেট করা হয়েছে: ${updated.name}`,
    });

    return NextResponse.json({
      success: true,
      message: 'প্রোডাক্ট সফলভাবে আপডেট হয়েছে!',
      product: updated,
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'প্রোডাক্ট আপডেট করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'প্রোডাক্টটি খুঁজে পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    await prisma.product.delete({
      where: { id: params.id },
    });

    await logActivity({
      userId: auth.user.id,
      pageId: product.pageId,
      action: 'PRODUCT_DELETED',
      description: `প্রোডাক্ট মুছে ফেলা হয়েছে: ${product.name}`,
    });

    return NextResponse.json({
      success: true,
      message: 'প্রোডাক্ট মুছে ফেলা হয়েছে।',
    });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: 'প্রোডাক্ট মুছতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
