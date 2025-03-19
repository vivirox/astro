import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  Encryption,
  KeyRotationManager,
  KeyStorage,
  ScheduledKeyRotation,
  createCryptoSystem,
} from "../lib/crypto";
import { createZKSystem, SessionData } from "../lib/zk";

describe("Encryption", () => {
  it("should encrypt and decrypt data correctly", () => {
    const data = "Sensitive patient data";
    const key = "test-encryption-key-12345";

    const encrypted = Encryption.encrypt(data, key);
    expect(encrypted).toContain("v1:"); // Should have version prefix

    const decrypted = Encryption.decrypt(encrypted, key);
    expect(decrypted).toBe(data);
  });

  it("should include version in encrypted data", () => {
    const data = "Sensitive patient data";
    const key = "test-encryption-key-12345";
    const version = 3;

    const encrypted = Encryption.encrypt(data, key, version);
    expect(encrypted).toContain(`v${version}:`);
  });

  it("should throw error when decrypting with wrong key", () => {
    const data = "Sensitive patient data";
    const key = "test-encryption-key-12345";
    const wrongKey = "wrong-key-67890";

    const encrypted = Encryption.encrypt(data, key);

    expect(() => {
      Encryption.decrypt(encrypted, wrongKey);
    }).toThrow("Failed to decrypt data");
  });
});

describe("KeyRotationManager", () => {
  let keyManager: KeyRotationManager;

  beforeEach(() => {
    keyManager = new KeyRotationManager(90); // 90 days rotation
  });

  it("should add a new key", () => {
    const keyId = "test-key-1";
    const key = "test-encryption-key-12345";

    const metadata = keyManager.addKey(keyId, key);

    expect(metadata.id).toBe(keyId);
    expect(metadata.version).toBe(1);
    expect(metadata.active).toBe(true);
    expect(metadata.expiresAt).toBeDefined();
  });

  it("should rotate a key", () => {
    const keyId = "test-key-1";
    const key = "test-encryption-key-12345";
    const newKey = "new-encryption-key-67890";

    // Add initial key
    keyManager.addKey(keyId, key);

    // Rotate the key
    const rotatedMetadata = keyManager.rotateKey(keyId, newKey);

    expect(rotatedMetadata.id).toBe(keyId);
    expect(rotatedMetadata.version).toBe(2);
    expect(rotatedMetadata.active).toBe(true);
  });

  it("should identify keys that need rotation", () => {
    const keyId = "test-key-1";
    const key = "test-encryption-key-12345";

    // Add a key with custom expiration (expired)
    const metadata = keyManager.addKey(keyId, key);

    // Mock the expiration date to be in the past
    const originalDate = Date.now;
    const mockDate = vi.fn(() => metadata.createdAt + 91 * 24 * 60 * 60 * 1000); // 91 days later
    global.Date.now = mockDate;

    const keysNeedingRotation = keyManager.checkForRotationNeeded();

    expect(keysNeedingRotation).toContain(keyId);

    // Restore original Date.now
    global.Date.now = originalDate;
  });

  it("should re-encrypt data with the latest key version", () => {
    const keyId = "test-key-1";
    const key = "test-encryption-key-12345";
    const newKey = "new-encryption-key-67890";
    const data = "Sensitive patient data";

    // Add initial key
    keyManager.addKey(keyId, key);

    // Encrypt data with initial key
    const encrypted = Encryption.encrypt(data, key, 1);

    // Rotate the key
    keyManager.rotateKey(keyId, newKey);

    // Re-encrypt with latest key
    const reencrypted = keyManager.reencryptWithLatestKey(encrypted, keyId);

    // Should have new version
    expect(reencrypted).toContain("v2:");

    // Should decrypt correctly with new key
    const decrypted = Encryption.decrypt(reencrypted, newKey);
    expect(decrypted).toBe(data);
  });
});

