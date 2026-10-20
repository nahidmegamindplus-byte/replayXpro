'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Sparkles,
  Key,
  ShieldCheck,
  CheckCircle2,
  Save,
  Send,
  Bot,
  Zap,
  Activity,
  AlertCircle,
  Globe,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
  Server,
  Layers,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

export default function AdminAiSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // AI Configuration State
  const [provider, setProvider] = useState<'GOROUTER' | 'DEEPSEEK' | 'GEMINI' | 'OPENAI' | 'GROQ' | 'CLAUDE'>('GOROUTER');
  const [model, setModel] = useState('deepseek/deepseek-chat');
  const [customModel, setCustomModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(800);

  // API Keys & Base URLs
  const [gorouterKey, setGorouterKey] = useState('');
  const [gorouterBaseUrl, setGorouterBaseUrl] = useState('https://openrouter.ai/api/v1');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenAIKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');

  // Key Visibility States
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({
    gorouter: false,
    deepseek: false,
    gemini: false,
    openai: false,
    groq: false,
    claude: false,
  });

  const [keyStatus, setKeyStatus] = useState<any>({
    gorouter: { hasKey: false, rawKey: '', maskedKey: '', baseUrl: 'https://openrouter.ai/api/v1' },
    deepseek: { hasKey: false, rawKey: '', maskedKey: '' },
    gemini: { hasKey: false, rawKey: '', maskedKey: '' },
    openai: { hasKey: false, rawKey: '', maskedKey: '' },
    groq: { hasKey: false, rawKey: '', maskedKey: '' },
    claude: { hasKey: false, rawKey: '', maskedKey: '' },
    customProviders: [],
  });

  // Custom AI Providers State
  const [customProviders, setCustomProviders] = useState<Array<{
    id: string;
    name: string;
    providerKey: string;
    baseUrl: string;
    model: string;
    rawKey: string;
    maskedKey?: string;
    showKey?: boolean;
  }>>([]);

  // Individual API Key Test States
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [keyTestResults, setKeyTestResults] = useState<{ [key: string]: { success: boolean; message: string } | undefined }>({});

  // Sandbox Chat Simulator State
  const [testMessage, setTestMessage] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'আসসালামু আলাইকুম! আমি ReplyX AI। GoRouter, DeepSeek, Gemini, OpenAI বা আপনার যেকোনো কাস্টম মডেলের পারফরম্যান্স এখান থেকে টেস্ট করুন।',
    },
  ]);
  const [testingChat, setTestingChat] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>('/api/admin/ai-settings', { retries: 2 });

      if (data?.success && data.settings) {
        const prov = (data.settings.provider || 'GOROUTER') as any;
        setProvider(prov);
        setModel(data.settings.model || (prov === 'GOROUTER' ? 'deepseek/deepseek-chat' : 'gemini-1.5-flash'));
        setTemperature(data.settings.temperature || 0.7);
        setMaxTokens(data.settings.maxTokens || 800);
        if (data.settings.gorouter?.baseUrl) {
          setGorouterBaseUrl(data.settings.gorouter.baseUrl);
        }

        // Pre-fill keys from server if present
        if (data.settings.gorouter?.rawKey) setGorouterKey(data.settings.gorouter.rawKey);
        if (data.settings.deepseek?.rawKey) setDeepseekKey(data.settings.deepseek.rawKey);
        if (data.settings.gemini?.rawKey) setGeminiKey(data.settings.gemini.rawKey);
        if (data.settings.openai?.rawKey) setOpenAIKey(data.settings.openai.rawKey);
        if (data.settings.groq?.rawKey) setGroqKey(data.settings.groq.rawKey);
        if (data.settings.claude?.rawKey) setClaudeKey(data.settings.claude.rawKey);

        setKeyStatus(data.settings);
        if (Array.isArray(data.settings.customProviders)) {
          setCustomProviders(data.settings.customProviders);
        }
      }
    } catch (e) {
      // Handled safely
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleProviderChange = (newProvider: 'GOROUTER' | 'DEEPSEEK' | 'GEMINI' | 'OPENAI' | 'GROQ' | 'CLAUDE') => {
    setProvider(newProvider);
    if (newProvider === 'GOROUTER') {
      setModel('deepseek/deepseek-chat');
    } else if (newProvider === 'DEEPSEEK') {
      setModel('deepseek-chat');
    } else if (newProvider === 'OPENAI') {
      setModel('gpt-4o-mini');
    } else if (newProvider === 'GROQ') {
      setModel('llama-3.3-70b-versatile');
    } else if (newProvider === 'CLAUDE') {
      setModel('claude-3-5-sonnet-20241022');
    } else {
      setModel('gemini-1.5-flash');
    }
  };

  const toggleKeyVisibility = (keyName: string) => {
    setShowKeys((prev) => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) {
      toast.error('কপি করার জন্য কোনো Key নেই।');
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(`${label} কপি করা হয়েছে!`);
  };

  // Delete / Remove individual API key
  const handleDeleteKey = async (target: string, label: string) => {
    if (!confirm(`আপনি কি নিশ্চিতভাবে ${label} মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_KEY', deleteKeyTarget: target }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `${label} সফলভাবে মুছে ফেলা হয়েছে!`);
        if (target === 'GOROUTER') setGorouterKey('');
        if (target === 'DEEPSEEK') setDeepseekKey('');
        if (target === 'GEMINI') setGeminiKey('');
        if (target === 'OPENAI') setOpenAIKey('');
        if (target === 'GROQ') setGroqKey('');
        if (target === 'CLAUDE') setClaudeKey('');
        fetchSettings();
      } else {
        toast.error(data.error || 'মুছতে সমস্যা হয়েছে।');
      }
    } catch (_) {
      toast.error('সার্ভার ত্রুটি।');
    }
  };

  // Custom Provider Handlers
  const handleAddCustomProvider = () => {
    setCustomProviders((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: 'Custom AI Provider',
        providerKey: 'CUSTOM',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        rawKey: '',
        showKey: true,
      },
    ]);
  };

  const handleRemoveCustomProvider = (id: string) => {
    setCustomProviders((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateCustomProvider = (id: string, field: string, value: any) => {
    setCustomProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Test an individual API Key Connection
  const handleTestApiKey = async (
    targetProvider: string,
    currentInputKey: string
  ) => {
    const keyKey = targetProvider.toLowerCase();
    setTestingKey(targetProvider);
    setKeyTestResults((prev) => ({ ...prev, [keyKey]: undefined }));

    try {
      const activeModel = model === 'CUSTOM' ? (customModel.trim() || 'deepseek/deepseek-chat') : model;

      const res = await fetch('/api/admin/ai-settings/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: targetProvider,
          apiKey: currentInputKey || undefined,
          model:
            targetProvider === 'GOROUTER'
              ? activeModel
              : targetProvider === 'DEEPSEEK'
              ? 'deepseek-chat'
              : targetProvider === 'OPENAI'
              ? 'gpt-4o-mini'
              : 'gemini-1.5-flash',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setKeyTestResults((prev) => ({
          ...prev,
          [keyKey]: { success: true, message: data.message },
        }));
        toast.success(`${targetProvider} কানেকশন সফল!`);
      } else {
        setKeyTestResults((prev) => ({
          ...prev,
          [keyKey]: { success: false, message: data.error || 'কানেকশন ব্যর্থ হয়েছে।' },
        }));
        toast.error(`${targetProvider} ব্যর্থ: ${data.error || 'ত্রুটি'}`);
      }
    } catch (e) {
      setKeyTestResults((prev) => ({
        ...prev,
        [keyKey]: { success: false, message: 'সার্ভার যোগাযোগ ব্যর্থ।' },
      }));
      toast.error('কানেকশন টেস্টে নেটওয়ার্ক সমস্যা।');
    } finally {
      setTestingKey(null);
    }
  };

  // Save All Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const finalModel = model === 'CUSTOM' ? (customModel.trim() || 'deepseek/deepseek-chat') : model;

      const res = await fetch('/api/admin/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model: finalModel,
          temperature: Number(temperature),
          maxTokens: Number(maxTokens),
          gorouterKey: gorouterKey || '',
          gorouterBaseUrl: gorouterBaseUrl ? gorouterBaseUrl.trim() : 'https://openrouter.ai/api/v1',
          deepseekKey: deepseekKey || '',
          geminiKey: geminiKey || '',
          openaiKey: openaiKey || '',
          groqKey: groqKey || '',
          claudeKey: claudeKey || '',
          customProviders,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'AI সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
        fetchSettings();
      } else {
        toast.error(data.error || 'সেটিংস সংরক্ষণে ব্যর্থতা।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    } finally {
      setSaving(false);
    }
  };

  const handleTestChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessage.trim()) return;

    const userText = testMessage.trim();
    setTestMessage('');
    setChatLog((prev) => [...prev, { role: 'user', text: userText }]);
    setTestingChat(true);

    try {
      const res = await fetch('/api/ai/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: chatLog.map((m) => ({
            direction: m.role === 'user' ? 'INCOMING' : 'OUTGOING',
            text: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setChatLog((prev) => [
          ...prev,
          { role: 'assistant', text: data.reply || 'কোনো উত্তর পাওয়া যায়নি।' },
        ]);
      } else {
        setChatLog((prev) => [
          ...prev,
          { role: 'assistant', text: `ত্রুটি: ${data.error || 'AI উত্তর দিতে ব্যর্থ হয়েছে।'}` },
        ]);
      }
    } catch (e) {
      setChatLog((prev) => [
        ...prev,
        { role: 'assistant', text: 'সার্ভারে যোগাযোগ করতে সমস্যা হয়েছে।' },
      ]);
    } finally {
      setTestingChat(false);
    }
  };

  return (
    <AdminLayout
      title="🤖 AI ও API Key সেটিংস"
      subtitle="প্ল্যাটফর্মের সেন্ট্রাল AI ইঞ্জিন, GoRouter, DeepSeek, Google Gemini, OpenAI এবং কাস্টম API Key পরিচালনা"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Configuration Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span>সেন্ট্রাল AI প্রোভাইডার নির্বাচন</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  সিস্টেমের সমস্ত মেসেঞ্জার অটোরিপ্লাইয়ের জন্য প্রাথমিক AI ইঞ্জিন বেছে নিন
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>AES-256 Secure</span>
              </span>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Provider Selector Cards */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
                  অ্যাক্টিভ AI প্রোভাইডার
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* GoRouter Option */}
                  <button
                    type="button"
                    onClick={() => handleProviderChange('GOROUTER')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      provider === 'GOROUTER'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold shadow-xs ring-1 ring-purple-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-amber-600" />
                        <span>GoRouter</span>
                      </span>
                      {provider === 'GOROUTER' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal leading-tight">
                      All-in-one Router (DeepSeek, Claude, GPT)
                    </p>
                  </button>

                  {/* DeepSeek Option */}
                  <button
                    type="button"
                    onClick={() => handleProviderChange('DEEPSEEK')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      provider === 'DEEPSEEK'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold shadow-xs ring-1 ring-purple-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-cyan-700 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-cyan-600" />
                        <span>DeepSeek</span>
                      </span>
                      {provider === 'DEEPSEEK' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal leading-tight">
                      সুপার ফাস্ট ও সাশ্রয়ী
                    </p>
                  </button>

                  {/* Gemini Option */}
                  <button
                    type="button"
                    onClick={() => handleProviderChange('GEMINI')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      provider === 'GEMINI'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold shadow-xs ring-1 ring-purple-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-emerald-700">Google Gemini</span>
                      {provider === 'GEMINI' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal leading-tight">
                      মাল্টিমোডাল ভিশন & ভয়েস
                    </p>
                  </button>

                  {/* OpenAI Option */}
                  <button
                    type="button"
                    onClick={() => handleProviderChange('OPENAI')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      provider === 'OPENAI'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold shadow-xs ring-1 ring-purple-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-blue-700">OpenAI</span>
                      {provider === 'OPENAI' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal leading-tight">
                      GPT-4o / GPT-4o-mini
                    </p>
                  </button>

                  {/* Groq Option */}
                  <button
                    type="button"
                    onClick={() => handleProviderChange('GROQ')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      provider === 'GROQ'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold shadow-xs ring-1 ring-purple-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-orange-700 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-orange-600" />
                        <span>Groq (Ultra Fast)</span>
                      </span>
                      {provider === 'GROQ' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal leading-tight">
                      LPU ইনফারেন্স (500+ tokens/s)
                    </p>
                  </button>

                  {/* Claude Option */}
                  <button
                    type="button"
                    onClick={() => handleProviderChange('CLAUDE')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      provider === 'CLAUDE'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold shadow-xs ring-1 ring-purple-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-amber-800">Anthropic Claude</span>
                      {provider === 'CLAUDE' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal leading-tight">
                      Claude 3.5 Sonnet / Haiku
                    </p>
                  </button>
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  মডেল নির্বাচন ({provider})
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                >
                  {provider === 'GOROUTER' ? (
                    <>
                      <option value="deepseek/deepseek-chat">deepseek/deepseek-chat (DeepSeek V3 — রেকমেন্ডেড)</option>
                      <option value="deepseek/deepseek-r1">deepseek/deepseek-r1 (DeepSeek R1 Reasoning)</option>
                      <option value="openai/gpt-4o-mini">openai/gpt-4o-mini (সুপার ফাস্ট)</option>
                      <option value="openai/gpt-4o">openai/gpt-4o (হাই পারফরম্যান্স)</option>
                      <option value="anthropic/claude-3.5-sonnet">anthropic/claude-3.5-sonnet (স্মার্ট ন্যাচারাল বাংলা)</option>
                      <option value="meta-llama/llama-3.3-70b-instruct">meta-llama/llama-3.3-70b-instruct</option>
                      <option value="google/gemini-2.0-flash-exp:free">google/gemini-2.0-flash-exp:free</option>
                      <option value="CUSTOM">কাস্টম মডেল নাম লিখুন (Custom Model ID)...</option>
                    </>
                  ) : provider === 'DEEPSEEK' ? (
                    <>
                      <option value="deepseek-chat">deepseek-chat (DeepSeek-V3 — দ্রুত ও আদর্শ)</option>
                      <option value="deepseek-reasoner">deepseek-reasoner (DeepSeek-R1 — ডিপ রিজনিং)</option>
                    </>
                  ) : provider === 'OPENAI' ? (
                    <>
                      <option value="gpt-4o-mini">gpt-4o-mini (ফাস্ট ও ব্যালেন্সড)</option>
                      <option value="gpt-4o">gpt-4o (সর্বোচ্চ সক্ষমতা)</option>
                    </>
                  ) : provider === 'GROQ' ? (
                    <>
                      <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (রেকমেন্ডেড)</option>
                      <option value="llama3-8b-8192">llama3-8b-8192 (আল্ট্রা ফাস্ট)</option>
                      <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                    </>
                  ) : provider === 'CLAUDE' ? (
                    <>
                      <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</option>
                      <option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022</option>
                    </>
                  ) : (
                    <>
                      <option value="gemini-1.5-flash">gemini-1.5-flash (সুপার ফাস্ট - রেকমেন্ডেড)</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro (কমপ্লেক্স লজিক)</option>
                    </>
                  )}
                </select>

                {model === 'CUSTOM' && (
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="যেমন: mistralai/mistral-large-2411 বা qwen/qwen-2.5-72b-instruct"
                    className="w-full mt-2 px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>

              {/* 1. GoRouter / OpenRouter API Key Input */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-amber-700" />
                    <span>GoRouter / OpenRouter API Key</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {keyStatus.gorouter?.hasKey && (
                      <button
                        type="button"
                        onClick={() => handleDeleteKey('GOROUTER', 'GoRouter API Key')}
                        className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold"
                        title="কী মুছে ফেলুন"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>মুছুন</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeys.gorouter ? 'text' : 'password'}
                      value={gorouterKey}
                      onChange={(e) => setGorouterKey(e.target.value)}
                      placeholder="sk-or-v1-... (gorouter.app বা openrouter.ai থেকে সংগৃহীত)"
                      className="w-full pl-3.5 pr-20 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility('gorouter')}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title={showKeys.gorouter ? 'লুকান' : 'দেখান'}
                      >
                        {showKeys.gorouter ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(gorouterKey, 'GoRouter Key')}
                        className="p-1 text-slate-400 hover:text-purple-600"
                        title="কপি করুন"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={testingKey === 'GOROUTER'}
                    onClick={() => handleTestApiKey('GOROUTER', gorouterKey)}
                    className="px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{testingKey === 'GOROUTER' ? 'টেস্ট হচ্ছে...' : 'টেস্ট'}</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    API Base URL (Default: https://openrouter.ai/api/v1 অথবা https://gorouter.app/api/v1)
                  </label>
                  <input
                    type="text"
                    value={gorouterBaseUrl}
                    onChange={(e) => setGorouterBaseUrl(e.target.value)}
                    placeholder="https://openrouter.ai/api/v1"
                    className="w-full px-3.5 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {keyTestResults.gorouter && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      keyTestResults.gorouter.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {keyTestResults.gorouter.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{keyTestResults.gorouter.message}</span>
                  </div>
                )}
              </div>

              {/* 2. DeepSeek Direct API Key */}
              <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-700" />
                    <span>DeepSeek Direct API Key</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {keyStatus.deepseek?.hasKey && (
                      <button
                        type="button"
                        onClick={() => handleDeleteKey('DEEPSEEK', 'DeepSeek API Key')}
                        className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold"
                        title="কী মুছে ফেলুন"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>মুছুন</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeys.deepseek ? 'text' : 'password'}
                      value={deepseekKey}
                      onChange={(e) => setDeepseekKey(e.target.value)}
                      placeholder="sk-... (platform.deepseek.com থেকে সংগৃহীত)"
                      className="w-full pl-3.5 pr-20 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility('deepseek')}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title={showKeys.deepseek ? 'লুকান' : 'দেখান'}
                      >
                        {showKeys.deepseek ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(deepseekKey, 'DeepSeek Key')}
                        className="p-1 text-slate-400 hover:text-purple-600"
                        title="কপি করুন"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={testingKey === 'DEEPSEEK'}
                    onClick={() => handleTestApiKey('DEEPSEEK', deepseekKey)}
                    className="px-3.5 py-2 rounded-xl bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border border-cyan-300 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{testingKey === 'DEEPSEEK' ? 'টেস্ট হচ্ছে...' : 'টেস্ট'}</span>
                  </button>
                </div>
                {keyTestResults.deepseek && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      keyTestResults.deepseek.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {keyTestResults.deepseek.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{keyTestResults.deepseek.message}</span>
                  </div>
                )}
              </div>

              {/* 3. Gemini API Key Input */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Google Gemini API Key</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {keyStatus.gemini?.hasKey && (
                      <button
                        type="button"
                        onClick={() => handleDeleteKey('GEMINI', 'Gemini API Key')}
                        className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold"
                        title="কী মুছে ফেলুন"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>মুছুন</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeys.gemini ? 'text' : 'password'}
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy... (aistudio.google.com থেকে সংগৃহীত)"
                      className="w-full pl-3.5 pr-20 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility('gemini')}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title={showKeys.gemini ? 'লুকান' : 'দেখান'}
                      >
                        {showKeys.gemini ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(geminiKey, 'Gemini Key')}
                        className="p-1 text-slate-400 hover:text-purple-600"
                        title="কপি করুন"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={testingKey === 'GEMINI'}
                    onClick={() => handleTestApiKey('GEMINI', geminiKey)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{testingKey === 'GEMINI' ? 'টেস্ট হচ্ছে...' : 'টেস্ট'}</span>
                  </button>
                </div>
                {keyTestResults.gemini && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      keyTestResults.gemini.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {keyTestResults.gemini.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{keyTestResults.gemini.message}</span>
                  </div>
                )}
              </div>

              {/* 4. OpenAI API Key Input */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-700" />
                    <span>OpenAI API Key</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {keyStatus.openai?.hasKey && (
                      <button
                        type="button"
                        onClick={() => handleDeleteKey('OPENAI', 'OpenAI API Key')}
                        className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold"
                        title="কী মুছে ফেলুন"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>মুছুন</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeys.openai ? 'text' : 'password'}
                      value={openaiKey}
                      onChange={(e) => setOpenAIKey(e.target.value)}
                      placeholder="sk-proj-... (platform.openai.com থেকে সংগৃহীত)"
                      className="w-full pl-3.5 pr-20 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility('openai')}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title={showKeys.openai ? 'লুকান' : 'দেখান'}
                      >
                        {showKeys.openai ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(openaiKey, 'OpenAI Key')}
                        className="p-1 text-slate-400 hover:text-purple-600"
                        title="কপি করুন"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={testingKey === 'OPENAI'}
                    onClick={() => handleTestApiKey('OPENAI', openaiKey)}
                    className="px-3.5 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{testingKey === 'OPENAI' ? 'টেস্ট হচ্ছে...' : 'টেস্ট'}</span>
                  </button>
                </div>
                {keyTestResults.openai && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      keyTestResults.openai.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {keyTestResults.openai.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{keyTestResults.openai.message}</span>
                  </div>
                )}
              </div>

              {/* 5. Groq API Key Input */}
              <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-orange-700" />
                    <span>Groq API Key (Fast LPU)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {keyStatus.groq?.hasKey && (
                      <button
                        type="button"
                        onClick={() => handleDeleteKey('GROQ', 'Groq API Key')}
                        className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold"
                        title="কী মুছে ফেলুন"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>মুছুন</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeys.groq ? 'text' : 'password'}
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      placeholder="gsk_... (console.groq.com থেকে সংগৃহীত)"
                      className="w-full pl-3.5 pr-20 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-orange-500"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility('groq')}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title={showKeys.groq ? 'লুকান' : 'দেখান'}
                      >
                        {showKeys.groq ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(groqKey, 'Groq Key')}
                        className="p-1 text-slate-400 hover:text-purple-600"
                        title="কপি করুন"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Custom AI Providers Management */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-purple-600" />
                      <span>কাস্টম AI প্রোভাইডারসমূহ (Custom AI Providers)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Ollama, Mistral, Together AI, vLLM বা অন্য যেকোনো OpenAI-compatible এন্ডপয়েন্ট যোগ করুন
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomProvider}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>AI যোগ করুন</span>
                  </button>
                </div>

                {customProviders.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    কোনো অতিরিক্ত কাস্টম AI প্রোভাইডার যোগ করা হয়নি। প্রয়োজন হলে উপরের বাটন দিয়ে যোগ করুন।
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customProviders.map((cp, idx) => (
                      <div key={cp.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            প্রোভাইডার #{idx + 1}: {cp.name || 'কাস্টম AI'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomProvider(cp.id)}
                            className="text-rose-600 hover:text-rose-800 p-1 rounded-lg text-xs flex items-center gap-1 font-semibold"
                            title="প্রোভাইডার মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>মুছুন</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                              প্রোভাইডার নাম
                            </label>
                            <input
                              type="text"
                              value={cp.name}
                              onChange={(e) => handleUpdateCustomProvider(cp.id, 'name', e.target.value)}
                              placeholder="যেমন: Mistral / Ollama Local"
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                              মডেল নাম (Model ID)
                            </label>
                            <input
                              type="text"
                              value={cp.model}
                              onChange={(e) => handleUpdateCustomProvider(cp.id, 'model', e.target.value)}
                              placeholder="যেমন: mistral-large / llama3"
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                            Base URL (OpenAI Compatible)
                          </label>
                          <input
                            type="text"
                            value={cp.baseUrl}
                            onChange={(e) => handleUpdateCustomProvider(cp.id, 'baseUrl', e.target.value)}
                            placeholder="https://api.together.xyz/v1 অথবা http://localhost:11434/v1"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                            API Key
                          </label>
                          <div className="relative">
                            <input
                              type={cp.showKey ? 'text' : 'password'}
                              value={cp.rawKey}
                              onChange={(e) => handleUpdateCustomProvider(cp.id, 'rawKey', e.target.value)}
                              placeholder="sk-... বা Bearer Token"
                              className="w-full pl-3 pr-16 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateCustomProvider(cp.id, 'showKey', !cp.showKey)}
                                className="p-1 text-slate-400 hover:text-slate-700"
                              >
                                {cp.showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(cp.rawKey, `${cp.name} Key`)}
                                className="p-1 text-slate-400 hover:text-purple-600"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Advanced Parameters */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Temperature ({temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>সঠিক ও নির্দিষ্ট (0.0)</span>
                    <span>সৃজনশীল (1.0)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    ম্যাক্স টোকেন
                  </label>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সকল AI সেটিংস ও API Key সংরক্ষণ করুন'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Sandbox Chat Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col h-[650px] text-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">AI লাইভ টেস্ট স্যান্ডবক্স</h4>
                  <p className="text-[10px] text-slate-500 font-mono">মডেল: {model}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setChatLog([
                    {
                      role: 'assistant',
                      text: 'আসসালামু আলাইকুম! আমি ReplyX AI। আপনার পণ্যের বিবরণ বা যেকোনো প্রশ্ন লিখে টেস্ট করুন।',
                    },
                  ])
                }
                className="text-[11px] text-purple-600 hover:underline font-semibold"
              >
                চ্যাট পরিষ্কার
              </button>
            </div>

            {/* Chat message bubbles */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {chatLog.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-purple-600 text-white rounded-br-xs'
                        : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {testingChat && (
                <div className="flex justify-start">
                  <div className="p-3 bg-slate-100 rounded-2xl text-xs text-slate-500 flex items-center gap-2 border border-slate-200/60">
                    <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                    <span>AI উত্তর তৈরি করছে...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleTestChat} className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="যেমন: এই ঘড়িটির ডেলিভারি চার্জ কত?"
                disabled={testingChat}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-purple-600 focus:bg-white"
              />
              <button
                type="submit"
                disabled={testingChat || !testMessage.trim()}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>পাঠান</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
