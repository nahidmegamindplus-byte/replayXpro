const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableRLS() {
  console.log('Connecting to database and enabling Row Level Security (RLS) on all public tables...');

  try {
    // Get all user tables in the public schema
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '_prisma_%';
    `;

    console.log(`Found ${tables.length} tables in public schema:`);
    for (const row of tables) {
      const tableName = row.table_name;
      console.log(`Enabling RLS on: "public"."${tableName}"`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."${tableName}" ENABLE ROW LEVEL SECURITY;`);
    }

    console.log('\nAll tables successfully secured with Row Level Security (RLS)!');
  } catch (error) {
    console.error('Error enabling RLS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableRLS();