describe("KeyStorage", () => {
  let keyStorage: KeyStorage;

  beforeEach(() => {
    keyStorage = new KeyStorage({ namespace: "test" });
  });

  it("should generate and store a key", async () => {
    const { keyId, keyData } = await keyStorage.generateKey("patient-data");

    expect(keyId).toContain("test:patient-data:");
    expect(keyData.key).toBeDefined();
    expect(keyData.version).toBe(1);
    expect(keyData.purpose).toBe("patient-data");
  });

  it("should retrieve a stored key", async () => {
    const { keyId, keyData: originalData } =
      await keyStorage.generateKey("patient-data");

    const retrievedData = await keyStorage.getKey(keyId);

    expect(retrievedData).toEqual(originalData);
  });

  it("should rotate a key", async () => {
    const { keyId, keyData: originalData } =
      await keyStorage.generateKey("patient-data");

    const rotatedKey = await keyStorage.rotateKey(keyId);

    expect(rotatedKey).not.toBeNull();
    if (rotatedKey) {
      expect(rotatedKey.keyData.version).toBe(2);
      expect(rotatedKey.keyData.purpose).toBe("patient-data");
      expect(rotatedKey.keyData.key).not.toBe(originalData.key);
    }
  });

  it("should list keys by purpose", async () => {
    await keyStorage.generateKey("patient-data");
    await keyStorage.generateKey("patient-data");
    await keyStorage.generateKey("admin-data");

    const patientKeys = await keyStorage.listKeys("patient-data");
    const adminKeys = await keyStorage.listKeys("admin-data");
    const allKeys = await keyStorage.listKeys();

    expect(patientKeys.length).toBe(2);
    expect(adminKeys.length).toBe(1);
    expect(allKeys.length).toBe(3);
  });

  it("should delete a key", async () => {
    const { keyId } = await keyStorage.generateKey("patient-data");

    const deleted = await keyStorage.deleteKey(keyId);

    expect(deleted).toBe(true);

    const retrievedData = await keyStorage.getKey(keyId);
    expect(retrievedData).toBeNull();
  });
});

describe("ScheduledKeyRotation", () => {
  let scheduledRotation: ScheduledKeyRotation;
  let onRotationMock: any;
  let onErrorMock: any;

  beforeEach(() => {
    // Mock the callbacks
    onRotationMock = vi.fn();
    onErrorMock = vi.fn();

    scheduledRotation = new ScheduledKeyRotation({
      namespace: "test",
      checkIntervalMs: 1000, // 1 second for testing
      onRotation: onRotationMock,
      onError: onErrorMock,
    });

    // Mock setInterval and clearInterval
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Stop the scheduler if running
    scheduledRotation.stop();

    // Restore timers
    vi.useRealTimers();
  });

  it("should start and stop scheduled rotation", () => {
    // Start the scheduler
    scheduledRotation.start();

    // Should have set an interval
    expect(setInterval).toHaveBeenCalled();

    // Stop the scheduler
    scheduledRotation.stop();

    // Should have cleared the interval
    expect(clearInterval).toHaveBeenCalled();
  });

  it("should check and rotate expired keys", async () => {
    // Create a key storage to add a key
    const keyStorage = new KeyStorage({ namespace: "test" });

    // Generate a key
    const { keyId, keyData } = await keyStorage.generateKey("test-purpose");

    // Mock the key to be expired
    const originalGetKey = keyStorage.getKey.bind(keyStorage);
    keyStorage.getKey = vi.fn(async (id) => {
      const data = await originalGetKey(id);
      if (data && id === keyId) {
        return {
          ...data,
          expiresAt: Date.now() - 1000, // Expired 1 second ago
        };
      }
      return data;
    });

    // Replace the keyStorage in scheduledRotation with our mocked one
    (scheduledRotation as any).keyStorage = keyStorage;

    // Check and rotate keys
    const rotatedKeys = await scheduledRotation.checkAndRotateKeys();

    // Should have rotated the key
    expect(rotatedKeys.length).toBe(1);
    expect(onRotationMock).toHaveBeenCalledWith(keyId, expect.any(String));
  });

  it("should force rotate a specific key", async () => {
    // Create a key storage to add a key
    const keyStorage = new KeyStorage({ namespace: "test" });

    // Generate a key
    const { keyId } = await keyStorage.generateKey("test-purpose");

    // Replace the keyStorage in scheduledRotation with our test one
    (scheduledRotation as any).keyStorage = keyStorage;

    // Force rotate the key
    const newKeyId = await scheduledRotation.forceRotateKey(keyId);

    // Should have rotated the key
    expect(newKeyId).not.toBeNull();
    expect(onRotationMock).toHaveBeenCalledWith(keyId, newKeyId);
  });
});

