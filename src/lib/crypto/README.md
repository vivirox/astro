# Encryption and Key Rotation System

This module provides a comprehensive encryption and key rotation system for HIPAA-compliant data protection. It includes utilities for encrypting sensitive data, managing encryption keys, and automatically rotating keys based on expiration policies.

## Features

- **End-to-end encryption** for sensitive data
- **Automatic key rotation** based on configurable expiration policies
- **Key versioning** to track key history and facilitate key rotation
- **Secure key storage** with support for external key management systems
- **Scheduled key rotation** to ensure keys are rotated regularly
- **HIPAA-compliant** encryption and key management

## Components

### Encryption

The `Encryption` class provides methods for encrypting and decrypting data using AES encryption. It includes support for key versioning to facilitate key rotation.

```typescript
import { Encryption } from './lib/crypto';

// Encrypt data
const encrypted = Encryption.encrypt('sensitive data', 'encryption-key', 1);

// Decrypt data
const decrypted = Encryption.decrypt(encrypted, 'encryption-key');
```

### Key Rotation Manager

The `KeyRotationManager` class manages encryption keys and their rotation. It tracks key versions, expiration dates, and active status.

```typescript
import { KeyRotationManager } from './lib/crypto';

// Create a key rotation manager with 90-day rotation interval
const keyManager = new KeyRotationManager(90);

// Add a key
const metadata = keyManager.addKey('key-id', 'encryption-key');

// Rotate a key
const newMetadata = keyManager.rotateKey('key-id', 'new-encryption-key');

// Check for keys that need rotation
const keysToRotate = keyManager.checkForRotationNeeded();
```

### Key Storage

The `KeyStorage` class provides secure storage for encryption keys. It supports in-memory storage for development and can be extended to use secure key vaults in production.

```typescript
import { KeyStorage } from './lib/crypto';

// Create a key storage instance
const keyStorage = new KeyStorage({ namespace: 'app' });

// Generate a new key
const { keyId, keyData } = await keyStorage.generateKey('patient-data');

// Retrieve a key
const key = await keyStorage.getKey(keyId);

// Rotate a key
const rotatedKey = await keyStorage.rotateKey(keyId);

// List keys by purpose
const keys = await keyStorage.listKeys('patient-data');
```

### Scheduled Key Rotation

The `ScheduledKeyRotation` class provides automatic key rotation based on expiration dates. It can be configured to check for expired keys at regular intervals.

```typescript
import { ScheduledKeyRotation } from './lib/crypto';

// Create a scheduled rotation service
const scheduler = new ScheduledKeyRotation({
  namespace: 'app',
  checkIntervalMs: 60 * 60 * 1000, // Check every hour
  onRotation: (oldKeyId, newKeyId) => {
    console.log(`Key rotated: ${oldKeyId} -> ${newKeyId}`);
  },
});

// Start the scheduler
scheduler.start();

// Stop the scheduler
scheduler.stop();

// Force rotate a specific key
const newKeyId = await scheduler.forceRotateKey('key-id');
```

### Complete Crypto System

The `createCryptoSystem` function creates a complete crypto system with encryption, key storage, and rotation.

```typescript
import { createCryptoSystem } from './lib/crypto';

// Create a crypto system
const crypto = createCryptoSystem({
  namespace: 'app',
  keyRotationDays: 90,
  enableScheduledRotation: true,
});

// Encrypt data with automatic key management
const encrypted = await crypto.encrypt('sensitive data', 'patient-data');

// Decrypt data
const decrypted = await crypto.decrypt(encrypted);

// Rotate expired keys
const rotatedKeys = await crypto.rotateExpiredKeys();

// Stop scheduled rotation
crypto.stopScheduledRotation();
```

## Scheduled Key Rotation Script

A script is provided to run key rotation as a scheduled task. This can be used with cron or similar schedulers to ensure keys are rotated regularly.

```bash
# Run automatic rotation based on expiration
node rotateKeys.js

# Force rotation of all keys
node rotateKeys.js --force

# Only rotate keys with a specific purpose
node rotateKeys.js --purpose=patient-data
```

## HIPAA Compliance

This encryption and key rotation system is designed to meet HIPAA compliance requirements for protecting sensitive patient data:

- **Data Encryption**: All sensitive data is encrypted using AES-256 encryption.
- **Key Management**: Encryption keys are securely managed and rotated regularly.
- **Access Control**: Keys are stored securely and access is controlled.
- **Audit Logging**: Key rotation events are logged for audit purposes.
- **Key Rotation**: Keys are automatically rotated based on expiration policies.

## Best Practices

1. **Regular Key Rotation**: Configure key rotation to occur at least every 90 days.
2. **Secure Key Storage**: In production, use a secure key vault (e.g., AWS KMS, Azure Key Vault) for key storage.
3. **Backup Keys**: Ensure encryption keys are backed up securely.
4. **Monitor Key Rotation**: Set up alerts for key rotation failures.
5. **Test Recovery**: Regularly test the ability to decrypt data with rotated keys.
6. **Document Key Management**: Maintain documentation of key management procedures.
7. **Audit Key Access**: Regularly audit access to encryption keys.
8. **Limit Key Access**: Restrict access to encryption keys to authorized personnel only.

## Implementation Details

### Key Versioning

Each encryption key has a version number that is incremented when the key is rotated. This allows for tracking key history and facilitates key rotation.

### Key Expiration

Keys have an expiration date based on the configured rotation interval. When a key expires, it should be rotated to a new key.

### Key Rotation Process

1. A new key is generated with an incremented version number.
2. The old key is marked as inactive.
3. Data encrypted with the old key is re-encrypted with the new key as needed.
4. The old key is securely stored for a retention period to allow for decryption of data that hasn't been re-encrypted yet.

### Secure Key Storage

In production, encryption keys should be stored in a secure key vault such as AWS KMS, Azure Key Vault, or HashiCorp Vault. The `KeyStorage` class can be extended to use these services. 