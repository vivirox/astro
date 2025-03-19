# Zero-Knowledge Proof System

This module provides a zero-knowledge proof system for the Astro application, enabling privacy-preserving verification of sensitive data without revealing the actual data.

## Architecture

The ZK system consists of the following components:

1. **ZK Proof Service**: A singleton service that handles the generation and verification of zero-knowledge proofs.
2. **Circom Circuits**: Custom circuits written in Circom for specific verification tasks.
3. **Integration with Crypto System**: Seamless integration with the encryption system for end-to-end encrypted data with proofs.

## Circuits

The system includes the following circuits:

- **SessionData.circom**: Verifies session data integrity without revealing the actual session data.
- **RangeProof.circom**: Verifies that a value is within a specified range without revealing the actual value.

## Usage

### Basic Usage

```typescript
import { createZKSystem } from "../lib/zk";
import { createCryptoSystem } from "../lib/crypto";

// Create crypto system
const crypto = createCryptoSystem({
  namespace: "app",
  keyRotationDays: 90,
});

// Create ZK system with crypto integration
const zk = createZKSystem({
  namespace: "app",
  crypto,
});

// Generate a proof for session data
const sessionData = {
  sessionId: "session-123",
  userId: "user-456",
  startTime: Date.now(),
};

const proofData = await zk.generateProof(sessionData);

// Verify the proof
const result = await zk.verifyProof(proofData);
if (result.isValid) {
  console.log("Proof verified successfully!");
}
```

### Encrypt and Prove

```typescript
// Encrypt data and generate a proof
const data = {
  patientId: "patient-123",
  diagnosis: "Confidential Diagnosis",
};

const result = await zk.encryptAndProve(data, "patient-data");

// The result contains both encrypted data and a proof
console.log(result.encryptedData); // Encrypted data
console.log(result.proof); // Proof data
```

### Range Proofs

```typescript
// Generate a range proof for a value within a range
const value = 42;
const min = 0;
const max = 100;

const proofData = await zk.generateRangeProof(value, min, max);

// Verify the range proof
const result = await zk.verifyProof(proofData);
if (result.isValid) {
  console.log("Range proof verified successfully!");
}
```

## Integration with HIPAA Compliance

The ZK system is designed to support HIPAA compliance requirements:

1. **Privacy**: Zero-knowledge proofs allow verification without revealing sensitive PHI.
2. **Integrity**: Proofs ensure data hasn't been tampered with.
3. **Audit**: All proof generation and verification is logged for audit purposes.
4. **End-to-End Encryption**: Integration with the crypto system ensures data is encrypted at rest and in transit.

## Development

### Adding New Circuits

1. Create a new Circom circuit in the `circuits` directory.
2. Compile the circuit to generate the necessary artifacts.
3. Update the `ZKProofService` to support the new circuit.

### Testing

The ZK system includes comprehensive tests to ensure correct functionality:

```bash
pnpm test src/tests/crypto.test.ts
```

## Future Enhancements

- Support for more complex zero-knowledge proofs
- Integration with blockchain for public verification
- Performance optimizations for large-scale deployments
- Support for multi-party computation
