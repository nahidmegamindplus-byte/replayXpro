import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import {
  testFacebookConnection,
  testWhatsAppConnection,
  testInstagramConnection,
  testXConnection,
  testTelegramConnection,
  SocialChannel,
} from '@/lib/social';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const page = await prisma.page.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id,
      },
    });

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'চ্যানেলটি খুঁজে পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    const channel = (page.channel || 'FACEBOOK') as SocialChannel;
    const accessToken = decrypt(page.pageAccessTokenEncrypted);
    const identifier = page.channelIdentifier || page.facebookPageId;

    let testResult: { success: boolean; id?: string; name?: string; username?: string; error?: string } = {
      success: false,
    };

    if (channel === 'WHATSAPP') {
      testResult = await testWhatsAppConnection(identifier, accessToken);
    } else if (channel === 'INSTAGRAM') {
      testResult = await testInstagramConnection(identifier, accessToken);
    } else if (channel === 'X') {
      testResult = await testXConnection(accessToken);
    } else if (channel === 'TELEGRAM') {
      testResult = await testTelegramConnection(accessToken);
    } else {
      testResult = await testFacebookConnection(identifier, accessToken);
    }

    if (testResult.success) {
      const updateData: any = {
        connectionStatus: 'CONNECTED',
        pageName: testResult.name || page.pageName,
        pageUsername: testResult.username || page.pageUsername,
      };

      if (testResult.id && testResult.id !== page.facebookPageId) {
        updateData.facebookPageId = testResult.id;
        updateData.channelIdentifier = testResult.id;
      }

      await prisma.page.update({
        where: { id: page.id },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        connectionStatus: 'CONNECTED',
        message: `${channel} চ্যানেল সফলভাবে কানেক্টেড! API এক্সেস সক্রিয় আছে।`,
        pageName: testResult.name,
        pageUsername: testResult.username,
        facebookPageId: testResult.id || page.facebookPageId,
      });
    } else {
      await prisma.page.update({
        where: { id: page.id },
        data: {
          connectionStatus: 'DISCONNECTED',
        },
      });

      return NextResponse.json({
        success: false,
        connectionStatus: 'DISCONNECTED',
        error:
          testResult.error ||
          `${channel} সংযোগে ব্যর্থ হয়েছে। অনুগ্রহ করে চ্যানেল সেটিংস থেকে Token ও ID যাচাই করুন।`,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'কানেকশন টেস্ট প্রক্রিয়ায় ত্রুটি ঘটেছে।' },
      { status: 500 }
    );
  }
}
