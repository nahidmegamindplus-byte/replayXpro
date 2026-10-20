const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial admin and system defaults...');

  // 1. Super Admin Account
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
        planStatus: 'ACTIVE',
        monthlyMessageLimit: 999999,
        messagesSentThisMonth: 0,
      },
    });
    console.log('Super Admin user created successfully:', adminEmail);
  } else {
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        role: 'ADMIN',
        status: 'ACTIVE',
        planStatus: 'ACTIVE',
        phone: null,
      },
    });
    console.log('Super Admin user already verified.');
  }

  // 2. Default Packages
  const defaultPackages = [
    {
      name: 'স্টার্টার প্যাকেজ (Starter)',
      slug: 'starter',
      description: 'নতুন ফেসবুক পেজ এবং ছোট অনলাইন শপ বা এফ-কমার্সের জন্য আদর্শ প্যাকেজ।',
      price: 990,
      durationDays: 30,
      messageLimit: 1000,
      pageLimit: 1,
      productLimit: 50,
      features: JSON.stringify([
        '১টি ফেসবুক পেজ কানেকশন',
        '১,০০০ AI অটোমেটিক রিপ্লাই / মাস',
        '৫০টি প্রোডাক্ট ইনভেন্টরি',
        'বাংলা, English ও Banglish বোঝে',
        'স্বয়ংক্রিয় অর্ডার ক্যাপচার',
        'ইমেইল ও মেসেঞ্জার সাপোর্ট',
      ]),
      isPopular: false,
      isActive: true,
    },
    {
      name: 'বিজনেস প্রো (Business Pro)',
      slug: 'business-pro',
      description: 'মাঝারি ও দ্রুত বর্ধনশীল ই-কমার্স বিজনেসের জন্য সর্বোচ্চ চাহিদাসম্পন্ন প্যাকেজ।',
      price: 2490,
      durationDays: 30,
      messageLimit: 5000,
      pageLimit: 3,
      productLimit: 250,
      features: JSON.stringify([
        '৩টি ফেসবুক পেজ কানেকশন',
        '৫,০০০ AI অটোমেটিক রিপ্লাই / মাস',
        '২৫০টি প্রোডাক্ট ইনভেন্টরি ও ইমেজ সেন্ডিং',
        'ইমেজ ও ছবি দেখে প্রোডাক্ট শনাক্তকরণ (AI Vision)',
        'ভয়েস মেসেজ ট্রান্সক্রিপশন ও রিপ্লাই',
        'অর্ডার ট্র্যাকিং ও বিস্তারিত অ্যানালিটিক্স',
        'অগ্রাধিকার ২৪/৭ কাস্টমার সাপোর্ট',
      ]),
      isPopular: true,
      isActive: true,
    },
    {
      name: 'এন্টারপ্রাইজ প্যাকেজ (Enterprise)',
      slug: 'enterprise',
      description: 'বড় ব্র্যান্ড এবং হাই-ভলিউম সেলস পেজের জন্য আনলিমিটেড পাওয়ার ও স্কেলিং।',
      price: 4990,
      durationDays: 30,
      messageLimit: 20000,
      pageLimit: 10,
      productLimit: 1000,
      features: JSON.stringify([
        '১০টি ফেসবুক পেজ কানেকশন',
        '২০,০০০ AI মেসেজ রিপ্লাই / মাস',
        '১,০০০টি প্রোডাক্ট ইনভেন্টরি ম্যানেজমেন্ট',
        'ফুল কাস্টমাইজড AI প্রম্পট টিউনিং',
        'মাল্টি-ইউজার রোলস ও টিম অ্যাক্সেস',
        'ডেডিকেটেড একাউন্ট ম্যানেজার',
      ]),
      isPopular: false,
      isActive: true,
    },
  ];

  for (const pkg of defaultPackages) {
    const exists = await prisma.package.findUnique({ where: { slug: pkg.slug } });
    if (!exists) {
      await prisma.package.create({ data: pkg });
      console.log('Created default package:', pkg.name);
    }
  }
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
