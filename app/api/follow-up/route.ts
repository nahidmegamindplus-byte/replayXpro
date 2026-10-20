import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ensureDatabaseReady } from '@/lib/db-init';
import { DEFAULT_SCHEDULE_STEPS, runFollowUpAutomation, startFollowUpWorker } from '@/lib/follow-up';

export async function GET(req: NextRequest) {
  try {
    await ensureDatabaseReady();
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;
    const userId = auth.user.id;

    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get('pageId') || undefined;

    // Fetch user schedule steps or fallback/seed defaults
    let steps = await prisma.followUpScheduleStep.findMany({
      where: pageId ? { pageId } : { userId, pageId: null },
      orderBy: { stepNumber: 'asc' },
    });

    if (steps.length === 0) {
      // Check global defaults
      const globalSteps = await prisma.followUpScheduleStep.findMany({
        where: { isGlobalDefault: true },
        orderBy: { stepNumber: 'asc' },
      });

      if (globalSteps.length > 0) {
        steps = globalSteps;
      } else {
        // Return in-memory default steps
        steps = DEFAULT_SCHEDULE_STEPS as any;
      }
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Funnel & Performance Metrics via high-speed groupBy
    const convWhere: any = {
      userId,
      createdAt: { gte: thirtyDaysAgo },
    };
    if (pageId) convWhere.pageId = pageId;

    const logWhere: any = pageId ? { userId, pageId } : { userId };

    const [statusGroups, totalSentLogs, recentLogs, activeConversations, pages] = await Promise.all([
      prisma.conversation.groupBy({
        by: ['followUpStatus'],
        where: convWhere,
        _count: { _all: true },
      }),
      prisma.followUpLog.count({
        where: logWhere,
      }),
      prisma.followUpLog.findMany({
        where: logWhere,
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          stepNumber: true,
          dayOffset: true,
          scheduledTime: true,
          messageText: true,
          channel: true,
          customerName: true,
          senderPsid: true,
          status: true,
          aiModel: true,
          createdAt: true,
          page: {
            select: { id: true, pageName: true, channel: true },
          },
          conversation: {
            select: {
              id: true,
              customerName: true,
              senderPsid: true,
              followUpStatus: true,
              currentFollowUpStep: true,
            },
          },
        },
      }),
      prisma.conversation.findMany({
        where: {
          ...convWhere,
          followUpStatus: { in: ['IN_PROGRESS', 'CUSTOMER_REPLIED', 'ORDER_PLACED', 'COMPLETED', 'PAUSED'] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        select: {
          id: true,
          customerName: true,
          senderPsid: true,
          channel: true,
          followUpStatus: true,
          currentFollowUpStep: true,
          nextFollowUpDueAt: true,
          lastFollowUpSentAt: true,
          lastMessage: true,
          lastMessageAt: true,
          createdAt: true,
          page: { select: { id: true, pageName: true, channel: true } },
        },
      }),
      prisma.page.findMany({
        where: { userId },
        select: {
          id: true,
          pageName: true,
          channel: true,
          followUpEnabled: true,
          followUpWaitMinutes: true,
          followUpOnlySeen: true,
          followUpFrequency: true,
          followUpIntervalHours: true,
          followUpMaxCount: true,
          followUpMessage: true,
        },
      }),
    ]);

    let totalConversations = 0;
    let inProgressCount = 0;
    let repliedCount = 0;
    let convertedCount = 0;
    let completedCount = 0;

    for (const item of statusGroups) {
      const count = item._count._all;
      totalConversations += count;
      if (item.followUpStatus === 'IN_PROGRESS') inProgressCount = count;
      else if (item.followUpStatus === 'CUSTOMER_REPLIED') repliedCount = count;
      else if (item.followUpStatus === 'ORDER_PLACED') convertedCount = count;
      else if (item.followUpStatus === 'COMPLETED') completedCount = count;
    }

    // Find specific page settings if pageId provided, or first page
    let activePageSettings = null;
    if (pageId) {
      activePageSettings = pages.find((p) => p.id === pageId) || null;
    } else if (pages.length > 0) {
      activePageSettings = pages[0];
    }

    return NextResponse.json({
      success: true,
      steps,
      pageSettings: activePageSettings,
      metrics: {
        totalConversations,
        inProgressCount,
        repliedCount,
        convertedCount,
        completedCount,
        totalSentLogs,
        conversionRate:
          totalConversations > 0
            ? Math.round(((convertedCount + repliedCount) / totalConversations) * 100)
            : 0,
      },
      recentLogs,
      activeConversations,
      pages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch follow-up data.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseReady();
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;
    const userId = auth.user.id;

    const body = await req.json();
    const { action, pageId } = body;

    // 1. Update Page-Level Follow-Up Settings (Seen/Unreplied automation rules)
    if (action === 'UPDATE_PAGE_SETTINGS') {
      const {
        followUpEnabled,
        followUpWaitMinutes,
        followUpOnlySeen,
        followUpFrequency,
        followUpIntervalHours,
        followUpMaxCount,
        followUpMessage,
      } = body;

      const updateData: any = {};
      if (typeof followUpEnabled === 'boolean') updateData.followUpEnabled = followUpEnabled;
      if (typeof followUpWaitMinutes === 'number') updateData.followUpWaitMinutes = followUpWaitMinutes;
      if (typeof followUpOnlySeen === 'boolean') updateData.followUpOnlySeen = followUpOnlySeen;
      if (followUpFrequency) updateData.followUpFrequency = followUpFrequency;
      if (typeof followUpIntervalHours === 'number') updateData.followUpIntervalHours = followUpIntervalHours;
      if (typeof followUpMaxCount === 'number') updateData.followUpMaxCount = followUpMaxCount;
      if (typeof followUpMessage === 'string') updateData.followUpMessage = followUpMessage;

      if (pageId) {
        await prisma.page.updateMany({
          where: { id: pageId, userId },
          data: updateData,
        });
      } else {
        // Apply to all user pages if no specific pageId
        await prisma.page.updateMany({
          where: { userId },
          data: updateData,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'ফলো-আপ সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে।',
      });
    }

    // 2. Trigger Automation Run
    if (action === 'TRIGGER') {
      startFollowUpWorker();
      const summary = await runFollowUpAutomation(pageId || undefined);
      return NextResponse.json({
        success: true,
        message:
          summary.sentCount > 0
            ? `সফলভাবে ${summary.sentCount} টি ফলো-আপ বার্তা পাঠানো হয়েছে।`
            : `চেক সম্পন্ন: বর্তমান সময়ে কোনো নতুন ফলো-আপ বার্তা পাঠানোর প্রয়োজন নেই। নির্ধারিত সময় পার হলে স্বয়ংক্রিয়ভাবে পাঠানো হবে।`,
        summary,
      });
    }

    // 3. Update Conversation Status (Pause / Resume / Reset)
    if (action === 'UPDATE_CONVERSATION_STATUS') {
      const { conversationId, status } = body;
      if (!conversationId || !status) {
        return NextResponse.json({ success: false, error: 'Missing parameters.' }, { status: 400 });
      }

      await prisma.conversation.updateMany({
        where: { id: conversationId, userId },
        data: { followUpStatus: status },
      });

      return NextResponse.json({ success: true, message: 'গ্রাহকের ফলো-আপ স্ট্যাটাস আপডেট হয়েছে।' });
    }

    // 4. Save / Upsert All Schedule Steps (Custom Schedule Builder)
    if (action === 'SAVE_STEPS' || Array.isArray(body.steps)) {
      const stepsList = (body.steps || []) as Array<{
        id?: string;
        stepNumber: number;
        dayOffset: number;
        timeOfDay: string;
        title: string;
        guidelinePrompt?: string;
        isEnabled?: boolean;
      }>;

      // Delete existing steps for this user/page scope
      await prisma.followUpScheduleStep.deleteMany({
        where: pageId ? { pageId, userId } : { userId, pageId: null },
      });

      // Insert fresh steps
      const created = [];
      for (let i = 0; i < stepsList.length; i++) {
        const item = stepsList[i];
        const dayOffsetVal = item.dayOffset !== undefined && item.dayOffset !== null && !isNaN(Number(item.dayOffset)) ? Number(item.dayOffset) : 1;
        const timeOfDayVal = item.timeOfDay || '10:00';
        let defaultTitle = item.title;
        if (!defaultTitle) {
          if (timeOfDayVal.startsWith('MIN:')) {
            defaultTitle = `ধাপ #${i + 1} (${timeOfDayVal.replace('MIN:', '')} মিনিট পর)`;
          } else if (timeOfDayVal.startsWith('HR:')) {
            defaultTitle = `ধাপ #${i + 1} (${timeOfDayVal.replace('HR:', '')} ঘন্টা পর)`;
          } else {
            defaultTitle = `ধাপ #${i + 1} (${dayOffsetVal} দিন পর)`;
          }
        }

        const step = await prisma.followUpScheduleStep.create({
          data: {
            userId,
            pageId: pageId || null,
            stepNumber: i + 1,
            dayOffset: dayOffsetVal,
            timeOfDay: timeOfDayVal,
            title: defaultTitle,
            guidelinePrompt: item.guidelinePrompt || null,
            isEnabled: item.isEnabled !== false,
            isGlobalDefault: false,
          },
        });
        created.push(step);
      }

      return NextResponse.json({
        success: true,
        message: 'ফলো-আপ শিডিউল সফলভাবে সংরক্ষণ করা হয়েছে।',
        steps: created,
      });
    }

    // 5. Add Single Step
    if (action === 'ADD_STEP') {
      const { dayOffset, timeOfDay, title, guidelinePrompt, isEnabled } = body;
      const count = await prisma.followUpScheduleStep.count({
        where: pageId ? { pageId, userId } : { userId, pageId: null },
      });

      const dayOffsetVal = dayOffset !== undefined && dayOffset !== null && !isNaN(Number(dayOffset)) ? Number(dayOffset) : 1;
      const timeOfDayVal = timeOfDay || '10:00';
      let defaultTitle = title;
      if (!defaultTitle) {
        if (timeOfDayVal.startsWith('MIN:')) {
          defaultTitle = `${count + 1}ম ফলো-আপ (${timeOfDayVal.replace('MIN:', '')} মিনিট পর)`;
        } else if (timeOfDayVal.startsWith('HR:')) {
          defaultTitle = `${count + 1}ম ফলো-আপ (${timeOfDayVal.replace('HR:', '')} ঘন্টা পর)`;
        } else {
          defaultTitle = `${count + 1}ম ফলো-আপ (${dayOffsetVal} দিন পর)`;
        }
      }

      const newStep = await prisma.followUpScheduleStep.create({
        data: {
          userId,
          pageId: pageId || null,
          stepNumber: count + 1,
          dayOffset: dayOffsetVal,
          timeOfDay: timeOfDayVal,
          title: defaultTitle,
          guidelinePrompt: guidelinePrompt || null,
          isEnabled: isEnabled !== false,
          isGlobalDefault: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'নতুন ফলো-আপ ধাপ যুক্ত হয়েছে।',
        step: newStep,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update schedule.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureDatabaseReady();
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;
    const userId = auth.user.id;

    const { searchParams } = new URL(req.url);
    const stepId = searchParams.get('id');

    if (!stepId) {
      return NextResponse.json({ success: false, error: 'Step ID is required.' }, { status: 400 });
    }

    await prisma.followUpScheduleStep.deleteMany({
      where: { id: stepId, userId },
    });

    return NextResponse.json({ success: true, message: 'ফলো-আপ ধাপটি সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete step.' },
      { status: 500 }
    );
  }
}
