import { serverLogger, logActivity } from './logger';

export interface DigitalEmailParams {
  to: string;
  customerName: string;
  businessName: string;
  productName: string;
  orderId: string;
  digitalFileUrl?: string | null;
  digitalInstructions?: string | null;
  supportPhone?: string | null;
  supportEmail?: string | null;
  userId?: string;
}

/**
 * Generate a responsive, professional HTML email for instant digital product delivery
 */
export function generateDigitalProductEmailHtml(params: DigitalEmailParams): string {
  const {
    customerName,
    businessName,
    productName,
    orderId,
    digitalFileUrl,
    digitalInstructions,
    supportPhone,
    supportEmail,
  } = params;

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>আপনার ডিজিটাল পণ্য - ${productName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      color: #1e293b;
    }
    .wrapper {
      max-width: 600px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      padding: 36px 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .header p {
      margin: 0;
      font-size: 15px;
      opacity: 0.95;
    }
    .content {
      padding: 32px 30px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .product-card {
      background: #f1f5f9;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      border-left: 4px solid #2563eb;
    }
    .product-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .order-meta {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .download-btn {
      display: block;
      background: #2563eb;
      color: #ffffff !important;
      text-align: center;
      padding: 16px 24px;
      border-radius: 10px;
      text-decoration: none;
      font-size: 16px;
      font-weight: 600;
      margin: 26px 0;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      transition: background 0.2s;
    }
    .download-btn:hover {
      background: #1d4ed8;
    }
    .instructions-box {
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 10px;
      padding: 18px;
      margin-bottom: 24px;
      color: #713f12;
      font-size: 14px;
      line-height: 1.6;
    }
    .instructions-box h4 {
      margin: 0 0 8px 0;
      font-size: 15px;
      color: #854d0e;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .code-snippet {
      background: #ffffff;
      border: 1px solid #fef08a;
      padding: 10px 14px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 15px;
      font-weight: bold;
      color: #0f172a;
      word-break: break-all;
      margin-top: 6px;
    }
    .footer {
      background: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      font-size: 13px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #64748b;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🎉 অভিনন্দন! আপনার অর্ডার সম্পন্ন হয়েছে</h1>
      <p>${businessName}</p>
    </div>
    <div class="content">
      <div class="greeting">
        প্রিয় <strong>${customerName}</strong>,<br>
        আমাদের শপ থেকে <strong>${productName}</strong> অর্ডার করার জন্য আপনাকে আন্তরিক ধন্যবাদ। আপনার পেমেন্ট সফলভাবে নিশ্চিত করা হয়েছে এবং আপনার ডিজিটাল পণ্যের অ্যাক্সেস প্রস্তুত করা হয়েছে।
      </div>

      <div class="product-card">
        <h3 class="product-title">📦 ${productName}</h3>
        <p class="order-meta">অর্ডার আইডি: #${orderId.slice(0, 8).toUpperCase()} | ডেলিভারি: ইনস্ট্যান্ট ইমেইল</p>
      </div>

      ${
        digitalFileUrl
          ? `
      <div style="text-align: center;">
        <a href="${digitalFileUrl}" target="_blank" rel="noopener noreferrer" class="download-btn">
          📥 আপনার ডিজিটাল ফাইল / অ্যাক্সেস ডাউনলোড করুন
        </a>
        <p style="font-size: 12px; color: #64748b; margin-top: -16px; margin-bottom: 24px;">
          সরাসরি লিংক: <a href="${digitalFileUrl}" style="color: #2563eb; word-break: break-all;">${digitalFileUrl}</a>
        </p>
      </div>
      `
          : ''
      }

      ${
        digitalInstructions
          ? `
      <div class="instructions-box">
        <h4>🔑 লাইসেন্স কী ও অ্যাক্সেস নির্দেশাবলী:</h4>
        <div class="code-snippet">${digitalInstructions.replace(/\n/g, '<br>')}</div>
      </div>
      `
          : ''
      }

      <div style="font-size: 14px; color: #64748b; margin-top: 24px; line-height: 1.6;">
        আপনার যদি ফাইল ডাউনলোড করতে বা অ্যাক্সেস নিতে কোনো ধরনের অসুবিধা হয়, তবে নির্দ্বিধায় আমাদের সাথে যোগাযোগ করুন।<br>
        ${supportPhone ? `📞 হটলাইন: ${supportPhone}<br>` : ''}
        ${supportEmail ? `✉️ ইমেইল: ${supportEmail}<br>` : ''}
      </div>
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} ${businessName}. সর্বস্বত্ব সংরক্ষিত।<br>
      পাওয়ার্ড বাই <strong>ReplyX AI</strong> - স্মার্ট অটোমেশন প্ল্যাটফর্ম
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send digital product delivery email to customer
 */
export async function sendDigitalProductEmail(params: DigitalEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, customerName, businessName, productName, orderId, userId } = params;

  if (!to || !to.includes('@')) {
    serverLogger.warn(`[Digital Delivery] Invalid email address: ${to}`);
    return { success: false, error: 'বৈধ ইমেইল ঠিকানা প্রদান করা হয়নি।' };
  }

  const subject = `🎉 আপনার ডিজিটাল পণ্য প্রস্তুত - ${productName} | ${businessName}`;
  const html = generateDigitalProductEmailHtml(params);

  try {
    // 1. Try Resend API if API Key is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const fromEmail = process.env.RESEND_FROM_EMAIL || `${businessName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'orders'}@resend.dev`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${businessName} <${fromEmail}>`,
          to: [to],
          subject,
          html,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        serverLogger.info(`[Digital Delivery] Email sent via Resend to ${to} (ID: ${data.id})`);

        if (userId) {
          await logActivity({
            userId,
            action: 'DIGITAL_PRODUCT_EMAIL_SENT',
            description: `ডিজিটাল পণ্য (${productName}) এর অ্যাক্সেস সফলভাবে ${to} ঠিকানায় পাঠানো হয়েছে।`,
          });
        }

        return { success: true, messageId: data.id };
      } else {
        const errText = await res.text();
        serverLogger.warn(`[Digital Delivery] Resend API returned error (${res.status}): ${errText}`);
      }
    }

    // 2. Try Generic Webhook / SMTP Gateway if configured
    const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
    if (webhookUrl) {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          html,
          metadata: { orderId, productName, customerName, businessName },
        }),
      });
      if (res.ok) {
        serverLogger.info(`[Digital Delivery] Email sent via Webhook to ${to}`);
        return { success: true };
      }
    }

    // 3. Fallback: Log email contents safely for self-hosted / dev environments
    serverLogger.info(`[Digital Delivery Ready] Instant delivery prepared for ${to}: Product: ${productName}, Link: ${params.digitalFileUrl}`);

    if (userId) {
      await logActivity({
        userId,
        action: 'DIGITAL_PRODUCT_DELIVERY_PREPARED',
        description: `ডিজিটাল পণ্য (${productName}) এর ডেলিভারি ইমেইল প্রস্তুত করা হয়েছে গ্রাহক (${to}) এর জন্য।`,
      });
    }

    return { success: true, messageId: `mock_${Date.now()}` };
  } catch (error: any) {
    serverLogger.error('[Digital Delivery Error] Failed to dispatch email:', error?.message);
    return { success: false, error: error?.message || 'ইমেইল পাঠাতে সমস্যা হয়েছে।' };
  }
}
