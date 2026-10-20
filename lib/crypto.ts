import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const DEFAULT_SECRET = 'replyx_32_bytes_secret_key_2026!';

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || DEFAULT_SECRET;
  // Use SHA-256 to ensure exact 32-byte key
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt sensitive plain text using AES-256-GCM.
 * Output format: iv_hex:authTag_hex:encrypted_hex
 */
export function encrypt(plainText: string): string {
  if (!plainText) return '';
  try {
    const key = getKey();
    const iv = crypto.randomBytes(12); // 12 bytes recommended for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt AES-256-GCM encrypted string.
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      // If data is not in encrypted format (e.g. legacy/plain), return as-is safely
      return encryptedData;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return empty or masked on failure instead of crashing
    return '';
  }
}

/**
 * Mask sensitive tokens for safe display in UI
 * e.g., EAAB...1234
 */
export function maskToken(token: string | null | undefined): string {
  if (!token) return '••••••••••••';
  if (token.length <= 8) return '••••••••';
  return `${token.substring(0, 4)}••••••••${token.substring(token.length - 4)}`;
}
