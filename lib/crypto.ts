// Web Crypto API wrapper for encrypting/decrypting credentials

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Generate a new AES-256-GCM encryption key
 */
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a CryptoKey to a base64 string for storage
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Import a CryptoKey from a base64 string
 */
export async function importKey(keyData: string): Promise<CryptoKey> {
  const rawKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw',
    rawKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-256-GCM
 * Returns base64-encoded encrypted data with IV prepended
 */
export async function encrypt(data: string, key: CryptoKey): Promise<string> {
  // Generate a random initialization vector
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encode the data as bytes
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    dataBytes
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data encrypted with encrypt()
 */
export async function decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
      },
      key,
      data
    );

    // Decode as string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Get or create the master encryption key from IndexedDB
 * This is a helper that integrates with the database layer
 */
export async function getMasterKey(db: any): Promise<CryptoKey> {
  console.log('getMasterKey: starting...');
  try {
    // Try to get existing key
    console.log('getMasterKey: checking for existing key...');
    const existingKeyData = await db.get('crypto_key', 'master');

    if (existingKeyData && existingKeyData.key) {
      console.log('getMasterKey: found existing key, importing...');
      // Key exists, import it
      const key = await importKey(existingKeyData.key);
      console.log('getMasterKey: existing key imported successfully');
      return key;
    }

    // Key doesn't exist, generate and store it
    console.log('getMasterKey: no existing key, generating new one...');
    const newKey = await generateKey();
    console.log('getMasterKey: new key generated, exporting...');
    const exported = await exportKey(newKey);
    console.log('getMasterKey: key exported, storing in database...');
    await db.put('crypto_key', { id: 'master', key: exported }, 'master');
    console.log('getMasterKey: new key stored successfully');
    return newKey;
  } catch (error) {
    console.error('getMasterKey: error occurred:', error);
    throw error;
  }
}

/**
 * Clear the master encryption key (called on logout)
 */
export async function clearMasterKey(db: any): Promise<void> {
  await db.delete('crypto_key', 'master');
}
