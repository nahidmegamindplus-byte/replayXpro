import prisma from './db';
import { sendDigitalProductEmail } from './email';
import { serverLogger, logActivity } from './logger';

export interface DeliverDigitalOrderResult {
  success: boolean;
  order?: any;
  error?: string;
}

/**
 * Perform instant digital product delivery via email and chat
 */
export async function deliverDigitalOrder(orderId: string): Promise<DeliverDigitalOrderResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        page: {
          select: {
            id: true,
            pageName: true,
            channel: true,
            channelIdentifier: true,
          },
        },
        user: {
          select: {
            id: true,
            businessName: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: 'অর্ডারটি খুঁজে পাওয়া যায়নি।' };
    }

    // Try finding matching product by productId or name
    let product: any = null;
    if (order.productId) {
      product = await prisma.product.findUnique({
        where: { id: order.productId },
      });
    }

    if (!product) {
      product = await prisma.product.findFirst({
        where: {
          userId: order.userId,
          name: { contains: order.product, mode: 'insensitive' },
        },
      });
    }

    const isDigital = order.productType === 'DIGITAL' || product?.productType === 'DIGITAL';
    if (!isDigital) {
      return { success: false, error: 'এই পণ্যটি ডিজিটাল পণ্য নয় (এটি ফিজিক্যাল পণ্য)।' };
    }

    const targetEmail = order.customerEmail;
    if (!targetEmail || !targetEmail.includes('@')) {
      return {
        success: false,
        error: 'গ্রাহকের কোনো বৈধ ইমেইল অ্যাড্রেস পাওয়া যায়নি। ডিজিটাল ডেলিভারির জন্য ইমেইল আবশ্যক।',
      };
    }

    const businessName = order.page?.pageName || order.user?.businessName || 'আমাদের শপ';
    const digitalFileUrl = product?.digitalFileUrl || null;
    const digitalInstructions = product?.digitalInstructions || null;

    // 1. Send the instant digital product delivery email
    const emailResult = await sendDigitalProductEmail({
      to: targetEmail,
      customerName: order.customerName,
      businessName,
      productName: order.product,
      orderId: order.id,
      digitalFileUrl,
      digitalInstructions,
      supportPhone: order.user?.phone || null,
      supportEmail: order.user?.email || null,
      userId: order.userId,
    });

    // 2. Update Order status
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        productType: 'DIGITAL',
        isDigitalDelivered: true,
        digitalDeliveredAt: new Date(),
        status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
        paymentStatus: 'PAID',
      },
    });

    // 3. Post a confirmation message in the social conversation if available
    if (order.conversationId) {
      try {
        const directDownload = digitalFileUrl ? `\n📥 সরাসরি ডাউনলোড লিংক: ${digitalFileUrl}` : '';
        const accessKey = digitalInstructions ? `\n🔑 অ্যাক্সেস কোড/নির্দেশনা: ${digitalInstructions}` : '';
        const chatNotice = `🎉 আপনার ডিজিটাল পণ্যটি সফলভাবে ডেলিভারি করা হয়েছে!\n\nআমরা আপনার ইমেইল (${targetEmail})-এ বিস্তারিত ডাউনলোড ফাইল এবং অ্যাক্সেস পাঠিয়ে দিয়েছি।${directDownload}${accessKey}\n\nযেকোনো সমস্যায় আমাদের সাথে যোগাযোগ করুন। ধন্যবাদ! 😊`;

        await prisma.message.create({
          data: {
            conversationId: order.conversationId,
            userId: order.userId,
            pageId: order.pageId,
            senderPsid: 'system_auto_delivery',
            direction: 'OUTGOING',
            messageType: 'TEXT',
            messageText: chatNotice,
            aiGenerated: true,
            aiModel: 'system-instant-delivery',
          },
        });

        await prisma.conversation.update({
          where: { id: order.conversationId },
          data: {
            lastMessage: `ডিজিটাল পণ্য (${order.product}) ইমেইলে পাঠানো হয়েছে`,
            lastMessageAt: new Date(),
            followUpStatus: 'ORDER_PLACED',
          },
        });
      } catch (chatErr) {
        serverLogger.warn('[Digital Delivery] Could not post to conversation:', chatErr);
      }
    }

    await logActivity({
      userId: order.userId,
      action: 'DIGITAL_ORDER_DELIVERED',
      description: `অর্ডার #${order.id.slice(0, 8)} (${order.product}) এর ডিজিটাল অ্যাক্সেস সফলভাবে ${targetEmail} এ ডেলিভারি করা হয়েছে।`,
    });

    return { success: true, order: updatedOrder };
  } catch (error: any) {
    serverLogger.error('[Digital Delivery Error]:', error);
    return { success: false, error: error?.message || 'ডিজিটাল পণ্য ডেলিভারিতে সমস্যা হয়েছে।' };
  }
}
