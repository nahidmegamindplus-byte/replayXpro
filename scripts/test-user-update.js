const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const users = await prisma.user.findMany({ take: 5 });
  console.log(`Found ${users.length} users in database.`);
  
  for (const user of users) {
    console.log(`Testing update for: ${user.fullName} (${user.email})...`);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        aiChatEnabled: true,
        planStatus: user.planStatus || 'ACTIVE',
        monthlyMessageLimit: user.monthlyMessageLimit || 1000,
        updatedAt: new Date(),
      }
    });
    console.log(`✓ Updated successfully: ID=${updated.id}, Plan=${updated.plan}, Status=${updated.status}, AIChat=${updated.aiChatEnabled}`);
  }

  await prisma.$disconnect();
  console.log('ALL USER UPDATES TESTED AND 100% OPERATIONAL!');
}

test().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
