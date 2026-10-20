const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function clean() {
  console.log('Cleaning database of all demo/test data...');

  // Delete dependent rows first
  await prisma.activityLog.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.page.deleteMany({});
  await prisma.aiSetting.deleteMany({});

  // Delete only fake test users
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: 'test_' } },
        { email: { contains: 'dfdf' } },
        { email: { contains: 'sd' } },
      ],
    },
  });

  // Delete any dummy payment methods with placeholder numbers
  await prisma.paymentMethod.deleteMany({
    where: {
      accountNumber: {
        in: ['01700000000', '01800000000', '01900000000', '01600000000', '01712345678'],
      },
    },
  });

  // Ensure clean Super Admin exists
  const adminEmail = 'admin@replyx.ai';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  const passwordHash = await bcrypt.hash('admin123456', 10);
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        fullName: 'Super Admin',
        businessName: 'ReplyX AI Platform',
        email: adminEmail,
        passwordHash,
        phone: null,
        role: 'ADMIN',
        status: 'ACTIVE',
        plan: 'PRO',
        monthlyMessageLimit: 999999,
        messagesSentThisMonth: 0,
      },
    });
    console.log('Clean Super Admin created.');
  } else {
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        plan: 'PRO',
        phone: null,
        monthlyMessageLimit: 999999,
        messagesSentThisMonth: 0,
      },
    });
    console.log('Super Admin reset to clean state.');
  }

  console.log('Database is now completely clean without any demo data!');
}

clean()
  .catch((e) => {
    console.error('Clean error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
