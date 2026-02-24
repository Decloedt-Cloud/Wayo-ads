/**
 * Encryption Utility
 * 
 * Provides AES-256-GCM encryption for sensitive data like API keys.
 * Uses APP_ENCRYPTION_KEY environment variable (32 bytes, base64 encoded).
 * 
 * Security notes:
 * - Never log encrypted or decrypted values
 * - Always validate the encryption key is present before use
 * - Use constant-time comparison for sensitive operations
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// ============================================
// TYPES
// ============================================

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export interface EncryptionResult {
  success: boolean;
  data?: string; // Serialized encrypted data
  error?: string;
}

export interface DecryptionResult {
  success: boolean;
  data?: string;
  error?: string;
}

// ============================================
// CONSTANTS
// ============================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for GCM
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 32 bytes for AES-256

// ============================================
// ERROR CODES
// ============================================

export class EncryptionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

export const EncryptionErrorCodes = {
  ENCRYPTION_KEY_NOT_SET: 'ENCRYPTION_KEY_NOT_SET',
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  INVALID_ENCRYPTED_DATA: 'INVALID_ENCRYPTED_DATA',
  INVALID_KEY_FORMAT: 'INVALID_KEY_FORMAT',
} as const;

// ============================================
// KEY MANAGEMENT
// ============================================

/**
 * Get the encryption key from environment variable
 * The key should be a base64-encoded 32-byte key
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.APP_ENCRYPTION_KEY;
  
  if (!keyEnv) {
    throw new EncryptionError(
      'APP_ENCRYPTION_KEY environment variable is not set',
      EncryptionErrorCodes.ENCRYPTION_KEY_NOT_SET
    );
  }
  
  try {
    // Try to decode as base64
    const keyBuffer = Buffer.from(keyEnv, 'base64');
    
    // Validate key length
    if (keyBuffer.length !== KEY_LENGTH) {
      // If not exactly 32 bytes, derive a key using scrypt
      return deriveKey(keyEnv);
    }
    
    return keyBuffer;
  } catch {
    // If base64 decode fails, derive key from string
    return deriveKey(keyEnv);
  }
}

/**
 * Derive a 32-byte key from a passphrase using scrypt
 */
function deriveKey(passphrase: string): Buffer {
  // Use a fixed salt for deterministic key derivation
  // In production, you might want to use a random salt stored separately
  const salt = Buffer.from('wayo-ads-encryption-salt-v1', 'utf-8');
  
  return scryptSync(passphrase, salt, KEY_LENGTH);
}

// ============================================
// ENCRYPTION FUNCTIONS
// ============================================

/**
 * Encrypt a plaintext string using AES-256-GCM
 * 
 * @param plaintext - The string to encrypt
 * @returns Serialized encrypted data (ciphertext:iv:authTag in base64)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  
  try {
    // Generate random IV
    const iv = randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf-8'),
      cipher.final(),
    ]);
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Serialize: ciphertext:iv:authTag (all base64)
    return [
      encrypted.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
    ].join(':');
  } catch (error) {
    console.error('[Crypto] Encryption failed:', error instanceof Error ? error.message : 'Unknown error');
    throw new EncryptionError(
      'Failed to encrypt data',
      EncryptionErrorCodes.ENCRYPTION_FAILED
    );
  }
}

/**
 * Decrypt an encrypted string
 * 
 * @param serializedData - The serialized encrypted data (ciphertext:iv:authTag)
 * @returns The decrypted plaintext
 */
export function decrypt(serializedData: string): string {
  const key = getEncryptionKey();
  
  try {
    // Parse serialized data
    const parts = serializedData.split(':');
    
    if (parts.length !== 3) {
      throw new EncryptionError(
        'Invalid encrypted data format',
        EncryptionErrorCodes.INVALID_ENCRYPTED_DATA
      );
    }
    
    const [ciphertextB64, ivB64, authTagB64] = parts;
    
    const ciphertext = Buffer.from(ciphertextB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    
    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new EncryptionError(
        'Invalid IV length',
        EncryptionErrorCodes.INVALID_ENCRYPTED_DATA
      );
    }
    
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new EncryptionError(
        'Invalid auth tag length',
        EncryptionErrorCodes.INVALID_ENCRYPTED_DATA
      );
    }
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    
    return decrypted.toString('utf-8');
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    
    // Don't log the actual error to avoid leaking info
    console.error('[Crypto] Decryption failed');
    throw new EncryptionError(
      'Failed to decrypt data',
      EncryptionErrorCodes.DECRYPTION_FAILED
    );
  }
}

// ============================================
// SAFE WRAPPER FUNCTIONS
// ============================================

/**
 * Safely encrypt data, returning a result object instead of throwing
 */
export function safeEncrypt(plaintext: string): EncryptionResult {
  try {
    const encrypted = encrypt(plaintext);
    return { success: true, data: encrypted };
  } catch (error) {
    return {
      success: false,
      error: error instanceof EncryptionError ? error.code : 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Safely decrypt data, returning a result object instead of throwing
 */
export function safeDecrypt(serializedData: string): DecryptionResult {
  try {
    const decrypted = decrypt(serializedData);
    return { success: true, data: decrypted };
  } catch (error) {
    return {
      success: false,
      error: error instanceof EncryptionError ? error.code : 'UNKNOWN_ERROR',
    };
  }
}

// ============================================
// MASKING UTILITIES
// ============================================

/**
 * Mask a sensitive value for display
 * Shows first 8 and last 4 characters, masks the rest
 * 
 * @example maskSecret('sk_live_abcdef1234567890') => 'sk_live_****7890'
 */
export function maskSecret(value: string): string {
  if (!value || value.length < 12) {
    return '****';
  }
  
  const prefixLength = Math.min(8, Math.floor(value.length / 3));
  const suffixLength = Math.min(4, Math.floor(value.length / 4));
  
  const prefix = value.slice(0, prefixLength);
  const suffix = value.slice(-suffixLength);
  
  return `${prefix}****${suffix}`;
}

/**
 * Mask a publishable key (less sensitive, can show more)
 */
export function maskPublishableKey(key: string): string {
  if (!key || key.length < 8) {
    return '****';
  }
  
  // Show "pk_test_" or "pk_live_" prefix and last 4 chars
  const prefixMatch = key.match(/^(pk_(?:test|live)_)/);
  const prefix = prefixMatch ? prefixMatch[1] : key.slice(0, 8);
  const suffix = key.slice(-4);
  
  return `${prefix}****${suffix}`;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that the encryption key works by doing a test encrypt/decrypt
 */
export function validateEncryptionKey(): { valid: boolean; error?: string } {
  try {
    const testValue = 'test-encryption-value-' + Date.now();
    const encrypted = encrypt(testValue);
    const decrypted = decrypt(encrypted);
    
    if (decrypted !== testValue) {
      return { valid: false, error: 'Encryption/decryption mismatch' };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
