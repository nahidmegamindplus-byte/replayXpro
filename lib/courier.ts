import { serverLogger } from './logger';

// -------------------------------------------------------------
// 1. STEADFAST COURIER
// -------------------------------------------------------------

export interface SteadfastOrderPayload {
  apiKey: string;
  secretKey: string;
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number;
  note?: string;
}

export interface SteadfastOrderResult {
  success: boolean;
  consignmentId?: string;
  trackingCode?: string;
  status?: string;
  message?: string;
  error?: string;
}

export interface SteadfastStatusResult {
  success: boolean;
  deliveryStatus?: string;
  consignment?: any;
  error?: string;
}

const STEADFAST_BASE_URL = 'https://portal.steadfast.courier/api/v1';

export async function createSteadfastOrder(
  payload: SteadfastOrderPayload
): Promise<SteadfastOrderResult> {
  const { apiKey, secretKey, invoice, recipientName, recipientPhone, recipientAddress, codAmount, note } = payload;

  if (!apiKey || !secretKey) {
    return { success: false, error: 'Steadfast API Key বা Secret Key প্রদান করা হয়নি।' };
  }

  let cleanPhone = recipientPhone.replace(/[^\d]/g, '');
  if (cleanPhone.startsWith('8801') && cleanPhone.length === 13) {
    cleanPhone = cleanPhone.slice(2);
  }

  try {
    const res = await fetch(`${STEADFAST_BASE_URL}/create_order`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey.trim(),
        'Secret-Key': secretKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoice: invoice || `INV-${Date.now().toString().slice(-6)}`,
        recipient_name: recipientName.trim(),
        recipient_phone: cleanPhone,
        recipient_address: recipientAddress.trim(),
        cod_amount: Math.round(Number(codAmount) || 0),
        note: note || 'Order via ReplyX AI',
      }),
    });

    const data = await res.json();

    if (!res.ok || (data.status !== 200 && data.status !== '200')) {
      const errMsg =
        data.message ||
        (data.errors ? Object.values(data.errors).flat().join(', ') : 'Steadfast-এ অর্ডার পাঠানো ব্যর্থ হয়েছে।');
      serverLogger.error('Steadfast Create Order Failed', { status: data.status, data });
      return { success: false, error: errMsg };
    }

    const consignment = data.consignment || {};
    return {
      success: true,
      consignmentId: consignment.consignment_id ? String(consignment.consignment_id) : undefined,
      trackingCode: consignment.tracking_code || undefined,
      status: consignment.status || 'in_review',
      message: data.message || 'Steadfast কুরিয়ারে সফলভাবে বুকিং সম্পন্ন হয়েছে!',
    };
  } catch (err: any) {
    serverLogger.error('Steadfast API Network Error', err);
    return { success: false, error: err?.message || 'Steadfast সার্ভারের সাথে যোগাযোগ করা যায়নি।' };
  }
}

export async function getSteadfastDeliveryStatus(params: {
  apiKey: string;
  secretKey: string;
  consignmentId?: string | null;
  trackingCode?: string | null;
  invoice?: string | null;
}): Promise<SteadfastStatusResult> {
  const { apiKey, secretKey, consignmentId, trackingCode, invoice } = params;

  if (!apiKey || !secretKey) {
    return { success: false, error: 'Steadfast Credentials missing' };
  }

  let endpoint = '';
  if (consignmentId) {
    endpoint = `${STEADFAST_BASE_URL}/status_by_cid/${encodeURIComponent(consignmentId)}`;
  } else if (trackingCode) {
    endpoint = `${STEADFAST_BASE_URL}/status_by_trackingcode/${encodeURIComponent(trackingCode)}`;
  } else if (invoice) {
    endpoint = `${STEADFAST_BASE_URL}/status_by_invoice/${encodeURIComponent(invoice)}`;
  } else {
    return { success: false, error: 'Consignment ID, Tracking Code বা Invoice ID প্রয়োজন।' };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey.trim(),
        'Secret-Key': secretKey.trim(),
      },
    });

    const data = await res.json();
    if (!res.ok || data.status !== 200) {
      return { success: false, error: data.message || 'Status query failed' };
    }

    return {
      success: true,
      deliveryStatus: data.delivery_status || data.status || 'unknown',
      consignment: data,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error fetching status' };
  }
}

