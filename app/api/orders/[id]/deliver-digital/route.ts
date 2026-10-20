import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { deliverDigitalOrder } from '@/lib/digital-delivery';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'অর্ডারটি খুঁজে পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    if (!order.customerEmail) {
      return NextResponse.json(
        { success: false, error: 'গ্রাহকের ইমেইল এড্রেস নেই। অনুগ্রহ করে প্রথমে ইমেইল যুক্ত করুন।' },
        { status: 400 }
      );
    }

    const result = await deliverDigitalOrder(order.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'ডিজিটাল ডেলিভারি পাঠাতে ব্যর্থ হয়েছে।' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ডিজিটাল প্রোডাক্টের ডেলিভারি ইমেইল সফলভাবে পাঠানো হয়েছে!',
      order: result.order,
    });
  } catch (error: any) {
    console.error('Manual digital delivery error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'ডেলিভারি পাঠাতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
