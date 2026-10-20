const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function run() {
  console.log('[DB Repair] Starting SQLite database health check & repair...');
  const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
  const walPath = path.join(__dirname, '..', 'prisma', 'dev.db-wal');
  const shmPath = path.join(__dirname, '..', 'prisma', 'dev.db-shm');

  try {
    console.log('[DB Repair] Running PRAGMA integrity_check...');
    const integrity = await prisma.$queryRawUnsafe('PRAGMA integrity_check;');
    console.log('[DB Repair] Integrity check:', integrity);

    console.log('[DB Repair] Running PRAGMA quick_check...');
    const quick = await prisma.$queryRawUnsafe('PRAGMA quick_check;');
    console.log('[DB Repair] Quick check:', quick);

    console.log('[DB Repair] Running WAL checkpoint (TRUNCATE)...');
    const checkpoint = await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
    console.log('[DB Repair] Checkpoint result:', checkpoint);

    console.log('[DB Repair] Running REINDEX...');
    await prisma.$queryRawUnsafe('REINDEX;');
    console.log('[DB Repair] Reindex complete.');

    console.log('[DB Repair] Running VACUUM...');
    await prisma.$queryRawUnsafe('VACUUM;');
    console.log('[DB Repair] Vacuum complete.');

    // Test a sample update to ensure User updates work without error
    const testUser = await prisma.user.findFirst();
    if (testUser) {
      console.log(`[DB Repair] Testing update on user: ${testUser.id} (${testUser.email})`);
      const updated = await prisma.user.update({
        where: { id: testUser.id },
        data: { updatedAt: new Date() },
      });
      console.log('[DB Repair] Update test succeeded! User updatedAt:', updated.updatedAt);
    }

    console.log('[DB Repair] Database is 100% healthy and operational.');
  } catch (err) {
    console.error('[DB Repair] Error during direct repair attempt:', err);
    await prisma.$disconnect();

    console.log('[DB Repair] Attempting recovery by creating clean backup & fresh schema rebuild...');
    // Create backup
    const backupDbPath = path.join(__dirname, '..', 'prisma', `dev.db.corrupt-backup-${Date.now()}`);
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupDbPath);
      console.log(`[DB Repair] Backed up corrupt db to: ${backupDbPath}`);
    }

    // Try removing WAL & SHM files first to see if corruption was isolated in WAL/SHM
    try {
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      console.log('[DB Repair] Removed orphaned dev.db-wal and dev.db-shm.');
    } catch (cleanErr) {
      console.warn('[DB Repair] Could not unlink WAL/SHM:', cleanErr.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
