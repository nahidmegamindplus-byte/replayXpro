import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/crypto';
import { getSteadfastBalance, getPathaoAccessToken, getPathaoStores } from '@/lib/courier';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const courier = await prisma.courierSetting.findUnique({
      where: { userId: auth.user.id },
    });

    if (!courier) {
      return NextResponse.json({
        success: true,
        settings: {
          defaultProvider: 'STEADFAST',
          steadfast: {
            hasApiKey: false,
            hasSecretKey: false,
            isActive: false,
            currentBalance: null,
            balanceError: null,
          },
          pathao: {
            hasClientId: false,
            hasClientSecret: false,
            hasUsername: false,
            hasPassword: false,
            storeId: null,
            isActive: false,
            stores: [],
          },
        },
      });
    }

    // 1. Check Steadfast Balance
    let steadfastBalance: number | null = null;
    let steadfastBalanceError: string | null = null;
    const sfApiKey = courier.steadfastApiKeyEncrypted || courier.apiKeyEncrypted;
    const sfSecretKey = courier.steadfastSecretKeyEncrypted || courier.secretKeyEncrypted;
    const sfActive = courier.steadfastActive && courier.isActive;

    if (sfApiKey && sfSecretKey && sfActive) {
      const apiKey = decrypt(sfApiKey);
      const secretKey = decrypt(sfSecretKey);
      const balRes = await getSteadfastBalance(apiKey, secretKey);
      if (balRes.success) {
        steadfastBalance = balRes.currentBalance ?? 0;
      } else {
        steadfastBalanceError = balRes.error || null;
      }
    }

    // 2. Check Pathao Connection & Stores
    let pathaoStores: any[] = [];
    let pathaoError: string | null = null;

    if (
      courier.pathaoClientIdEncrypted &&
      courier.pathaoClientSecretEncrypted &&
      courier.pathaoUsernameEncrypted &&
      courier.pathaoPasswordEncrypted
    ) {
      try {
        const tokenRes = await getPathaoAccessToken({
          clientId: decrypt(courier.pathaoClientIdEncrypted),
          clientSecret: decrypt(courier.pathaoClientSecretEncrypted),
          username: decrypt(courier.pathaoUsernameEncrypted),
          password: decrypt(courier.pathaoPasswordEncrypted),
        });

        if (tokenRes.success && tokenRes.accessToken) {
          const storesRes = await getPathaoStores(tokenRes.accessToken);
          if (storesRes.success && storesRes.stores) {
            pathaoStores = storesRes.stores;
          }
        } else {
          pathaoError = tokenRes.error || null;
        }
      } catch (err: any) {
        pathaoError = err?.message || null;
      }
    }

    return NextResponse.json({
      success: true,
      settings: {
        defaultProvider: courier.provider || 'STEADFAST',
        steadfast: {
          hasApiKey: Boolean(sfApiKey),
          hasSecretKey: Boolean(sfSecretKey),
          isActive: sfActive,
          currentBalance: steadfastBalance,
          balanceError: steadfastBalanceError,
        },
        pathao: {
          hasClientId: Boolean(courier.pathaoClientIdEncrypted),
          hasClientSecret: Boolean(courier.pathaoClientSecretEncrypted),
          hasUsername: Boolean(courier.pathaoUsernameEncrypted),
          hasPassword: Boolean(courier.pathaoPasswordEncrypted),
          storeId: courier.pathaoStoreId || (pathaoStores[0]?.store_id ? String(pathaoStores[0].store_id) : null),
          isActive: courier.pathaoActive,
          stores: pathaoStores,
          error: pathaoError,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'কুরিয়ার সেটিংস লোড করতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const body = await req.json();
    const { provider = 'STEADFAST', steadfast, pathao } = body;

    const existing = await prisma.courierSetting.findUnique({
      where: { userId: auth.user.id },
    });

    const updateData: any = {
      provider,
    };

    // 1. Process Steadfast update if provided
    if (steadfast) {
      const apiKeyEncrypted = steadfast.apiKey
        ? encrypt(steadfast.apiKey.trim())
        : existing?.steadfastApiKeyEncrypted || existing?.apiKeyEncrypted;
      const secretKeyEncrypted = steadfast.secretKey
        ? encrypt(steadfast.secretKey.trim())
        : existing?.steadfastSecretKeyEncrypted || existing?.secretKeyEncrypted;

      if (steadfast.apiKey || steadfast.secretKey) {
        const plainKey = steadfast.apiKey ? steadfast.apiKey.trim() : decrypt(apiKeyEncrypted!);
        const plainSecret = steadfast.secretKey ? steadfast.secretKey.trim() : decrypt(secretKeyEncrypted!);
        const testRes = await getSteadfastBalance(plainKey, plainSecret);
        if (!testRes.success) {
          return NextResponse.json(
            { success: false, error: testRes.error || 'Steadfast API Key অথবা Secret Key সঠিক নয়।' },
            { status: 400 }
          );
        }
      }

      updateData.steadfastApiKeyEncrypted = apiKeyEncrypted;
      updateData.steadfastSecretKeyEncrypted = secretKeyEncrypted;
      updateData.apiKeyEncrypted = apiKeyEncrypted;
      updateData.secretKeyEncrypted = secretKeyEncrypted;
      updateData.steadfastActive = steadfast.isActive !== undefined ? Boolean(steadfast.isActive) : true;
      updateData.isActive = updateData.steadfastActive;
    }

    // 2. Process Pathao update if provided
    if (pathao) {
      const clientId = pathao.clientId
        ? encrypt(pathao.clientId.trim())
        : existing?.pathaoClientIdEncrypted;
      const clientSecret = pathao.clientSecret
        ? encrypt(pathao.clientSecret.trim())
        : existing?.pathaoClientSecretEncrypted;
      const username = pathao.username
        ? encrypt(pathao.username.trim())
        : existing?.pathaoUsernameEncrypted;
      const password = pathao.password
        ? encrypt(pathao.password.trim())
        : existing?.pathaoPasswordEncrypted;

      if (pathao.clientId || pathao.clientSecret || pathao.username || pathao.password) {
        if (!clientId || !clientSecret || !username || !password) {
          return NextResponse.json(
            { success: false, error: 'Pathao Client ID, Secret, Username ও Password সবগুলো পূরণ করা আবশ্যক।' },
            { status: 400 }
          );
        }

        const testRes = await getPathaoAccessToken({
          clientId: pathao.clientId ? pathao.clientId.trim() : decrypt(clientId),
          clientSecret: pathao.clientSecret ? pathao.clientSecret.trim() : decrypt(clientSecret),
          username: pathao.username ? pathao.username.trim() : decrypt(username),
          password: pathao.password ? pathao.password.trim() : decrypt(password),
        });

        if (!testRes.success || !testRes.accessToken) {
          return NextResponse.json(
            { success: false, error: testRes.error || 'Pathao লগইন তথ্য সঠিক নয়। ক্রেডেনশিয়াল যাচাই করুন।' },
            { status: 400 }
          );
        }

        // Fetch default store if not selected
        if (!pathao.storeId && !existing?.pathaoStoreId) {
          const storesRes = await getPathaoStores(testRes.accessToken);
          if (storesRes.success && storesRes.stores && storesRes.stores.length > 0) {
            updateData.pathaoStoreId = String(storesRes.stores[0].store_id);
          }
        }
      }

      updateData.pathaoClientIdEncrypted = clientId;
      updateData.pathaoClientSecretEncrypted = clientSecret;
      updateData.pathaoUsernameEncrypted = username;
      updateData.pathaoPasswordEncrypted = password;
      if (pathao.storeId) updateData.pathaoStoreId = String(pathao.storeId);
      if (pathao.isActive !== undefined) updateData.pathaoActive = Boolean(pathao.isActive);
    }

    const saved = await prisma.courierSetting.upsert({
      where: { userId: auth.user.id },
      create: {
        userId: auth.user.id,
        ...updateData,
      },
      update: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'কুরিয়ার সেটিংস সফলভাবে সংরক্ষিত ও সংযুক্ত হয়েছে!',
      settings: saved,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'কুরিয়ার সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
