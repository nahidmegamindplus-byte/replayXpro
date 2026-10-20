import { NextRequest, NextResponse } from 'next/server';
import { runFollowUpAutomation, startFollowUpWorker } from '@/lib/follow-up';
import { requireAuth } from '@/lib/auth';

/**
 * Trigger / Execute Follow-Up Automation
 * Can be called by dashboard client, internal interval, or external cron job.
 */
export async function POST(req: NextRequest) {
  try {
    startFollowUpWorker();

    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get('pageId') || undefined;
    const queryKey = searchParams.get('key');
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'replax_internal_cron';

    const isSecretAuthorized =
      (authHeader && authHeader === `Bearer ${cronSecret}`) ||
      (queryKey && queryKey.trim() === cronSecret);

    if (!isSecretAuthorized) {
      const auth = await requireAuth(req);
      if ('response' in auth) return auth.response;
    }

    const summary = await runFollowUpAutomation(pageId);
    return NextResponse.json({
      success: true,
      message:
        summary.sentCount > 0
          ? `ফলো-আপ সম্পন্ন: ${summary.sentCount} টি মেসেজ সফলভাবে পাঠানো হয়েছে।`
          : `ফলো-আপ চেক সম্পন্ন: কোনো গ্রাহকের অপেক্ষা সময় এখনো পার হয়নি। নির্ধারিত সময় পর স্বয়ংক্রিয়ভাবে মেসেজ যাবে।`,
      ...summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'ফলো-আপ প্রক্রিয়া চালাতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}

