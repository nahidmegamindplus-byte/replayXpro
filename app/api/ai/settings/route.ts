import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { encrypt, decrypt, maskToken } from '@/lib/crypto';
import { logActivity } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const setting = await prisma.aiSetting.findFirst({
      where: { userId: auth.user.id },
    });

    if (!setting) {
      return NextResponse.json({
        success: true,
        setting: {
          provider: 'GEMINI',
          model: 'gemini-1.5-flash',
          hasApiKey: false,
          maskedApiKey: '',
          temperature: 0.7,
          maxTokens: 800,
        },
      });
    }

    const rawApiKey = setting.encryptedApiKey ? decrypt(setting.encryptedApiKey) : '';

    return NextResponse.json({
      success: true,
      setting: {
        id: setting.id,
        provider: setting.provider,
        model: setting.model,
        hasApiKey: Boolean(rawApiKey),
        maskedApiKey: rawApiKey ? maskToken(rawApiKey) : '',
        temperature: setting.temperature,
        maxTokens: setting.maxTokens,
      },
    });
  } catch (error: any) {
    console.error('Error fetching AI settings:', error);
    return NextResponse.json(
      { success: false, error: 'AI সেটিংস লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { provider, model, apiKey, temperature, maxTokens } = body;

    const validProvider = (provider || 'GEMINI').toUpperCase();
    const validModel = model || (validProvider === 'OPENAI' ? 'gpt-4o-mini' : 'gemini-1.5-flash');

    let encryptedKey: string | undefined = undefined;
    if (apiKey && apiKey.trim() && !apiKey.includes('••••')) {
      encryptedKey = encrypt(apiKey.trim());
    }

    const existing = await prisma.aiSetting.findFirst({
      where: { userId: auth.user.id },
    });

    let saved;
    if (existing) {
      saved = await prisma.aiSetting.update({
        where: { id: existing.id },
        data: {
          provider: validProvider,
          model: validModel,
          ...(encryptedKey !== undefined ? { encryptedApiKey: encryptedKey } : {}),
          temperature: temperature !== undefined ? parseFloat(temperature) : existing.temperature,
          maxTokens: maxTokens !== undefined ? parseInt(maxTokens, 10) : existing.maxTokens,
        },
      });
    } else {
      saved = await prisma.aiSetting.create({
        data: {
          userId: auth.user.id,
          provider: validProvider,
          model: validModel,
          encryptedApiKey: encryptedKey || null,
          temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
          maxTokens: maxTokens !== undefined ? parseInt(maxTokens, 10) : 800,
        },
      });
    }

    await logActivity({
      userId: auth.user.id,
      action: 'AI_SETTINGS_UPDATED',
      description: `AI সেটিংস আপডেট করা হয়েছে (প্রোভাইডার: ${validProvider}, মডেল: ${validModel})`,
    });

    return NextResponse.json({
      success: true,
      message: 'AI সেটিংস সফলভাবে সংরক্ষিত হয়েছে!',
      setting: {
        id: saved.id,
        provider: saved.provider,
        model: saved.model,
        hasApiKey: Boolean(saved.encryptedApiKey),
        maskedApiKey: saved.encryptedApiKey ? maskToken(decrypt(saved.encryptedApiKey)) : '',
        temperature: saved.temperature,
        maxTokens: saved.maxTokens,
      },
    });
  } catch (error: any) {
    console.error('Error saving AI settings:', error);
    return NextResponse.json(
      { success: false, error: 'AI সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
