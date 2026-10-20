import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db-init';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureDatabaseReady();
    // Quick test query
    await prisma.$queryRawUnsafe('SELECT 1;');

    return NextResponse.json(
      {
        status: 'UP',
        database: 'CONNECTED',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Health check database query failure:', error);
    return NextResponse.json(
      {
        status: 'DEGRADED',
        database: 'ERROR',
        error: error?.message || 'Database ping failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
