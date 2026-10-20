import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db-init';
import { hashPassword, signToken, AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseReady();

    const body = await req.json();
    const { key, businessName, fullName, phone, facebookPageUrl } = body;

    if (!key || typeof key !== 'string' || key.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'অনুগ্রহ করে একটি বৈধ লাইসেন্স কি (License Key) প্রদান করুন।' },
        { status: 400 }
      );
    }

    const cleanKey = key.trim().toUpperCase();

    // 1. Locate License Key in Database
    const license = await prisma.licenseKey.findUnique({
      where: { key: cleanKey },
      include: {
        package: true,
        usedByUser: true,
      },
    });

    if (!license) {
      return NextResponse.json(
        { success: false, error: 'লাইসেন্স কি-টি সঠিক নয়। অনুগ্রহ করে অ্যাডমিনের দেওয়া সঠিক কি প্রদান করুন।' },
        { status: 404 }
      );
    }

    if (license.status === 'REVOKED') {
      return NextResponse.json(
        { success: false, error: 'এই লাইসেন্স কি-টি অ্যাডমিন কর্তৃক বাতিল (Revoked) করা হয়েছে।' },
        { status: 403 }
      );
    }

    if (license.status === 'EXPIRED') {
      return NextResponse.json(
        { success: false, error: 'এই লাইসেন্স কি-টির মেয়াদ উত্তীর্ণ হয়েছে।' },
        { status: 403 }
      );
    }

    // Calculate expiry date
    const durationDays = license.durationDays || 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    let user: any = null;

    // 2. If license was already used by a user, log them in directly
    if (license.usedByUserId && license.usedByUser) {
      user = await prisma.user.update({
        where: { id: license.usedByUserId },
        data: {
          planStatus: 'ACTIVE',
          plan: license.plan,
          activePackageId: license.packageId,
          monthlyMessageLimit: license.messageLimit,
          planExpiresAt: expiresAt,
          businessName: businessName?.trim() || license.usedByUser.businessName,
          facebookPageUrl: facebookPageUrl?.trim() || license.usedByUser.facebookPageUrl,
        },
      });
    } else {
      // 3. Auto-provision a new user without asking for complicated registration
      const keySuffix = cleanKey.replace(/[^A-Z0-9]/g, '').slice(-8).toLowerCase();
      const generatedEmail = `user_${keySuffix}@replyx.ai`;
      const clientName = fullName?.trim() || license.clientName || `Client ${keySuffix.toUpperCase()}`;
      const clientBusiness = businessName?.trim() || `Business ${keySuffix.toUpperCase()}`;
      const randomPassword = `pwd_${Date.now()}_${keySuffix}`;
      const passwordHash = await hashPassword(randomPassword);

      // Check if email somehow exists
      let existing = await prisma.user.findUnique({ where: { email: generatedEmail } });
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: {
            planStatus: 'ACTIVE',
            plan: license.plan,
            activePackageId: license.packageId,
            monthlyMessageLimit: license.messageLimit,
            planExpiresAt: expiresAt,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            fullName: clientName,
            businessName: clientBusiness,
            facebookPageUrl: facebookPageUrl?.trim() || null,
            phone: phone?.trim() || license.clientPhone || null,
            email: generatedEmail,
            passwordHash,
            role: 'USER',
            status: 'ACTIVE',
            plan: license.plan,
            planStatus: 'ACTIVE',
            monthlyMessageLimit: license.messageLimit,
            planExpiresAt: expiresAt,
            activePackageId: license.packageId,
          },
        });
      }

      // 4. Mark license as USED and link to user
      await prisma.licenseKey.update({
        where: { id: license.id },
        data: {
          status: 'USED',
          usedByUserId: user.id,
          usedAt: new Date(),
          expiresAt: expiresAt,
          clientName: clientName,
          clientPhone: phone?.trim() || license.clientPhone || null,
        },
      });

      // Create default AI settings for user
      try {
        await prisma.aiSetting.upsert({
          where: { userId_provider: { userId: user.id, provider: 'GEMINI' } },
          update: {},
          create: {
            userId: user.id,
            provider: 'GEMINI',
            model: 'gemini-1.5-flash',
            temperature: 0.7,
            maxTokens: 800,
          },
        });
      } catch (e) {}
    }

    await logActivity({
      userId: user.id,
      action: 'LICENSE_ACTIVATED',
      description: `লাইসেন্স কি সফলভাবে সক্রিয় করা হয়েছে: ${cleanKey} (${license.plan} - ${durationDays} দিন)`,
    });

    // 5. Sign JWT session token
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: `অভিনন্দন! আপনার ${license.plan} লাইসেন্স কি সফলভাবে সক্রিয় হয়েছে! ড্যাশবোর্ডে প্রবেশ করা হচ্ছে...`,
      redirectUrl: '/dashboard',
      user: {
        id: user.id,
        fullName: user.fullName,
        businessName: user.businessName,
        email: user.email,
        plan: user.plan,
        planStatus: user.planStatus,
        planExpiresAt: user.planExpiresAt,
      },
    });

    // 6. Set HTTP-Only Cookie
    response.cookies.set({
      ...getAuthCookieOptions(req),
      value: token,
    });

    return response;
  } catch (error: any) {
    console.error('Error activating license key:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'লাইসেন্স কি সক্রিয় করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
