import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAuthCookieOptions, AUTH_COOKIE_NAME, ADMIN_IMPERSONATOR_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const adminToken = req.cookies.get(ADMIN_IMPERSONATOR_COOKIE)?.value;

    if (!adminToken) {
      // If no impersonator cookie exists, just redirect to /admin
      return NextResponse.json({
        success: true,
        redirect: '/admin/users',
      });
    }

    const payload = verifyToken(adminToken);
    if (!payload?.userId) {
      const resp = NextResponse.json({
        success: false,
        error: 'মেয়াদোত্তীর্ণ অ্যাডমিন সেশন। অনুগ্রহ করে পুনরায় লগইন করুন।',
      });
      resp.cookies.delete(ADMIN_IMPERSONATOR_COOKIE);
      return resp;
    }

    const response = NextResponse.json({
      success: true,
      message: 'অ্যাডমিন ড্যাশবোর্ডে সফলভাবে ফিরে এসেছেন।',
      redirect: '/admin/users',
    });

    // Restore original admin token to replyx_session
    const cookieOptions = getAuthCookieOptions(req);
    response.cookies.set(AUTH_COOKIE_NAME, adminToken, cookieOptions);

    // Delete the impersonator cookie
    response.cookies.delete(ADMIN_IMPERSONATOR_COOKIE);

    return response;
  } catch (error: any) {
    console.error('Exit impersonation error:', error);
    return NextResponse.json(
      { success: false, error: 'অ্যাডমিন প্যানেলে ফিরতে ত্রুটি হয়েছে।' },
      { status: 500 }
    );
  }
}
