import CryptoJS from 'crypto-js';

/**
 * Encryption utility for handling data encryption and decryption
 * with support for key rotation
 */
export class Encryption {
  /**
   * Encrypts data using AES encryption
   * @param data - Data to encrypt
   * @param key - Encryption key
   * @param keyVersion - Optional key version for rotation tracking
   * @returns Encrypted data with metadata
   */
  static encrypt(data: string, key: string, keyVersion?: number): string {
    // Add metadata for key rotation
    const metadata = {
      v: keyVersion || 1, // Key version
      t: Date.now(), // Timestamp for rotation policies
    };
    
    // Combine data with metadata
    const dataWithMetadata = JSON.stringify({
      data,
      meta: metadata,
    });
    
    // Encrypt the data
    const encrypted = CryptoJS.AES.encrypt(dataWithMetadata, key).toString();
    
    // Return encrypted data with version prefix
    return `v${metadata.v}:${encrypted}`;
  }
  
  /**
   * Decrypts data using AES decryption
   * @param encryptedData - Data to decrypt
   * @param key - Decryption key
   * @returns Decrypted data
   */
  static decrypt(encryptedData: string, key: string): string {
    try {
      // Extract version and encrypted content
      const [versionPart, encryptedContent] = encryptedData.split(':');
      
      // Decrypt the data
      const decrypted = CryptoJS.AES.decrypt(encryptedContent, key).toString(CryptoJS.enc.Utf8);
      
      // Parse the decrypted data
      const parsed = JSON.parse(decrypted);
      
      // Return the original data
      return parsed.data;
    } catch (error) {
      throw new Error('Failed to decrypt data');
    }
  }
}

export default Encryption; 