'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Bot,
  Sparkles,
  Wand2,
  Save,
  RotateCcw,
  Send,
  MessageSquare,
  Package,
  ShoppingCart,
  CheckCircle2,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

export default function AiRulesPage() {
  const toast = useToast();
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'easy' | 'custom' | 'test'>('easy');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Custom Prompt state
  const [customPrompt, setCustomPrompt] = useState('');

  // Easy Mode Questionnaire
  const [easyAnswers, setEasyAnswers] = useState({
    businessName: '',
    businessType: 'ই-কমার্স ফ্যাশন ও লাইফস্টাইল পণ্য',
    targetCustomer: 'সকল সম্মানিত অনলাইন ক্রেতা',
    conversationTone: 'Friendly',
    mainFeatures: '১০০% অরিজিনাল কোয়ালিটি এবং দ্রুততম হোম ডেলিভারি',
    pricePolicy: 'প্রোডাক্ট তালিকায় উল্লিখিত সঠিক অফার মূল্য জানানো হবে',
    deliveryCharge: 'ঢাকার ভেতরে ৭০ টাকা, ঢাকার বাইরে ১৩০ টাকা',
    deliveryArea: 'সমগ্র বাংলাদেশ',
    codAvailable: 'ক্যাশ অন ডেলিভারি (COD) সুবিধা আছে',
    orderProcess: 'নাম, মোবাইল ফোন নম্বর ও সম্পূর্ণ ঠিকানা প্রদান করে অর্ডার কনফার্ম করতে হবে',
    restrictedTopics: 'অপ্রাসঙ্গিক কোনো বিষয়াবলী এবং কাল্পনিক অফার দেওয়া যাবে না',
    replyLanguage: 'বাংলা',
    replyLength: 'Concise',
    humanSupportTriggers: 'জটিল অভিযোগ, লেনদেন সমস্যা বা বিশেষ অনুরোধ থাকলে অ্যাডমিন যোগাযোগ করবে',
  });

  // Test Chat Simulator State
  const [testMessages, setTestMessages] = useState<Array<{ role: string; text: string; matchedProduct?: any; detectedOrder?: any }>>([
    {
      role: 'assistant',
      text: 'নমস্কার! ReplyX AI টেস্ট স্যান্ডবক্সে স্বাগতম। আপনার পেজের AI যেভাবে কাস্টমারের সাথে কথা বলবে, তা এখানে সরাসরি পরীক্ষা করুন।',
    },
  ]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>('/api/pages', { retries: 2 });
      if (data?.success && Array.isArray(data.pages) && data.pages.length > 0) {
        setPages(data.pages);
        setSelectedPageId(data.pages[0].id);
        setCustomPrompt(data.pages[0].aiInstructions || '');
        setEasyAnswers((prev) => ({
          ...prev,
          businessName: data.pages[0].pageName,
        }));
      }
    } catch (e) {
      toast.error('পেজ ডাটা লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handlePageChange = (pageId: string) => {
    setSelectedPageId(pageId);
    const p = pages.find((x) => x.id === pageId);
    if (p) {
      setCustomPrompt(p.aiInstructions || '');
      setEasyAnswers((prev) => ({
        ...prev,
        businessName: p.pageName,
      }));
    }
  };

  const handleGenerateEasyPrompt = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/ai/generate-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(easyAnswers),
      });

      const data = await res.json();
      if (data.success) {
        setCustomPrompt(data.instructions);
        setActiveTab('custom');
        toast.success('AI নির্দেশিকা সফলভাবে জেনারেট হয়েছে! কাস্টম এডিটরে যাচাই করে সেভ করুন।');
      }
    } catch (e) {
      toast.error('জেনারেট করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustomPrompt = async () => {
    if (!selectedPageId) {
      toast.error('অনুগ্রহ করে একটি Facebook Page নির্বাচন করুন।');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/pages/${selectedPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiInstructions: customPrompt }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('AI নির্দেশিকা পেজে সংরক্ষিত হয়েছে!');
        fetchPages();
      } else {
        toast.error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;

    const userText = testInput.trim();
    setTestInput('');

    const newHistory = [...testMessages, { role: 'user', text: userText }];
    setTestMessages(newHistory);
    setTestLoading(true);

    try {
      const res = await fetch('/api/ai/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: selectedPageId,
          message: userText,
          history: newHistory.map((m) => ({
            direction: m.role === 'user' ? 'INCOMING' : 'OUTGOING',
            text: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.reply,
            matchedProduct: data.matchedProduct,
            detectedOrder: data.detectedOrder,
          },
        ]);
      } else {
        setTestMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `[Error]: ${data.error || 'AI টেস্ট করতে সমস্যা হয়েছে।'}`,
          },
        ]);
      }
    } catch (e) {
      setTestMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: '[Error]: সার্ভারের সাথে সংযোগ বিচ্ছিন্ন হয়েছে।',
        },
      ]);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="AI নিয়মাবলী ও প্রম্পট ইঞ্জিন"
      subtitle="Easy Mode প্রশ্নাবলী দিয়ে স্বয়ংক্রিয় AI নির্দেশিকা তৈরি করুন অথবা কাস্টম প্রম্পট লিখে লাইভ টেস্ট করুন"
    >
      {/* Page Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">নির্বাচিত Social Page / চ্যানেল</h3>
            <p className="text-xs text-slate-500">যে পেজের জন্য AI রুলস কনফিগার করছেন</p>
          </div>
        </div>

        <select
          value={selectedPageId}
          onChange={(e) => handlePageChange(e.target.value)}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 min-w-[240px] transition-all"
        >
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.pageName} ({p.channelType ? p.channelType.toUpperCase() : 'FACEBOOK'})
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('easy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'easy'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/90 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <Wand2 className="w-4 h-4 text-indigo-600" />
          <span>Easy Mode AI বিল্ডার (১৪ প্রশ্ন)</span>
        </button>

        <button
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'custom'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/90 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <Bot className="w-4 h-4 text-indigo-600" />
          <span>কাস্টম AI নির্দেশিকা (Custom Prompt)</span>
        </button>

        <button
          onClick={() => setActiveTab('test')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'test'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/90 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>লাইভ AI টেস্ট চ্যাট স্যান্ডবক্স</span>
        </button>
      </div>

      {/* Tab 1: Easy Mode 14 Questions Wizard */}
      {activeTab === 'easy' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-600" />
              <span>Easy Mode AI প্রশ্নাবলী</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              নিচের ১৪টি সহজ প্রশ্নের উত্তর দিন। ReplyX AI স্বয়ংক্রিয়ভাবে পেশাদার সিস্টেম প্রম্পট তৈরি করে দেবে।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ১. ব্যবসার নাম কী?
              </label>
              <input
                type="text"
                value={easyAnswers.businessName}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, businessName: e.target.value })}
                placeholder="যেমন: স্টাইলিশ ফ্যাশন বিডি"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-400"
              />
            </div>

            {/* 2 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ২. কী ধরনের পণ্য/সেবা বিক্রি করেন?
              </label>
              <input
                type="text"
                value={easyAnswers.businessType}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, businessType: e.target.value })}
                placeholder="যেমন: প্রিমিয়াম পাঞ্জাবি, জুতা ও লেদার আইটেম"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-400"
              />
            </div>

            {/* 3 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ৩. আপনার Target Customer কারা?
              </label>
              <input
                type="text"
                value={easyAnswers.targetCustomer}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, targetCustomer: e.target.value })}
                placeholder="যেমন: তরুণ ও রুচিশীল ক্রেতাবৃন্দ"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-400"
              />
            </div>

            {/* 4 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ৪. Customer-এর সাথে কীভাবে কথা বলতে চান? (Tone)
              </label>
              <select
                value={easyAnswers.conversationTone}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, conversationTone: e.target.value as any })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              >
                <option value="Friendly">আন্তরিক ও অমায়িক (Friendly)</option>
                <option value="Professional">মার্জিত ও পেশাদার (Professional)</option>
                <option value="Sales Focused">সেলস ফোকাসড (Sales Focused)</option>
                <option value="Short">খুব সংক্ষিপ্ত (Short)</option>
                <option value="Casual">সহজ ক্যাজুয়াল (Casual)</option>
              </select>
            </div>

            {/* 5 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ৫. Product-এর প্রধান সুবিধা কী?
              </label>
              <input
                type="text"
                value={easyAnswers.mainFeatures}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, mainFeatures: e.target.value })}
                placeholder="যেমন: ১০০% পিওর কটন ফেব্রিক ও কালার গ্যারান্টি"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-400"
              />
            </div>

            {/* 6 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ৬. Price কীভাবে বলতে হবে?
              </label>
              <input
                type="text"
                value={easyAnswers.pricePolicy}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, pricePolicy: e.target.value })}
                placeholder="যেমন: ডিসকাউন্ট থাকলে অফার মূল্য সহ জানানো হবে"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-400"
              />
            </div>

            {/* 7 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ৭. Delivery Charge কত?
              </label>
              <input
                type="text"
                value={easyAnswers.deliveryCharge}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, deliveryCharge: e.target.value })}
                placeholder="যেমন: ঢাকা ৭০ টাকা, ঢাকার বাইরে ১৩০ টাকা"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-400"
              />
            </div>

            {/* 8 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ৮. কোন এলাকায় Delivery দেন?
              </label>
              <input
                type="text"
                value={easyAnswers.deliveryArea}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, deliveryArea: e.target.value })}
                placeholder="যেমন: সমগ্র বাংলাদেশ"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-400"
              />
            </div>

            {/* 9 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ৯. ক্যাশ অন ডেলিভারি (COD) আছে কি?
              </label>
              <input
                type="text"
                value={easyAnswers.codAvailable}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, codAvailable: e.target.value })}
                placeholder="যেমন: জি, সারা দেশে ক্যাশ অন ডেলিভারি সুবিধা আছে"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-400"
              />
            </div>

            {/* 10 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ১০. Order নেওয়ার process কী?
              </label>
              <input
                type="text"
                value={easyAnswers.orderProcess}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, orderProcess: e.target.value })}
                placeholder="যেমন: নাম, ফোন নম্বর ও পূর্ণ ঠিকানা সংগ্রহ করে অর্ডার তৈরি করা"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-400"
              />
            </div>

            {/* 11 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ১১. AI কোন বিষয়গুলো বলতে পারবে না?
              </label>
              <input
                type="text"
                value={easyAnswers.restrictedTopics}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, restrictedTopics: e.target.value })}
                placeholder="যেমন: মিথ্যা স্টক তথ্য, ব্যক্তিগত যোগাযোগ নম্বর বা কাল্পনিক ডিসকাউন্ট"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-400"
              />
            </div>

            {/* 12 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ১২. কোন ভাষায় reply করবে?
              </label>
              <select
                value={easyAnswers.replyLanguage}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, replyLanguage: e.target.value as any })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              >
                <option value="বাংলা">বাংলা (Bangla)</option>
                <option value="English">English</option>
                <option value="Banglish">ব্যাংলিশ (Banglish)</option>
                <option value="Auto">অটো ডিটেক্ট (Auto)</option>
              </select>
            </div>

            {/* 13 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ১৩. Reply কতটুকু বড় বা ছোট হবে?
              </label>
              <select
                value={easyAnswers.replyLength}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, replyLength: e.target.value as any })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              >
                <option value="Very Short">খুব সংক্ষিপ্ত (Very Short)</option>
                <option value="Concise">সংক্ষিপ্ত ও স্পষ্ট (Concise)</option>
                <option value="Detailed">বিস্তারিত (Detailed)</option>
              </select>
            </div>

            {/* 14 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ১৪. Human Support কখন নিতে হবে?
              </label>
              <input
                type="text"
                value={easyAnswers.humanSupportTriggers}
                onChange={(e) => setEasyAnswers({ ...easyAnswers, humanSupportTriggers: e.target.value })}
                placeholder="যেমন: পেমেন্ট ডিসপিউট বা স্পেশাল কাস্টমাইজেশন অনুরোধ"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-400"
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
            <button
              onClick={handleGenerateEasyPrompt}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4" />
              <span>AI Instructions জেনারেট করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Custom AI Prompt Editor */}
      {activeTab === 'custom' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                <span>Custom AI Instructions Editor</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                আপনার পেজের জন্য সম্পূর্ণ এআই সিস্টেম প্রম্পট সরাসরি এডিট করুন
              </p>
            </div>

            <button
              onClick={handleSaveCustomPrompt}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
            </button>
          </div>

          <textarea
            rows={15}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="[ব্যবসার তথ্য]&#10;ব্যবসার নাম: ...&#10;&#10;[কথোপকথনের নিয়মাবলী]&#10;..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-xs font-mono leading-relaxed focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all mb-4"
          />

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>ইনভেন্টরি তথ্য ও অর্ডার ক্যাপচার ডিরেক্টিভ সার্ভার সাইড থেকে স্বয়ংক্রিয়ভাবে যুক্ত হয়।</span>
            <button
              onClick={() => {
                setCustomPrompt('গ্রাহকের সাথে আন্তরিক ও পেশাদারভাবে কথা বলুন এবং পণ্য ক্রয়ে সহায়তা করুন।');
                toast.info('ডিফল্ট প্রম্পট লোড করা হয়েছে।');
              }}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> ডিফল্ট রিসেট
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Interactive Sandbox Test Chat Simulator */}
      {activeTab === 'test' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm max-w-4xl mx-auto flex flex-col h-[620px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm">
                AI
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">ReplyX AI Sandbox Simulator</h4>
                <p className="text-[11px] text-slate-500">
                  নির্বাচিত পেজের রিয়েল ইনভেন্টরি ও রুলস অনুযায়ী লাইভ রেসপন্স যাচাই করুন
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                setTestMessages([
                  {
                    role: 'assistant',
                    text: 'নমস্কার! ReplyX AI টেস্ট স্যান্ডবক্সে স্বাগতম। আপনার পেজের AI যেভাবে কাস্টমারের সাথে কথা বলবে, তা এখানে সরাসরি পরীক্ষা করুন।',
                  },
                ])
              }
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> চ্যাট পরিষ্কার করুন
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 mb-4">
            {testMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-xs'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none space-y-2'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {/* Matched Product Badge with Image Preview if present */}
                  {m.matchedProduct && (
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl space-y-2 text-emerald-900">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 shrink-0 text-emerald-600" />
                        <div>
                          <span className="font-semibold">{m.matchedProduct.name}</span>
                          <span className="ml-1.5 text-slate-600 font-medium">({m.matchedProduct.price} ৳)</span>
                        </div>
                      </div>
                      {/* Images Preview: single or multiple gallery */}
                      {m.matchedProduct.images && m.matchedProduct.images.length > 1 ? (
                        <div className="space-y-1.5 max-w-sm">
                          <div className="grid grid-cols-3 gap-1.5">
                            {m.matchedProduct.images.map((imgUrl: string, imgIdx: number) => (
                              <div key={imgIdx} className="relative aspect-square rounded-lg overflow-hidden border border-emerald-200/80 bg-white shadow-xs">
                                <img
                                  src={imgUrl}
                                  alt={`${m.matchedProduct.name} ${imgIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[9px] px-1 rounded font-bold">
                                  #{imgIdx + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="bg-white/90 px-2 py-1 rounded-lg text-[10px] text-emerald-800 font-medium flex items-center justify-between border border-emerald-100">
                            <span>📷 {m.matchedProduct.images.length}টি ইনভেন্টরি ফটো পাঠানো হবে</span>
                            <span className="font-semibold">ম্যাচড</span>
                          </div>
                        </div>
                      ) : m.matchedProduct.imageUrl ? (
                        <div className="rounded-lg overflow-hidden border border-emerald-200/80 max-w-xs">
                          <img
                            src={m.matchedProduct.imageUrl}
                            alt={m.matchedProduct.name}
                            className="w-full max-h-48 object-cover rounded-lg"
                          />
                          <div className="bg-white/90 px-2 py-1 text-[10px] text-emerald-800 font-medium flex items-center justify-between">
                            <span>📷 ইনভেন্টরি ফটো গ্রাহককে পাঠানো হবে</span>
                            <span className="font-semibold">ম্যাচড</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Detected Order Badge if present */}
                  {m.detectedOrder && (
                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-700">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>অর্ডার ডিটেক্টেড!</span>
                      </div>
                      <p>
                        গ্রাহক: {m.detectedOrder.customerName} ({m.detectedOrder.phone})
                      </p>
                      <p>ঠিকানা: {m.detectedOrder.address}</p>
                      <p className="font-semibold">মোট মূল্য: {m.detectedOrder.totalPrice} ৳</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {testLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl rounded-tl-none p-3 text-xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></div>
                  <span>AI চিন্তা করছে ও উত্তর প্রস্তুত করছে...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendTestMessage} className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="মেসেজ লিখে পরীক্ষা করুন (যেমন: 'পাঞ্জাবির দাম কত?', 'order korte chai')..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all"
            />
            <button
              type="submit"
              disabled={testLoading || !testInput.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold shadow-xs transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
