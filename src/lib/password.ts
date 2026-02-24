import crypto from 'crypto';

const PBKDF2_ITERATIONS = 100000;
const HASH_LENGTH = 64;
const SALT_LENGTH = 32;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, HASH_LENGTH, 'sha512');
  return `${salt}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    
    const verifyHash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, HASH_LENGTH, 'sha512');
    return hash === verifyHash.toString('hex');
  } catch {
    return false;
  }
}
