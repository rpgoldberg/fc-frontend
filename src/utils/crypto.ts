/**
 * Web Crypto API utilities for encrypting/decrypting MFC cookies
 * Uses AES-GCM for authenticated encryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM

/**
 * Generates a cryptographic key from a password using PBKDF2
 * The password is derived from a combination of user-specific data
 */
async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  // Use a combination of factors for the key derivation
  // In a real app, this might include user ID, but for client-side only we use a fixed pepper
  const pepper = 'figurecollector-mfc-cookie-encryption-v1';

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(pepper);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data using AES-GCM
 */
export async function encrypt(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random salt and IV
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(salt);

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    data
  );

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  // Convert to base64 (avoiding spread operator for TS compatibility)
  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Decrypts data using AES-GCM
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    // Decode from base64 (avoiding Uint8Array.from for TS compatibility)
    const binaryString = atob(ciphertext);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 16 + IV_LENGTH);
    const encrypted = combined.slice(16 + IV_LENGTH);

    const key = await deriveKey(salt);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Storage types for MFC cookies
 * - session: Stored in sessionStorage, cleared on logout
 * - persistent: Encrypted and stored in localStorage until manually cleared
 */
export type StorageType = 'session' | 'persistent';

const STORAGE_KEY = 'mfc_auth_encrypted';
const STORAGE_TYPE_KEY = 'mfc_auth_storage_type';

/**
 * Stores MFC cookies with encryption (if persistent)
 */
export async function storeMfcCookies(
  cookies: string,
  storageType: StorageType
): Promise<void> {
  // Clear any existing storage first
  clearMfcCookies();

  const storage = storageType === 'persistent' ? localStorage : sessionStorage;

  if (storageType === 'persistent') {
    // Encrypt for persistent storage
    const encrypted = await encrypt(cookies);
    storage.setItem(STORAGE_KEY, encrypted);
  } else {
    // Store plaintext in sessionStorage (session type only)
    storage.setItem(STORAGE_KEY, cookies);
  }

  storage.setItem(STORAGE_TYPE_KEY, storageType);
}

/**
 * Retrieves stored MFC cookies
 */
export async function retrieveMfcCookies(): Promise<string | null> {
  // Check sessionStorage first (session storage)
  let cookies = sessionStorage.getItem(STORAGE_KEY);
  let storageType = sessionStorage.getItem(STORAGE_TYPE_KEY);

  // If not in session, check localStorage (persistent)
  if (!cookies) {
    cookies = localStorage.getItem(STORAGE_KEY);
    storageType = localStorage.getItem(STORAGE_TYPE_KEY);
  }

  if (!cookies || !storageType) {
    return null;
  }

  // Decrypt if from persistent storage
  if (storageType === 'persistent') {
    try {
      return await decrypt(cookies);
    } catch (error) {
      console.error('Failed to decrypt MFC cookies:', error);
      clearMfcCookies(); // Clear corrupted data
      return null;
    }
  }

  return cookies;
}

/**
 * Clears session-based MFC cookies only (for logout)
 * Preserves persistent cookies
 */
export function clearSessionCookies(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_TYPE_KEY);
}

/**
 * Clears ALL stored MFC cookies (session AND persistent)
 * Use this for manual "Clear Cookies" action only
 */
export function clearMfcCookies(): void {
  clearSessionCookies();
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_TYPE_KEY);
}

/**
 * Checks if MFC cookies are currently stored
 */
export function hasMfcCookies(): boolean {
  return !!(
    sessionStorage.getItem(STORAGE_KEY) ||
    localStorage.getItem(STORAGE_KEY)
  );
}

/**
 * Gets the current storage type
 */
export function getStorageType(): StorageType | null {
  const storageType =
    sessionStorage.getItem(STORAGE_TYPE_KEY) ||
    localStorage.getItem(STORAGE_TYPE_KEY);

  return storageType as StorageType | null;
}
