/**
 * Safely parses a JSON string, returning a fallback default value if parsing fails.
 * Prevents unhandled SyntaxErrors from crashing API endpoints and components.
 */
export function safeJsonParse<T = any>(val: any, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val as T;
  try {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}
