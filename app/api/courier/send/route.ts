import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { createSteadfastOrder, getPathaoAccessToken, createPathaoOrder, getPathaoStores } from '@/lib/courier';
import { logActivity } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const body = await req.json();
    const { orderId, provider, customNote, storeId } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID প্রদান করা হয়নি।' }, { status: 400 });
    }

    // 1. Fetch Order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { page: true },
    });

    if (!order || order.userId !== auth.user.id) {
      return NextResponse.json({ success: false, error: 'অর্ডারটি খুঁজে পাওয়া যায়নি।' }, { status: 404 });
    }

    if (order.courierTrackingCode) {
      return NextResponse.json({
        success: false,
        error: `এই অর্ডারটি ইতোমধ্যে ${order.courierName || 'কুরিয়ারে'} পাঠানো হয়েছে। ট্র্যাকিং কোড: ${order.courierTrackingCode}`,
      }, { status: 400 });
    }

    // 2. Fetch User's Courier Setting
    const courierSetting = await prisma.courierSetting.findUnique({
      where: { userId: auth.user.id },
    });

    if (!courierSetting) {
      return NextResponse.json({
        success: false,
        error: 'কোনো কুরিয়ার কনফিগার করা নেই। সেটিংস পেজ থেকে Steadfast বা Pathao যুক্ত করুন।',
      }, { status: 400 });
    }

    const selectedProvider = (provider || courierSetting.provider || 'STEADFAST').toUpperCase();
    const invoiceNumber = `RPLX-${order.id.slice(0, 8).toUpperCase()}`;
    const codAmount = order.totalPrice > 0 ? order.totalPrice : order.price * (order.quantity || 1);
    const noteText = customNote || order.notes || `${order.product} x ${order.quantity}`;

    // -----------------------------------------------------------------
    // CASE A: DISPATCH TO PATHAO COURIER
    // -----------------------------------------------------------------
    if (selectedProvider === 'PATHAO') {
      if (
        !courierSetting.pathaoClientIdEncrypted ||
        !courierSetting.pathaoClientSecretEncrypted ||
        !courierSetting.pathaoUsernameEncrypted ||
        !courierSetting.pathaoPasswordEncrypted
      ) {
        return NextResponse.json({
          success: false,
          error: 'Pathao Courier ক্রেডেনশিয়াল সেট করা নেই। সেটিংস থেকে Pathao API তথ্য যুক্ত করুন।',
        }, { status: 400 });
      }

      const tokenRes = await getPathaoAccessToken({
        clientId: decrypt(courierSetting.pathaoClientIdEncrypted),
        clientSecret: decrypt(courierSetting.pathaoClientSecretEncrypted),
        username: decrypt(courierSetting.pathaoUsernameEncrypted),
        password: decrypt(courierSetting.pathaoPasswordEncrypted),
      });

      if (!tokenRes.success || !tokenRes.accessToken) {
        return NextResponse.json({
          success: false,
          error: tokenRes.error || 'Pathao লগইন ব্যর্থ হয়েছে। ক্রেডেনশিয়াল চেক করুন।',
        }, { status: 401 });
      }

      let targetStoreId = storeId || courierSetting.pathaoStoreId;
      if (!targetStoreId) {
        const storesRes = await getPathaoStores(tokenRes.accessToken);
        if (storesRes.success && storesRes.stores && storesRes.stores.length > 0) {
          targetStoreId = storesRes.stores[0].store_id;
        } else {
          return NextResponse.json({
            success: false,
            error: 'Pathao অ্যাকাউন্টে কোনো স্টোর/ওয়্যারহাউজ পাওয়া যায়নি। Pathao পোর্টালে স্টোর তৈরি করুন।',
          }, { status: 400 });
        }
      }

      const pathaoRes = await createPathaoOrder({
        accessToken: tokenRes.accessToken,
        storeId: targetStoreId,
        merchantOrderId: invoiceNumber,
        recipientName: order.customerName,
        recipientPhone: order.phone,
        recipientAddress: order.address,
        codAmount,
        itemQuantity: order.quantity || 1,
        itemDescription: order.product || 'E-commerce Item',
        specialInstruction: noteText,
      });

      if (!pathaoRes.success || !pathaoRes.consignmentId) {
        return NextResponse.json({
          success: false,
          error: pathaoRes.error || 'Pathao-তে পার্সেল বুকিং ব্যর্থ হয়েছে।',
        }, { status: 502 });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          courierName: 'PATHAO',
          courierConsignmentId: pathaoRes.consignmentId,
          courierTrackingCode: pathaoRes.consignmentId,
          courierStatus: pathaoRes.orderStatus || 'Pending',
          courierSentAt: new Date(),
          status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
        },
      });

      await logActivity({
        userId: auth.user.id,
        pageId: order.pageId,
        action: 'COURIER_DISPATCHED',
        description: `অর্ডার ${invoiceNumber} Pathao কুরিয়ারে বুকিং দেওয়া হয়েছে। ট্র্যাকিং: ${pathaoRes.consignmentId}`,
        metadata: { orderId: order.id, provider: 'PATHAO', consignmentId: pathaoRes.consignmentId },
      });

      return NextResponse.json({
        success: true,
        message: 'অর্ডারটি সফলভাবে Pathao কুরিয়ারে বুকিং দেওয়া হয়েছে!',
        courierName: 'PATHAO',
        trackingCode: pathaoRes.consignmentId,
        consignmentId: pathaoRes.consignmentId,
        courierStatus: pathaoRes.orderStatus || 'Pending',
        deliveryFee: pathaoRes.deliveryFee,
        order: updatedOrder,
      });
    }

    // -----------------------------------------------------------------
    // CASE B: DISPATCH TO STEADFAST COURIER (DEFAULT)
    // -----------------------------------------------------------------
    const sfApiKey = courierSetting.steadfastApiKeyEncrypted || courierSetting.apiKeyEncrypted;
    const sfSecretKey = courierSetting.steadfastSecretKeyEncrypted || courierSetting.secretKeyEncrypted;

    if (!sfApiKey || !sfSecretKey) {
      return NextResponse.json({
        success: false,
        error: 'Steadfast Courier কনফিগার করা নেই। সেটিংস পেজ থেকে API Key ও Secret Key সেট করুন।',
      }, { status: 400 });
    }

    const apiKey = decrypt(sfApiKey);
    const secretKey = decrypt(sfSecretKey);

    const courierResult = await createSteadfastOrder({
      apiKey,
      secretKey,
      invoice: invoiceNumber,
      recipientName: order.customerName,
      recipientPhone: order.phone,
      recipientAddress: order.address,
      codAmount,
      note: noteText,
    });

    if (!courierResult.success) {
      return NextResponse.json({
        success: false,
        error: courierResult.error || 'Steadfast-এ অর্ডার পাঠানো সম্ভব হয়নি।',
      }, { status: 502 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        courierName: 'STEADFAST',
        courierConsignmentId: courierResult.consignmentId,
        courierTrackingCode: courierResult.trackingCode,
        courierStatus: courierResult.status || 'in_review',
        courierSentAt: new Date(),
        status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
      },
    });

    await logActivity({
      userId: auth.user.id,
      pageId: order.pageId,
      action: 'COURIER_DISPATCHED',
      description: `অর্ডার ${invoiceNumber} Steadfast কুরিয়ারে বুকিং দেওয়া হয়েছে। ট্র্যাকিং: ${courierResult.trackingCode}`,
      metadata: { orderId: order.id, provider: 'STEADFAST', trackingCode: courierResult.trackingCode },
    });

    return NextResponse.json({
      success: true,
      message: 'অর্ডারটি সফলভাবে Steadfast কুরিয়ারে বুকিং দেওয়া হয়েছে!',
      courierName: 'STEADFAST',
      trackingCode: courierResult.trackingCode,
      consignmentId: courierResult.consignmentId,
      courierStatus: courierResult.status,
      order: updatedOrder,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'কুরিয়ারে অর্ডার পাঠাতে ত্রুটি হয়েছে।' },
      { status: 500 }
    );
  }
}
