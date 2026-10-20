/**
 * Helper to parse numbers from user inputs that may contain:
 * - Bengali numerals: ০, ১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯
 * - Currency symbols: ৳, Tk, tk, $, spaces
 * - Formatted commas: 1,500.00
 *
 * Always returns a clean, finite number or the fallback. Never returns NaN.
 */
export function parseFlexibleNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;

  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? fallback : val;
  }

  let str = String(val).trim();
  if (!str) return fallback;

  // Map Bengali digits to English digits
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  for (let i = 0; i < 10; i++) {
    str = str.replaceAll(bengaliDigits[i], String(i));
  }

  // Remove commas, currency symbols, and extra characters
  str = str.replace(/[৳$,\sTk]/gi, '');

  const parsed = parseFloat(str);
  return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed;
}

export function parseFlexibleInt(val: any, fallback = 0): number {
  const num = parseFlexibleNumber(val, fallback);
  return Math.round(num);
}
