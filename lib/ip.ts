import { NextRequest } from 'next/server';
import prisma from '@/lib/db';

/**
 * Extracts the real client IP address from request headers
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip) => ip.trim());
    if (ips[0] && ips[0] !== '::1' && ips[0] !== '127.0.0.1') {
      return ips[0];
    }
    if (ips[0]) return ips[0];
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  const clientIp = req.headers.get('x-client-ip');
  if (clientIp) return clientIp.trim();

  return '127.0.0.1';
}

/**
 * Checks if a given IP address is blocked in the database
 */
export async function isIpBlocked(ipAddress: string): Promise<boolean> {
  if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1') {
    // Check if localhost was explicitly blocked
    const isExplicitlyBlocked = await prisma.ipBlockList.findUnique({
      where: { ipAddress },
    });
    return Boolean(isExplicitlyBlocked);
  }

  try {
    const blockRecord = await prisma.ipBlockList.findUnique({
      where: { ipAddress },
    });
    return Boolean(blockRecord);
  } catch (error) {
    return false;
  }
}
