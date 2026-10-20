import prisma from './db';
import { serverLogger, logActivity } from './logger';

export interface SubscriptionCheckResult {
  eligible: boolean;
  reason?: string;
  user?: any;
}

/**
 * Validates whether a user's AI Chat should be active based on:
 * 1. Admin status (admins are exempt and always eligible)
 * 2. User account block or disabled status
 * 3. User's explicit AI chat toggle (aiChatEnabled)
 * 4. Active Subscription / Package status (planStatus === 'ACTIVE')
 * 5. Subscription Expiration date (planExpiresAt) - auto-expires planStatus and turns off AI chat if expired
 * 6. Monthly Message Quota Limit (messagesSentThisMonth < monthlyMessageLimit) - auto-turns off AI chat if limit reached
 */
export async function checkUserSubscriptionAndAiEligibility(userId: string): Promise<SubscriptionCheckResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        planStatus: true,
        monthlyMessageLimit: true,
        messagesSentThisMonth: true,
        planExpiresAt: true,
        aiChatEnabled: true,
        isBlocked: true,
      },
    });

    if (!user) {
      return { eligible: false, reason: 'USER_NOT_FOUND' };
    }

    // Admins are always eligible
    if (user.role === 'ADMIN' || user.email.toLowerCase().includes('admin') || user.email.toLowerCase() === 'admin@replyx.ai') {
      return { eligible: true, user };
    }

    // 1. Check if user is blocked or account is disabled
    if (user.isBlocked || user.status === 'DISABLED') {
      return { eligible: false, reason: 'USER_BLOCKED_OR_DISABLED', user };
    }

    // 2. Check Subscription / Package Plan Status
    if (user.planStatus !== 'ACTIVE') {
      if (user.aiChatEnabled !== false) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { aiChatEnabled: false },
          });
        } catch (_) {}
      }
      return { eligible: false, reason: 'PLAN_NOT_ACTIVE', user };
    }

    // 3. Check Plan Expiry Date
    if (user.planExpiresAt && new Date() > new Date(user.planExpiresAt)) {
      serverLogger.warn(`User ${user.email} (${user.id}) subscription plan has expired on ${user.planExpiresAt}. Turning off AI chat automatically.`);
      
      let updatedUser = user;
      try {
        updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            planStatus: 'EXPIRED',
            aiChatEnabled: false,
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
            plan: true,
            planStatus: true,
            monthlyMessageLimit: true,
            messagesSentThisMonth: true,
            planExpiresAt: true,
            aiChatEnabled: true,
            isBlocked: true,
          },
        });

        await logActivity({
          userId: user.id,
          action: 'SUBSCRIPTION_EXPIRED_AUTO_DISABLED',
          description: `সাবস্ক্রিপশনের মেয়াদ উত্তীর্ণ হওয়ায় AI চ্যাট স্বয়ংক্রিয়ভাবে বন্ধ করা হয়েছে (${new Date(user.planExpiresAt).toLocaleDateString()})`,
        });
      } catch (_) {}

      return { eligible: false, reason: 'PLAN_EXPIRED', user: updatedUser };
    }

    // 4. Check Monthly Message Quota Limit
    if (user.monthlyMessageLimit > 0 && user.messagesSentThisMonth >= user.monthlyMessageLimit) {
      serverLogger.warn(`User ${user.email} (${user.id}) monthly message limit (${user.messagesSentThisMonth}/${user.monthlyMessageLimit}) exceeded. Turning off AI chat.`);
      
      let updatedUser = user;
      try {
        updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            aiChatEnabled: false,
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
            plan: true,
            planStatus: true,
            monthlyMessageLimit: true,
            messagesSentThisMonth: true,
            planExpiresAt: true,
            aiChatEnabled: true,
            isBlocked: true,
          },
        });

        await logActivity({
          userId: user.id,
          action: 'MESSAGE_LIMIT_REACHED_AUTO_DISABLED',
          description: `মাসিক মেসেজ কোটা পূর্ণ হওয়ায় AI চ্যাট স্বয়ংক্রিয়ভাবে বন্ধ করা হয়েছে (${user.messagesSentThisMonth}/${user.monthlyMessageLimit})`,
        });
      } catch (_) {}

      return { eligible: false, reason: 'MESSAGE_LIMIT_REACHED', user: updatedUser };
    }

    // 5. Check if AI chat is explicitly disabled by admin
    if (user.aiChatEnabled === false) {
      return { eligible: false, reason: 'AI_CHAT_DISABLED', user };
    }

    return { eligible: true, user };
  } catch (error: any) {
    serverLogger.error('Error validating user subscription & limits:', error);
    return { eligible: false, reason: 'SUBSCRIPTION_CHECK_ERROR' };
  }
}

/**
 * Increment message count for a user after AI reply or Follow-up sent.
 * If quota is reached on this increment, automatically turns off aiChatEnabled.
 */
export async function recordAiMessageSent(userId: string): Promise<void> {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        messagesSentThisMonth: { increment: 1 },
      },
      select: {
        id: true,
        role: true,
        email: true,
        monthlyMessageLimit: true,
        messagesSentThisMonth: true,
      },
    });

    if (user.role !== 'ADMIN' && user.monthlyMessageLimit > 0 && user.messagesSentThisMonth >= user.monthlyMessageLimit) {
      await prisma.user.update({
        where: { id: user.id },
        data: { aiChatEnabled: false },
      });
      serverLogger.warn(`User ${user.email} reached message limit (${user.messagesSentThisMonth}/${user.monthlyMessageLimit}). AI Chat automatically disabled.`);
    }
  } catch (err) {
    serverLogger.warn('Error recording AI message usage count:', err);
  }
}
