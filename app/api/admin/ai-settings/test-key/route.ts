import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { provider, apiKey, model } = body;

    if (!provider) {
      return NextResponse.json({ success: false, error: 'AI প্রোভাইডার আবশ্যক।' }, { status: 400 });
    }

    let keyToTest = apiKey ? apiKey.trim() : '';

    // If key not sent in body, fetch saved encrypted key from DB
    if (!keyToTest) {
      const settingKey =
        provider.toUpperCase() === 'GOROUTER' || provider.toUpperCase() === 'OPENROUTER'
          ? 'ADMIN_GOROUTER_KEY_ENCRYPTED'
          : provider.toUpperCase() === 'DEEPSEEK'
          ? 'ADMIN_DEEPSEEK_KEY_ENCRYPTED'
          : provider.toUpperCase() === 'OPENAI'
          ? 'ADMIN_OPENAI_KEY_ENCRYPTED'
          : 'ADMIN_GEMINI_KEY_ENCRYPTED';

      const setting = await prisma.systemSetting.findUnique({
        where: { key: settingKey },
      });

      if (setting && setting.value) {
        keyToTest = decrypt(setting.value);
      } else {
        keyToTest =
          provider.toUpperCase() === 'GOROUTER' || provider.toUpperCase() === 'OPENROUTER'
            ? process.env.GOROUTER_API_KEY || process.env.OPENROUTER_API_KEY || ''
            : provider.toUpperCase() === 'DEEPSEEK'
            ? process.env.DEEPSEEK_API_KEY || ''
            : provider.toUpperCase() === 'OPENAI'
            ? process.env.OPENAI_API_KEY || ''
            : process.env.GEMINI_API_KEY || '';
      }
    }

    if (!keyToTest) {
      return NextResponse.json(
        { success: false, error: `${provider} এর জন্য কোনো API Key প্রদান বা সংরক্ষণ করা নেই।` },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    if (provider.toUpperCase() === 'GOROUTER' || provider.toUpperCase() === 'OPENROUTER') {
      const baseUrlSetting = await prisma.systemSetting.findUnique({
        where: { key: 'ADMIN_GOROUTER_BASE_URL' },
      });
      const baseURL = baseUrlSetting?.value || 'https://openrouter.ai/api/v1';

      const client = new OpenAI({
        apiKey: keyToTest,
        baseURL,
        defaultHeaders: {
          'HTTP-Referer': 'https://replax-ai.vercel.app',
          'X-Title': 'ReplyX AI',
        },
      });

      const res = await client.chat.completions.create({
        model: model || 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 5,
      });

      const latencyMs = Date.now() - startTime;
      const text = res.choices[0]?.message?.content || '';

      return NextResponse.json({
        success: true,
        provider: 'GOROUTER',
        latencyMs,
        message: `✅ GoRouter / OpenRouter (${model || 'deepseek/deepseek-chat'}) কানেকশন সফল! (${latencyMs}ms)`,
        reply: text.trim(),
      });
    } else if (provider.toUpperCase() === 'DEEPSEEK') {
      const client = new OpenAI({
        apiKey: keyToTest,
        baseURL: 'https://api.deepseek.com',
      });

      const res = await client.chat.completions.create({
        model: model || 'deepseek-chat',
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 5,
      });

      const latencyMs = Date.now() - startTime;
      const text = res.choices[0]?.message?.content || '';

      return NextResponse.json({
        success: true,
        provider: 'DEEPSEEK',
        latencyMs,
        message: `✅ DeepSeek API কানেকশন সফল! (${latencyMs}ms)`,
        reply: text.trim(),
      });
    } else if (provider.toUpperCase() === 'OPENAI') {
      const client = new OpenAI({ apiKey: keyToTest });

      const res = await client.chat.completions.create({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 5,
      });

      const latencyMs = Date.now() - startTime;
      const text = res.choices[0]?.message?.content || '';

      return NextResponse.json({
        success: true,
        provider: 'OPENAI',
        latencyMs,
        message: `✅ OpenAI API কানেকশন সফল! (${latencyMs}ms)`,
        reply: text.trim(),
      });
    } else {
      const genAI = new GoogleGenerativeAI(keyToTest);
      const geminiModel = genAI.getGenerativeModel({
        model: model || 'gemini-1.5-flash',
        generationConfig: { maxOutputTokens: 5 },
      });

      const res = await geminiModel.generateContent('Say "OK"');
      const latencyMs = Date.now() - startTime;
      const text = res.response.text();

      return NextResponse.json({
        success: true,
        provider: 'GEMINI',
        latencyMs,
        message: `✅ Google Gemini API কানেকশন সফল! (${latencyMs}ms)`,
        reply: text.trim(),
      });
    }
  } catch (error: any) {
    console.error('API Key test error:', error);
    const errorMsg = error?.message || error?.toString() || 'API কানেকশন টেস্ট ব্যর্থ হয়েছে।';
    return NextResponse.json(
      {
        success: false,
        error: `❌ সংযোগ ব্যর্থ: ${errorMsg}`,
      },
      { status: 400 }
    );
  }
}
