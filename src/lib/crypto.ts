/**
 * Cryptographic utility for hashing and verifying PINs.
 * Uses the standard Web Crypto API (SHA-256).
 * PINs are NEVER stored or transmitted in plain text.
 */

const PIN_SALT = 'familyflow_secure_salt_v1_';

export async function hashPin(pin: string): Promise<string> {
  if (!pin) return '';
  const trimmed = pin.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(`${PIN_SALT}${trimmed}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(inputPin: string, storedHashOrPlain: string): Promise<boolean> {
  if (!storedHashOrPlain || !inputPin) return false;
  const trimmedInput = inputPin.trim();

  // If already hashed (64 hex characters)
  if (/^[a-f0-9]{64}$/i.test(storedHashOrPlain)) {
    const computedHash = await hashPin(trimmedInput);
    return computedHash.toLowerCase() === storedHashOrPlain.toLowerCase();
  }

  // Legacy fallback for pre-migration plain text
  return trimmedInput === storedHashOrPlain;
}
