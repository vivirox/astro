/**
 * Types for the zero-knowledge proof system
 */

/**
 * Session data that will be protected with zero-knowledge proofs
 */
export interface SessionData {
  /**
   * Unique identifier for the session
   */
  sessionId: string;
  
  /**
   * User identifier associated with the session
   */
  userId: string;
  
  /**
   * Timestamp when the session started
   */
  startTime: number;
  
  /**
   * Optional additional data to protect
   */
  metadata?: Record<string, any>;
}

/**
 * Zero-knowledge proof data structure
 */
export interface ProofData {
  /**
   * The proof itself, containing cryptographic elements
   */
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  
  /**
   * Public inputs used for verification
   */
  publicInputs: string[];
  
  /**
   * Hash of the original data (public)
   */
  publicHash: string;
  
  /**
   * Timestamp when the proof was generated
   */
  timestamp: number;
}

/**
 * Options for creating a zero-knowledge system
 */
export interface ZKSystemOptions {
  /**
   * Namespace for the system
   */
  namespace?: string;
  
  /**
   * Reference to the crypto system for integration
   */
  crypto?: any;
  
  /**
   * Path to the circuit WASM file
   */
  circuitWasmPath?: string;
  
  /**
   * Path to the proving key file
   */
  provingKeyPath?: string;
  
  /**
   * Path to the verification key file
   */
  verificationKeyPath?: string;
}

/**
 * Input for generating a zero-knowledge proof
 */
export interface ProofInput {
  /**
   * Original data to prove knowledge of
   */
  data: any;
  
  /**
   * Optional encrypted version of the data
   */
  encryptedData?: string;
  
  /**
   * Optional blinding factor for additional security
   */
  blindingFactor?: string;
}

/**
 * Result of a proof verification
 */
export interface VerificationResult {
  /**
   * Whether the proof is valid
   */
  isValid: boolean;
  
  /**
   * Timestamp of verification
   */
  verifiedAt: number;
  
  /**
   * Optional error message if verification failed
   */
  error?: string;
}

/**
 * Circuit configuration options
 */
export interface CircuitOptions {
  /**
   * Hash function to use (e.g., 'Poseidon', 'MiMC')
   */
  hashFunction: string;
  
  /**
   * Elliptic curve type (e.g., 'BN254', 'BLS12-381')
   */
  curveType: string;
  
  /**
   * Depth of Merkle tree if used
   */
  merkleTreeDepth?: number;
} 