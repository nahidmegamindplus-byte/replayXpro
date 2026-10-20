import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { getSteadfastDeliveryStatus, getPathaoAccessToken, getPathaoDeliveryStatus } from '@/lib/courier';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const trackingCode = searchParams.get('trackingCode');

    if (!orderId && !trackingCode) {
      return NextResponse.json({ success: false, error: 'Order ID বা Tracking Code প্রয়োজন।' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        userId: auth.user.id,
        ...(orderId ? { id: orderId } : {}),
        ...(trackingCode ? { courierTrackingCode: trackingCode } : {}),
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'অর্ডারটি খুঁজে পাওয়া যায়নি।' }, { status: 404 });
    }

    if (!order.courierTrackingCode && !order.courierConsignmentId) {
      return NextResponse.json({
        success: false,
        error: 'এই অর্ডারটি এখনো কোনো কুরিয়ারে বুকিং দেওয়া হয়নি।',
      }, { status: 400 });
    }

    const courierSetting = await prisma.courierSetting.findUnique({
      where: { userId: auth.user.id },
    });

    if (!courierSetting) {
      return NextResponse.json({ success: false, error: 'কুরিয়ার ক্রেডেনশিয়াল পাওয়া যায়নি।' }, { status: 400 });
    }

    let deliveryStatus = 'Pending';
    const provider = (order.courierName || courierSetting.provider || 'STEADFAST').toUpperCase();

    // 1. Pathao Status Check
    if (provider === 'PATHAO') {
      if (
        !courierSetting.pathaoClientIdEncrypted ||
        !courierSetting.pathaoClientSecretEncrypted ||
        !courierSetting.pathaoUsernameEncrypted ||
        !courierSetting.pathaoPasswordEncrypted
      ) {
        return NextResponse.json({ success: false, error: 'Pathao ক্রেডেনশিয়াল পাওয়া যায়নি।' }, { status: 400 });
      }

      const tokenRes = await getPathaoAccessToken({
        clientId: decrypt(courierSetting.pathaoClientIdEncrypted),
        clientSecret: decrypt(courierSetting.pathaoClientSecretEncrypted),
        username: decrypt(courierSetting.pathaoUsernameEncrypted),
        password: decrypt(courierSetting.pathaoPasswordEncrypted),
      });

      if (!tokenRes.success || !tokenRes.accessToken) {
        return NextResponse.json({ success: false, error: 'Pathao টোকেন সংগ্রহ ব্যর্থ হয়েছে।' }, { status: 401 });
      }

      const targetConsignment = order.courierConsignmentId || order.courierTrackingCode!;
      const pathaoStatus = await getPathaoDeliveryStatus(tokenRes.accessToken, targetConsignment);

      if (!pathaoStatus.success) {
        return NextResponse.json({ success: false, error: pathaoStatus.error }, { status: 502 });
      }

      deliveryStatus = pathaoStatus.deliveryStatus || 'Pending';
    } else {
      // 2. Steadfast Status Check
      const sfApiKey = courierSetting.steadfastApiKeyEncrypted || courierSetting.apiKeyEncrypted;
      const sfSecretKey = courierSetting.steadfastSecretKeyEncrypted || courierSetting.secretKeyEncrypted;

      if (!sfApiKey || !sfSecretKey) {
        return NextResponse.json({ success: false, error: 'Steadfast ক্রেডেনশিয়াল পাওয়া যায়নি।' }, { status: 400 });
      }

      const statusRes = await getSteadfastDeliveryStatus({
        apiKey: decrypt(sfApiKey),
        secretKey: decrypt(sfSecretKey),
        consignmentId: order.courierConsignmentId,
        trackingCode: order.courierTrackingCode,
      });

      if (!statusRes.success) {
        return NextResponse.json({ success: false, error: statusRes.error || 'কুরিয়ার স্ট্যাটাস লোড করা যায়নি।' }, { status: 502 });
      }

      deliveryStatus = statusRes.deliveryStatus || 'in_review';
    }

    // Map delivery status to Order status
    let mappedStatus = order.status;
    const rawDeliveryStatus = deliveryStatus.toLowerCase();

    if (rawDeliveryStatus.includes('delivered')) {
      mappedStatus = 'DELIVERED';
    } else if (rawDeliveryStatus.includes('cancelled') || rawDeliveryStatus.includes('returned')) {
      mappedStatus = 'CANCELLED';
    } else if (rawDeliveryStatus.includes('delivering') || rawDeliveryStatus.includes('in_transit')) {
      mappedStatus = 'PROCESSING';
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        courierStatus: deliveryStatus,
        status: mappedStatus,
      },
    });

    return NextResponse.json({
      success: true,
      deliveryStatus,
      order: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'কুরিয়ার স্ট্যাটাস চেক করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
