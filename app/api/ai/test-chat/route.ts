import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { generateAIReply } from '@/lib/ai';
import { checkUserSubscriptionAndAiEligibility } from '@/lib/subscription-guard';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  // Subscription check
  const subCheck = await checkUserSubscriptionAndAiEligibility(auth.user.id);
  if (!subCheck.eligible) {
    let msg = 'আপনার সাবস্ক্রিপশন প্যাকেজের মেয়াদ শেষ অথবা নিষ্ক্রিয় থাকায় AI চ্যাট বন্ধ রয়েছে। প্যাকেজ রিনিউ করুন।';
    if (subCheck.reason === 'MESSAGE_LIMIT_REACHED') {
      msg = 'আপনার মাসিক AI মেসেজ কোটা শেষ হয়ে গেছে। নতুন প্যাকেজ আপগ্রেড করুন।';
    } else if (subCheck.reason === 'PLAN_EXPIRED') {
      msg = 'আপনার প্যাকেজের মেয়াদ উত্তীর্ণ হয়ে গেছে। অনুগ্রহ করে প্যাকেজ রিনিউ করুন।';
    } else if (subCheck.reason === 'AI_CHAT_DISABLED') {
      msg = 'আপনার অ্যাকাউন্টে AI চ্যাট বন্ধ রাখা হয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।';
    }
    return NextResponse.json(
      { success: false, error: msg, code: subCheck.reason },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { pageId, message, imageUrl, audioUrl, history = [] } = body;

    let targetPageId = pageId;
    if (!targetPageId || targetPageId === 'ALL') {
      const firstPage = await prisma.page.findFirst({
        where: { userId: auth.user.id },
      });
      if (firstPage) {
        targetPageId = firstPage.id;
      } else {
        const anyPage = await prisma.page.findFirst();
        if (anyPage) targetPageId = anyPage.id;
      }
    }

    if (!targetPageId) {
      return NextResponse.json(
        {
          success: false,
          error: 'কোনো পেজ বা চ্যানেল সংযুক্ত করা হয়নি। অনুগ্রহ করে প্রথমে "পেজ ও চ্যানেল" সেকশন থেকে আপনার পেজ যুক্ত করুন।',
        },
        { status: 400 }
      );
    }

    const aiResult = await generateAIReply({
      userId: auth.user.id,
      pageId: targetPageId,
      senderPsid: 'sandbox_test_user',
      incomingText: message || '',
      incomingImageUrl: imageUrl || undefined,
      incomingAudioUrl: audioUrl || undefined,
      conversationHistory: history,
      canSendProductImage: true,
    });

    return NextResponse.json({
      success: true,
      reply: aiResult.replyText,
      transcription: aiResult.transcription,
      matchedProduct: aiResult.matchedProduct,
      detectedOrder: aiResult.detectedOrder,
      model: aiResult.aiModel,
      provider: aiResult.provider,
    });
  } catch (error: any) {
    console.error('Test chat error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'AI টেস্ট চ্যাটে ত্রুটি হয়েছে।' },
      { status: 500 }
    );
  }
}