describe("createCryptoSystem", () => {
  it("should create a complete crypto system", () => {
    const crypto = createCryptoSystem({
      namespace: "test",
      keyRotationDays: 90,
    });

    expect(crypto.encryption).toBe(Encryption);
    expect(crypto.keyStorage).toBeInstanceOf(KeyStorage);
    expect(crypto.keyRotationManager).toBeInstanceOf(KeyRotationManager);
    expect(crypto.scheduledRotation).toBeNull(); // Not enabled by default
  });

  it("should enable scheduled rotation when specified", () => {
    const crypto = createCryptoSystem({
      namespace: "test",
      keyRotationDays: 90,
      enableScheduledRotation: true,
    });

    expect(crypto.scheduledRotation).not.toBeNull();

    // Clean up
    crypto.stopScheduledRotation();
  });

  it("should encrypt and decrypt data with automatic key management", async () => {
    const crypto = createCryptoSystem({
      namespace: "test",
    });

    const data = "Sensitive patient data";
    const purpose = "patient-data";

    // Encrypt data
    const encrypted = await crypto.encrypt(data, purpose);

    // Should contain key ID and encrypted data
    expect(encrypted).toContain(":v1:");

    // Decrypt data
    const decrypted = await crypto.decrypt(encrypted);

    // Should match original data
    expect(decrypted).toBe(data);
  });

  it("should rotate expired keys", async () => {
    const crypto = createCryptoSystem({
      namespace: "test",
    });

    // Encrypt some data to create a key
    const data = "Sensitive patient data";
    const purpose = "patient-data";
    const encrypted = await crypto.encrypt(data, purpose);

    // Extract key ID
    const keyId = encrypted.split(":")[0];

    // Mock the key to be expired
    const originalGetKey = crypto.keyStorage.getKey.bind(crypto.keyStorage);
    crypto.keyStorage.getKey = vi.fn(async (id) => {
      const data = await originalGetKey(id);
      if (data && id === keyId) {
        return {
          ...data,
          expiresAt: Date.now() - 1000, // Expired 1 second ago
        };
      }
      return data;
    });

    // Rotate expired keys
    const rotatedKeys = await crypto.rotateExpiredKeys();

    // Should have rotated the key
    expect(rotatedKeys.length).toBe(1);
  });
});

describe("Zero-Knowledge Integration Tests", () => {
  let crypto: any;
  let zk: any;

  beforeEach(() => {
    // Create crypto system
    crypto = createCryptoSystem({
      namespace: "test",
      keyRotationDays: 90,
    });

    // Create ZK system with crypto integration
    zk = createZKSystem({
      namespace: "test",
      crypto,
    });
  });

  it("should generate a proof for session data", async () => {
    // Create test session data
    const sessionData: SessionData = {
      sessionId: "test-session-123",
      userId: "user-456",
      startTime: Date.now(),
      metadata: {
        ipAddress: "127.0.0.1",
        userAgent: "Test Browser",
      },
    };

    // Generate a proof
    const proofData = await zk.generateProof(sessionData);

    // Verify the proof structure
    expect(proofData).toBeDefined();
    expect(proofData.proof).toBeDefined();
    expect(proofData.publicInputs).toBeDefined();
    expect(proofData.publicHash).toBeDefined();
    expect(proofData.timestamp).toBeDefined();
  });

  it("should verify a valid proof", async () => {
    // Create test session data
    const sessionData: SessionData = {
      sessionId: "test-session-123",
      userId: "user-456",
      startTime: Date.now(),
    };

    // Generate a proof
    const proofData = await zk.generateProof(sessionData);

    // Verify the proof
    const result = await zk.verifyProof(proofData);

    // Check verification result
    expect(result).toBeDefined();
    expect(result.isValid).toBe(true);
    expect(result.verifiedAt).toBeDefined();
  });

  it("should integrate with encryption system", async () => {
    // Create test data
    const data = {
      patientId: "patient-123",
      diagnosis: "Test Diagnosis",
      treatment: "Test Treatment",
    };

    // Encrypt data and generate proof
    const result = await zk.encryptAndProve(data, "patient-data");

    // Verify the result structure
    expect(result).toBeDefined();
    expect(result.encryptedData).toBeDefined();
    expect(result.proof).toBeDefined();

    // Decrypt the data
    const decrypted = await crypto.decrypt(result.encryptedData);

    // Verify decrypted data
    expect(JSON.parse(decrypted)).toEqual(data);
  });

  it("should generate and verify a range proof", async () => {
    // Generate a range proof for a value within a range
    const value = 42;
    const min = 0;
    const max = 100;

    // Generate the proof
    const proofData = await zk.generateRangeProof(value, min, max);

    // Verify the proof
    const result = await zk.verifyProof(proofData);

    // Check verification result
    expect(result).toBeDefined();
    expect(result.isValid).toBe(true);
  });
});
