import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { encrypt, decrypt, maskToken } from '@/lib/crypto';
import { logActivity } from '@/lib/logger';
import { ensureDatabaseReady } from '@/lib/db-init';

export async function GET(req: NextRequest) {
  try {
    await ensureDatabaseReady();
    const auth = await requireAdmin(req);
    if ('response' in auth) return auth.response;

    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'ADMIN_AI_PROVIDER',
            'ADMIN_AI_MODEL',
            'ADMIN_GOROUTER_KEY_ENCRYPTED',
            'ADMIN_GOROUTER_BASE_URL',
            'ADMIN_DEEPSEEK_KEY_ENCRYPTED',
            'ADMIN_GEMINI_KEY_ENCRYPTED',
            'ADMIN_OPENAI_KEY_ENCRYPTED',
            'ADMIN_GROQ_KEY_ENCRYPTED',
            'ADMIN_CLAUDE_KEY_ENCRYPTED',
            'ADMIN_AI_TEMPERATURE',
            'ADMIN_AI_MAX_TOKENS',
            'ADMIN_CUSTOM_PROVIDERS',
          ],
        },
      },
    });

    const map: Record<string, string> = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });

    const provider = (map.ADMIN_AI_PROVIDER || process.env.AI_PROVIDER || 'GEMINI').toUpperCase();
    const model =
      map.ADMIN_AI_MODEL ||
      (provider === 'GOROUTER' || provider === 'OPENROUTER'
        ? 'deepseek/deepseek-chat'
        : provider === 'DEEPSEEK'
        ? 'deepseek-chat'
        : provider === 'OPENAI'
        ? 'gpt-4o-mini'
        : 'gemini-1.5-flash');

    const gorouterKeyRaw = map.ADMIN_GOROUTER_KEY_ENCRYPTED
      ? decrypt(map.ADMIN_GOROUTER_KEY_ENCRYPTED)
      : process.env.GOROUTER_API_KEY || process.env.OPENROUTER_API_KEY || '';
    const gorouterBaseUrl =
      map.ADMIN_GOROUTER_BASE_URL || process.env.GOROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

    const deepseekKeyRaw = map.ADMIN_DEEPSEEK_KEY_ENCRYPTED
      ? decrypt(map.ADMIN_DEEPSEEK_KEY_ENCRYPTED)
      : process.env.DEEPSEEK_API_KEY || '';
    const geminiKeyRaw = map.ADMIN_GEMINI_KEY_ENCRYPTED
      ? decrypt(map.ADMIN_GEMINI_KEY_ENCRYPTED)
      : process.env.GEMINI_API_KEY || '';
    const openaiKeyRaw = map.ADMIN_OPENAI_KEY_ENCRYPTED
      ? decrypt(map.ADMIN_OPENAI_KEY_ENCRYPTED)
      : process.env.OPENAI_API_KEY || '';
    const groqKeyRaw = map.ADMIN_GROQ_KEY_ENCRYPTED
      ? decrypt(map.ADMIN_GROQ_KEY_ENCRYPTED)
      : process.env.GROQ_API_KEY || '';
    const claudeKeyRaw = map.ADMIN_CLAUDE_KEY_ENCRYPTED
      ? decrypt(map.ADMIN_CLAUDE_KEY_ENCRYPTED)
      : process.env.ANTHROPIC_API_KEY || '';

    let customProviders: any[] = [];
    if (map.ADMIN_CUSTOM_PROVIDERS) {
      try {
        const parsed = JSON.parse(map.ADMIN_CUSTOM_PROVIDERS);
        if (Array.isArray(parsed)) {
          customProviders = parsed.map((cp: any) => ({
            id: cp.id,
            name: cp.name,
            providerKey: cp.providerKey,
            baseUrl: cp.baseUrl,
            model: cp.model,
            rawKey: cp.encryptedKey ? decrypt(cp.encryptedKey) : '',
            maskedKey: cp.encryptedKey ? maskToken(decrypt(cp.encryptedKey)) : '',
          }));
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      settings: {
        provider,
        model,
        temperature: map.ADMIN_AI_TEMPERATURE ? parseFloat(map.ADMIN_AI_TEMPERATURE) : 0.7,
        maxTokens: map.ADMIN_AI_MAX_TOKENS ? parseInt(map.ADMIN_AI_MAX_TOKENS, 10) : 800,
        gorouter: {
          hasKey: Boolean(gorouterKeyRaw),
          rawKey: gorouterKeyRaw || '',
          maskedKey: gorouterKeyRaw ? maskToken(gorouterKeyRaw) : '',
          baseUrl: gorouterBaseUrl,
        },
        deepseek: {
          hasKey: Boolean(deepseekKeyRaw),
          rawKey: deepseekKeyRaw || '',
          maskedKey: deepseekKeyRaw ? maskToken(deepseekKeyRaw) : '',
        },
        gemini: {
          hasKey: Boolean(geminiKeyRaw),
          rawKey: geminiKeyRaw || '',
          maskedKey: geminiKeyRaw ? maskToken(geminiKeyRaw) : '',
        },
        openai: {
          hasKey: Boolean(openaiKeyRaw),
          rawKey: openaiKeyRaw || '',
          maskedKey: openaiKeyRaw ? maskToken(openaiKeyRaw) : '',
        },
        groq: {
          hasKey: Boolean(groqKeyRaw),
          rawKey: groqKeyRaw || '',
          maskedKey: groqKeyRaw ? maskToken(groqKeyRaw) : '',
        },
        claude: {
          hasKey: Boolean(claudeKeyRaw),
          rawKey: claudeKeyRaw || '',
          maskedKey: claudeKeyRaw ? maskToken(claudeKeyRaw) : '',
        },
        customProviders,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin AI settings:', error);
    return NextResponse.json({ success: false, error: 'AI সেটিংস লোড করতে সমস্যা হয়েছে।' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseReady();
    const auth = await requireAdmin(req);
    if ('response' in auth) return auth.response;

    const body = await req.json();
    const {
      action,
      provider,
      model,
      temperature,
      maxTokens,
      gorouterKey,
      gorouterBaseUrl,
      deepseekKey,
      geminiKey,
      openaiKey,
      groqKey,
      claudeKey,
      deleteKeyTarget,
      customProviders,
    } = body;

    // Direct Key Deletion Action
    if (action === 'DELETE_KEY' || deleteKeyTarget) {
      const target = (deleteKeyTarget || '').toUpperCase();
      let keyToDelete = '';
      if (target === 'GOROUTER') keyToDelete = 'ADMIN_GOROUTER_KEY_ENCRYPTED';
      else if (target === 'DEEPSEEK') keyToDelete = 'ADMIN_DEEPSEEK_KEY_ENCRYPTED';
      else if (target === 'GEMINI') keyToDelete = 'ADMIN_GEMINI_KEY_ENCRYPTED';
      else if (target === 'OPENAI') keyToDelete = 'ADMIN_OPENAI_KEY_ENCRYPTED';
      else if (target === 'GROQ') keyToDelete = 'ADMIN_GROQ_KEY_ENCRYPTED';
      else if (target === 'CLAUDE') keyToDelete = 'ADMIN_CLAUDE_KEY_ENCRYPTED';

      if (keyToDelete) {
        await prisma.systemSetting.deleteMany({
          where: { key: keyToDelete },
        });

        await logActivity({
          userId: auth.user.id,
          action: 'ADMIN_AI_KEY_DELETED',
          description: `অ্যাডমিন দ্বারা ${target} API Key মুছে ফেলা হয়েছে`,
        });

        return NextResponse.json({
          success: true,
          message: `${target} API Key সফলভাবে মুছে ফেলা হয়েছে!`,
        });
      }
    }

    const updates: Array<{ key: string; value: string }> = [];

    if (provider) {
      updates.push({ key: 'ADMIN_AI_PROVIDER', value: provider.toUpperCase() });
    }
    if (model) {
      updates.push({ key: 'ADMIN_AI_MODEL', value: model });
    }
    if (gorouterBaseUrl) {
      updates.push({ key: 'ADMIN_GOROUTER_BASE_URL', value: gorouterBaseUrl.trim() });
    }
    if (temperature !== undefined) {
      updates.push({ key: 'ADMIN_AI_TEMPERATURE', value: String(temperature) });
    }
    if (maxTokens !== undefined) {
      updates.push({ key: 'ADMIN_AI_MAX_TOKENS', value: String(maxTokens) });
    }

    if (gorouterKey !== undefined) {
      if (gorouterKey.trim()) {
        updates.push({
          key: 'ADMIN_GOROUTER_KEY_ENCRYPTED',
          value: encrypt(gorouterKey.trim()),
        });
      } else {
        await prisma.systemSetting.deleteMany({ where: { key: 'ADMIN_GOROUTER_KEY_ENCRYPTED' } });
      }
    }

    if (deepseekKey !== undefined) {
      if (deepseekKey.trim()) {
        updates.push({
          key: 'ADMIN_DEEPSEEK_KEY_ENCRYPTED',
          value: encrypt(deepseekKey.trim()),
        });
      } else {
        await prisma.systemSetting.deleteMany({ where: { key: 'ADMIN_DEEPSEEK_KEY_ENCRYPTED' } });
      }
    }

    if (geminiKey !== undefined) {
      if (geminiKey.trim()) {
        updates.push({
          key: 'ADMIN_GEMINI_KEY_ENCRYPTED',
          value: encrypt(geminiKey.trim()),
        });
      } else {
        await prisma.systemSetting.deleteMany({ where: { key: 'ADMIN_GEMINI_KEY_ENCRYPTED' } });
      }
    }

    if (openaiKey !== undefined) {
      if (openaiKey.trim()) {
        updates.push({
          key: 'ADMIN_OPENAI_KEY_ENCRYPTED',
          value: encrypt(openaiKey.trim()),
        });
      } else {
        await prisma.systemSetting.deleteMany({ where: { key: 'ADMIN_OPENAI_KEY_ENCRYPTED' } });
      }
    }

    if (groqKey !== undefined) {
      if (groqKey.trim()) {
        updates.push({
          key: 'ADMIN_GROQ_KEY_ENCRYPTED',
          value: encrypt(groqKey.trim()),
        });
      } else {
        await prisma.systemSetting.deleteMany({ where: { key: 'ADMIN_GROQ_KEY_ENCRYPTED' } });
      }
    }

    if (claudeKey !== undefined) {
      if (claudeKey.trim()) {
        updates.push({
          key: 'ADMIN_CLAUDE_KEY_ENCRYPTED',
          value: encrypt(claudeKey.trim()),
        });
      } else {
        await prisma.systemSetting.deleteMany({ where: { key: 'ADMIN_CLAUDE_KEY_ENCRYPTED' } });
      }
    }

    if (customProviders !== undefined) {
      const sanitized = Array.isArray(customProviders)
        ? customProviders.map((cp: any) => ({
            id: cp.id || Math.random().toString(36).substring(2, 9),
            name: cp.name || 'Custom AI',
            providerKey: cp.providerKey || 'CUSTOM',
            baseUrl: cp.baseUrl || '',
            model: cp.model || '',
            encryptedKey: cp.rawKey ? encrypt(cp.rawKey) : cp.encryptedKey || '',
          }))
        : [];
      updates.push({
        key: 'ADMIN_CUSTOM_PROVIDERS',
        value: JSON.stringify(sanitized),
      });
    }

    // Upsert into SystemSetting
    for (const item of updates) {
      await prisma.systemSetting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
      });
    }

    await logActivity({
      userId: auth.user.id,
      action: 'ADMIN_AI_SETTINGS_UPDATED',
      description: `অ্যাডমিন AI কনফিগারেশন আপডেট করা হয়েছে: Provider=${provider || 'UNCHANGED'}, Model=${model || 'UNCHANGED'}`,
    });

    return NextResponse.json({
      success: true,
      message: 'AI প্রোভাইডার ও API সেটিংস সফলভাবে আপডেট হয়েছে!',
    });
  } catch (error: any) {
    console.error('Error saving admin AI settings:', error);
    return NextResponse.json({ success: false, error: 'AI সেটিংস সংরক্ষণে ত্রুটি হয়েছে।' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureDatabaseReady();
    const auth = await requireAdmin(req);
    if ('response' in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ success: false, error: 'কোন কী মুছতে হবে তা নির্ধারণ করুন।' }, { status: 400 });
    }

    await prisma.systemSetting.deleteMany({
      where: { key },
    });

    await logActivity({
      userId: auth.user.id,
      action: 'ADMIN_AI_SETTING_DELETED',
      description: `অ্যাডমিন দ্বারা ${key} সেটিং মুছে ফেলা হয়েছে`,
    });

    return NextResponse.json({
      success: true,
      message: 'সেটিং সফলভাবে মুছে ফেলা হয়েছে!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'মুছতে সমস্যা হয়েছে।' }, { status: 500 });
  }
}
