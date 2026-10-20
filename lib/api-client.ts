/**
 * Resilient API Client with Automatic Retries, Timeout Control, and Safe Error Handling
 * Eliminates transient network drops, connection losses, and unhandled fetch exceptions.
 */

export interface ApiFetchOptions extends RequestInit {
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  silent?: boolean;
}

export async function apiFetch<T = any>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    retries = 2,
    retryDelayMs = 400,
    timeoutMs = 20000,
    silent = false,
    headers,
    ...fetchOptions
  } = options;

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const mergedHeaders = new Headers(headers || {});
      if (!mergedHeaders.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
        mergedHeaders.set('Content-Type', 'application/json');
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers: mergedHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle server error status codes that are transient
      if ([502, 503, 504].includes(response.status) && attempt < retries) {
        attempt++;
        const backoff = retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise((res) => setTimeout(res, backoff));
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = { success: false, error: 'সার্ভার থেকে সঠিক তথ্য পাওয়া যায়নি।' };
        }
      } else {
        const text = await response.text();
        data = { success: response.ok, message: text };
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      const isAbort = err?.name === 'AbortError';
      const isNetwork =
        err instanceof TypeError ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('aborted');

      if ((isNetwork || isAbort) && attempt < retries) {
        attempt++;
        const backoff = retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise((res) => setTimeout(res, backoff));
        continue;
      }

      break;
    }
  }

  if (!silent) {
    console.warn(`[ApiFetch] Request to ${url} failed after ${attempt} retry(ies):`, lastError);
  }

  return {
    success: false,
    error: lastError?.message || 'সার্ভারে সাময়িক যোগাযোগ বিঘ্ন ঘটেছে। স্বয়ংক্রিয়ভাবে পুনরায় চেষ্টা করা হচ্ছে।',
    isNetworkError: true,
  } as unknown as T;
}

export default apiFetch;
