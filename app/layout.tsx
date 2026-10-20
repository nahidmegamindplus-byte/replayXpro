import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import WhatsAppWidget from '@/components/ui/WhatsAppWidget';
import fs from 'fs';
import path from 'path';

export const metadata: Metadata = {
  title: 'ReplyX AI — AI-Powered Facebook Messenger Automation',
  description: 'আপনার Facebook Messenger-এর জন্য স্মার্ট AI Sales & Customer Care Assistant। বাংলা, ইংলিশ ও ব্যাংলিশ সাপোর্ট সহ সম্পূর্ণ অটোমেশন।',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  other: {
    google: 'notranslate',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

function getInlinedCss(): string {
  try {
    const candidates = [
      path.join(process.cwd(), 'public', 'global.css'),
      path.join(process.cwd(), 'global.css'),
      path.join(__dirname, '..', 'public', 'global.css'),
      path.join(__dirname, '..', 'global.css'),
    ];
    for (const file of candidates) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content && content.length > 500) {
          return content;
        }
      }
    }
  } catch (_) {}
  return '';
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const inlinedTailwindCss = getInlinedCss();

  return (
    <html lang="bn" className="light notranslate" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        {/* Preconnect to Google Fonts for instant Bengali & Inter typography */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* DOM Safety Guard: Protects React 18 reconciliation from Google Translate & browser extension mutations */}
        <script
          id="dom-safe-guard"
          dangerouslySetInnerHTML={{
            __html: `(function(){if(typeof window==='undefined'||typeof Node==='undefined')return;var oR=Node.prototype.removeChild;Node.prototype.removeChild=function(c){if(c.parentNode!==this){if(c.parentNode)return c.parentNode.removeChild(c);return c;}return oR.apply(this,arguments);};var oI=Node.prototype.insertBefore;Node.prototype.insertBefore=function(n,r){if(r&&r.parentNode!==this){if(r.parentNode)return r.parentNode.insertBefore(n,r);return this.appendChild(n);}return oI.apply(this,arguments);};})();`,
          }}
        />

        {/* ChunkLoadError & CDN Cache Auto-Recovery */}
        <script
          id="chunk-recovery"
          dangerouslySetInnerHTML={{
            __html: `(function(){if(typeof window==='undefined')return;window.addEventListener('error',function(e){var msg=(e&&e.message)?e.message:'';if(/Loading chunk .* failed/i.test(msg)||/ChunkLoadError/i.test(msg)){var key='replyx_chunk_retry';var now=Date.now();var last=Number(sessionStorage.getItem(key)||'0');if(!last||now-last>5000){sessionStorage.setItem(key,String(now));window.location.reload();}}});window.addEventListener('load',function(){try{sessionStorage.removeItem('replyx_chunk_retry');}catch(_){}});})();`,
          }}
        />

        {/* Inlined CSS: Guaranteed instant layout with zero FOUC on all browsers */}
        {inlinedTailwindCss ? (
          <style
            id="inlined-tailwind-css"
            dangerouslySetInnerHTML={{ __html: inlinedTailwindCss }}
          />
        ) : null}
        <link rel="stylesheet" href="/global.css" />
      </head>
      <body
        className="notranslate bg-[#f8fafc] text-slate-900 antialiased selection:bg-indigo-500/20 selection:text-indigo-700"
        translate="no"
        suppressHydrationWarning
      >
        <ToastProvider>
          {children}
          <WhatsAppWidget />
        </ToastProvider>
      </body>
    </html>
  );
}