export async function getSteadfastBalance(
  apiKey: string,
  secretKey: string
): Promise<{ success: boolean; currentBalance?: number; error?: string }> {
  try {
    const res = await fetch(`${STEADFAST_BASE_URL}/get_balance`, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey.trim(),
        'Secret-Key': secretKey.trim(),
      },
    });

    const data = await res.json();
    if (!res.ok || data.status !== 200) {
      return { success: false, error: data.message || 'Failed to get balance' };
    }

    return {
      success: true,
      currentBalance: data.current_balance ?? 0,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

// -------------------------------------------------------------
// 2. PATHAO COURIER (Pathao Merchant Aladdin API)
// -------------------------------------------------------------

const PATHAO_BASE_URL = 'https://api-hermes.pathao.com/aladdin/api/v1';

export interface PathaoCredentials {
  clientId: string;
  clientSecret: string;
  username: string; // Merchant registered email
  password: string; // Merchant password
}

export interface PathaoStore {
  store_id: number;
  store_name: string;
  store_address: string;
  is_active: number | boolean;
}

export interface PathaoOrderPayload {
  accessToken: string;
  storeId: number | string;
  merchantOrderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity?: number;
  recipientZone?: number;
  recipientArea?: number;
  codAmount: number;
  itemQuantity?: number;
  itemWeight?: number; // In KG (default 0.5)
  itemDescription?: string;
  specialInstruction?: string;
}

export interface PathaoOrderResult {
  success: boolean;
  consignmentId?: string;
  deliveryFee?: number;
  orderStatus?: string;
  message?: string;
  error?: string;
}

/**
 * Obtain Pathao OAuth2 Access Token
 */
export async function getPathaoAccessToken(
  creds: PathaoCredentials
): Promise<{ success: boolean; accessToken?: string; expiresIn?: number; error?: string }> {
  const { clientId, clientSecret, username, password } = creds;

  if (!clientId || !clientSecret || !username || !password) {
    return {
      success: false,
      error: 'Pathao Client ID, Client Secret, Username (Email) এবং Password আবশ্যক।',
    };
  }

  try {
    const res = await fetch(`${PATHAO_BASE_URL}/issue-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        username: username.trim(),
        password: password.trim(),
        grant_type: 'password',
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.access_token) {
      const errMsg =
        data.message ||
        data.error_description ||
        (data.errors ? Object.values(data.errors).flat().join(', ') : 'Pathao টোকেন সংগ্রহ ব্যর্থ হয়েছে।');
      serverLogger.error('Pathao issue-token failed', { status: res.status, data });
      return { success: false, error: errMsg };
    }

    return {
      success: true,
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (err: any) {
    serverLogger.error('Pathao token network error', err);
    return { success: false, error: err?.message || 'Pathao সার্ভারের সাথে সংযোগ করা যায়নি।' };
  }
}

/**
 * Fetch Merchant Stores from Pathao
 */
export async function getPathaoStores(
  accessToken: string
): Promise<{ success: boolean; stores?: PathaoStore[]; error?: string }> {
  try {
    const res = await fetch(`${PATHAO_BASE_URL}/stores`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
        Accept: 'application/json',
      },
    });

    const data = await res.json();
    if (!res.ok || !data.data) {
      return { success: false, error: data.message || 'Pathao স্টোর তালিকা পাওয়া যায়নি।' };
    }

    const stores: PathaoStore[] = Array.isArray(data.data?.data)
      ? data.data.data
      : Array.isArray(data.data)
      ? data.data
      : [];

    return { success: true, stores };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Pathao স্টোর অনুসন্ধানে ত্রুটি।' };
  }
}

/**
 * Create Order on Pathao Courier
 */
export async function createPathaoOrder(
  payload: PathaoOrderPayload
): Promise<PathaoOrderResult> {
  const {
    accessToken,
    storeId,
    merchantOrderId,
    recipientName,
    recipientPhone,
    recipientAddress,
    recipientCity = 1, // Default Dhaka
    recipientZone = 14, // Default Dhaka zone
    codAmount,
    itemQuantity = 1,
    itemWeight = 0.5,
    itemDescription,
    specialInstruction,
  } = payload;

  if (!accessToken || !storeId) {
    return { success: false, error: 'Pathao Access Token এবং Store ID প্রয়োজন।' };
  }

  // Clean phone number (Pathao expects valid 11 digits format for BD)
  let cleanPhone = recipientPhone.replace(/[^\d]/g, '');
  if (cleanPhone.startsWith('8801') && cleanPhone.length === 13) {
    cleanPhone = cleanPhone.slice(2);
  }

  try {
    const res = await fetch(`${PATHAO_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        store_id: Number(storeId),
        merchant_order_id: merchantOrderId || `RPLX-${Date.now().toString().slice(-6)}`,
        recipient_name: recipientName.trim(),
        recipient_phone: cleanPhone,
        recipient_address: recipientAddress.trim(),
        recipient_city: Number(recipientCity) || 1,
        recipient_zone: Number(recipientZone) || 14,
        delivery_type: 48, // 48-hour delivery
        item_type: 2, // Parcel
        special_instruction: specialInstruction || 'Handle with care',
        item_quantity: Math.max(1, Number(itemQuantity) || 1),
        item_weight: Math.max(0.5, Number(itemWeight) || 0.5),
        amount_to_collect: Math.round(Number(codAmount) || 0),
        item_description: itemDescription || 'E-commerce product',
      }),
    });

    const data = await res.json();

    if (!res.ok || data.type === 'error' || !data.data?.consignment_id) {
      const errMsg =
        data.message ||
        (data.errors ? Object.values(data.errors).flat().join(', ') : 'Pathao-এ অর্ডার তৈরি ব্যর্থ হয়েছে।');
      serverLogger.error('Pathao Create Order Error', { status: res.status, data });
      return { success: false, error: errMsg };
    }

    return {
      success: true,
      consignmentId: data.data.consignment_id,
      deliveryFee: data.data.delivery_fee,
      orderStatus: data.data.order_status || 'Pending',
      message: data.message || 'Pathao কুরিয়ারে সফলভাবে বুকিং সম্পন্ন হয়েছে!',
    };
  } catch (err: any) {
    serverLogger.error('Pathao order dispatch network error', err);
    return { success: false, error: err?.message || 'Pathao সার্ভারের সাথে সংযোগ করা যায়নি।' };
  }
}

/**
 * Check Delivery Status on Pathao Courier
 */
export async function getPathaoDeliveryStatus(
  accessToken: string,
  consignmentId: string
): Promise<{ success: boolean; deliveryStatus?: string; raw?: any; error?: string }> {
  try {
    const res = await fetch(`${PATHAO_BASE_URL}/orders/${encodeURIComponent(consignmentId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
        Accept: 'application/json',
      },
    });

    const data = await res.json();
    if (!res.ok || !data.data) {
      return { success: false, error: data.message || 'Pathao অর্ডার স্ট্যাটাস পাওয়া যায়নি।' };
    }

    return {
      success: true,
      deliveryStatus: data.data.order_status || 'Pending',
      raw: data.data,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Pathao স্ট্যাটাস নেটওয়ার্ক ত্রুটি।' };
  }
}
