const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const pages = await prisma.page.findMany();
  console.log('--- PAGES ---');
  pages.forEach(p => {
    console.log({
      id: p.id,
      name: p.pageName,
      channel: p.channel,
      followUpEnabled: p.followUpEnabled,
      followUpWaitMinutes: p.followUpWaitMinutes,
      followUpOnlySeen: p.followUpOnlySeen,
      followUpFrequency: p.followUpFrequency,
      connectionStatus: p.connectionStatus,
    });
  });

  const convs = await prisma.conversation.findMany({
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 2,
      }
    }
  });
  console.log('--- CONVERSATIONS ---');
  convs.forEach(c => {
    console.log({
      id: c.id,
      pageId: c.pageId,
      customerName: c.customerName,
      senderPsid: c.senderPsid,
      status: c.status,
      aiEnabled: c.aiEnabled,
      lastMessageAt: c.lastMessageAt,
      lastSeenAt: c.lastSeenAt,
      followUpSentCount: c.followUpSentCount,
      lastFollowUpSentAt: c.lastFollowUpSentAt,
      lastMessageDirection: c.messages[0]?.direction,
      lastMessageText: c.messages[0]?.messageText?.slice(0, 30),
    });
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
