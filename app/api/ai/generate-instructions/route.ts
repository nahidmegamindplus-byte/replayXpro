import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateAiInstructions } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const answers = await req.json();
    const generatedInstructions = generateAiInstructions(answers);

    return NextResponse.json({
      success: true,
      instructions: generatedInstructions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'AI নির্দেশিকা তৈরি করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
