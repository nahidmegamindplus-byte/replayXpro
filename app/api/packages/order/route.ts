import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db-init';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    await ensureDatabaseReady();
    const body = await req.json();
    const { packageId, paymentMethodId, paymentMethodName, senderNumber, transactionId, paymentProofUrl } = body;

    if (!packageId || !senderNumber || !transactionId) {
      return NextResponse.json(
        { success: false, error: 'অনুগ্রহ করে প্যাকেজ, প্রেরকের নম্বর এবং Transaction ID (TrxID) প্রদান করুন।' },
        { status: 400 }
      );
    }

    const cleanSender = senderNumber.toString().trim();
    const cleanTrx = transactionId.toString().trim().toUpperCase();

    // 1. Locate package by ID, slug, or name (case-insensitive)
    let pkg = await prisma.package.findFirst({
      where: {
        OR: [
          { id: packageId },
          { slug: packageId.toLowerCase() },
          { slug: packageId.toUpperCase() },
          { name: packageId },
        ],
      },
    });

    // If still not found, fallback to first active package
    if (!pkg) {
      pkg = await prisma.package.findFirst({ where: { isActive: true } });
    }

    if (!pkg) {
      return NextResponse.json(
        { success: false, error: 'নির্বাচিত প্যাকেজটি সিস্টেমে পাওয়া যায়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।' },
        { status: 400 }
      );
    }

    // 2. Locate payment method if provided
    let pm = null;
    if (paymentMethodId) {
      pm = await prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } });
    }
    if (!pm && paymentMethodName) {
      pm = await prisma.paymentMethod.findFirst({
        where: {
          OR: [
            { name: paymentMethodName.toUpperCase() },
            { displayName: paymentMethodName },
            { name: paymentMethodName },
          ],
        },
      });
    }

    const finalPaymentMethodName = pm ? pm.displayName : (paymentMethodName || 'bKash (Personal)');
    const finalPaymentMethodId = pm ? pm.id : null;

    // 3. Generate Unique Order Number
    const orderNumber = `PKG-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 4. Create new package order
    const order = await prisma.packageOrder.create({
      data: {
        orderNumber,
        userId: auth.user.id,
        packageId: pkg.id,
        paymentMethodId: finalPaymentMethodId,
        paymentMethodName: finalPaymentMethodName,
        amount: pkg.price,
        senderNumber: cleanSender,
        transactionId: cleanTrx,
        paymentProofUrl: paymentProofUrl || null,
        status: 'PENDING',
      },
      include: {
        package: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            businessName: true,
          },
        },
      },
    });

    // 5. Update user plan status to PENDING_APPROVAL
    await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        planStatus: 'PENDING_APPROVAL',
      },
    });

    await logActivity({
      userId: auth.user.id,
      action: 'PACKAGE_ORDER_SUBMITTED',
      description: `প্যাকেজ অর্ডার সাবমিট করা হয়েছে: ${pkg.name} (৳${pkg.price}) | TrxID: ${cleanTrx}`,
    });

    return NextResponse.json({
      success: true,
      message: 'আপনার প্যাকেজ অর্ডার সফলভাবে জমা হয়েছে! অ্যাডমিন যাচাই করে অনুমোদন দিলে আপনার অ্যাকাউন্ট সক্রিয় হবে।',
      order,
    });
  } catch (error: any) {
    console.error('Error creating package order:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'অর্ডার সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' },
      { status: 500 }
    );
  }
}
