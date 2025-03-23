/**
 * FHE Service Type Definitions
 *
 * Production-ready type definitions for Fully Homomorphic Encryption implementation
 */

/**
 * Encryption modes available in the system
 */
export enum EncryptionMode {
  NONE = 'none',
  STANDARD = 'standard',
  HIPAA = 'hipaa',
  FHE = 'fhe',
}

/**
 * Options for initializing encryption
 */
export interface EncryptionOptions {
  mode?: EncryptionMode
  keySize?: number
  securityLevel?: string
  enableDebug?: boolean
}

/**
 * Homomorphic operations that can be performed on encrypted data
 */
export enum FHEOperation {
  SENTIMENT = 'sentiment',
  CATEGORIZE = 'categorize',
  SUMMARIZE = 'summarize',
  TOKENIZE = 'tokenize',
  FILTER = 'filter',
  CUSTOM = 'custom',
  // Text analysis operations
  WORD_COUNT = 'word_count',
  CHARACTER_COUNT = 'character_count',
  KEYWORD_DENSITY = 'keyword_density',
  READING_LEVEL = 'reading_level',
  ANALYZE = 'ANALYZE',
}

/**
 * Parameters for FHE operations
 */
export interface FHEOperationParams {
  categories?: Record<string, string[]>
  filterTerms?: string[]
  operation?: string
  operationParams?: Record<string, unknown>
}

/**
 * TFHE Security Level type
 */
export type TFHESecurityLevel = number

/**
 * Configuration for FHE operations
 */
export interface FHEConfig {
  mode: EncryptionMode
  keySize?: number
  securityLevel?: string | TFHESecurityLevel
  enableDebug?: boolean
}

/**
 * TFHE context for cryptographic operations
 */
export interface TFHEContext {
  initialized: boolean
  config?: unknown
  clientKey: unknown
  publicKey: unknown
  keySize?: number
  securityLevel?: string | TFHESecurityLevel
}

/**
 * Key management options for FHE secure storage and rotation
 */
export interface KeyManagementOptions {
  rotationPeriodDays?: number
  persistKeys?: boolean
  storagePrefix?: string
}

/**
 * TFHE key pair for storage and management
 */
export interface TFHEKeyPair {
  id: string
  publicKey: string
  privateKeyEncrypted: string
  created: number
  expires: number
  version: string
}

/**
 * Result of a TFHE operation
 */
export interface TFHEOperationResult {
  success: boolean
  data?: unknown
  error?: string
  operationId?: string
  timestamp: number
}

/**
 * Metadata for an encrypted message
 */
export interface EncryptedMessageMetadata {
  encryptionMode: EncryptionMode
  keyId?: string
  timestamp: number
  contentType?: string
  verificationToken?: string
}

/**
 * Performance metrics for FHE operations
 */
export interface FHEPerformanceMetrics {
  operationId: string
  operation: FHEOperation
  startTime: number
  endTime: number
  duration: number
  inputSize: number
  outputSize: number
  success: boolean
}

/**
 * Security audit log entry for FHE operations
 */
export interface FHESecurityAuditEntry {
  timestamp: number
  operation: string
  keyId?: string
  success: boolean
  errorCode?: string
  ipAddress?: string
  userId?: string
}

/**
 * Options for TEE (Trusted Execution Environment) integration
 */
export interface TEEOptions {
  provider:
    | 'aws-nitro'
    | 'azure-confidential-computing'
    | 'gcp-confidential-vm'
    | 'intel-sgx'
  attestationService?: string
  verificationKeys?: string[]
  enableRemoteAttestation?: boolean
}

/**
 * Compliance configuration for different regulatory standards
 */
export interface ComplianceConfig {
  hipaa?: boolean
  gdpr?: boolean
  ccpa?: boolean
  pci?: boolean
  auditLog?: boolean
  auditLogRetentionDays?: number
}

/**
 * Encrypted message interface
 */
export interface EncryptedMessage {
  id: string
  content: string // Encrypted content
  timestamp: number
  metadata?: EncryptedMessageMetadata
}

/**
 * Homomorphic operation result
 */
export interface HomomorphicOperationResult {
  success: boolean
  result?: string // Encrypted result
  operationType: string
  timestamp: number
  error?: string
  metadata?: Record<string, unknown> // Additional operation metadata
}

/**
 * Therapy message encryption request
 */
export interface TherapyEncryptionRequest {
  message: string
  therapistId: string
  patientId?: string
  scenario?: string
  securityLevel: string
  encryptionMode: string
}

/**
 * Therapy message decryption request
 */
export interface TherapyDecryptionRequest {
  encryptedMessage: string
  therapistId: string
  patientId?: string
  requestId: string
}

/**
 * Therapy homomorphic operation request
 */
export interface TherapyHomomorphicRequest {
  encryptedMessage: string
  operation: string
  therapistId: string
  patientId?: string
  parameters?: Record<string, unknown>
}

/**
 * FHE key pair
 */
export interface FHEKeyPair {
  publicKey: string
  privateKey: string
  keyId: string
  created: number
  expires?: number
  securityLevel: string
}

/**
 * FHE Session
 */
export interface FHESession {
  id: string
  therapistId: string
  patientId?: string
  keyPairId: string
  created: number
  lastActive: number
  encryptionMode: string
  active: boolean
}

/**
 * Therapy content category
 */
export enum TherapyCategory {
  ANXIETY = 'anxiety',
  DEPRESSION = 'depression',
  TRAUMA = 'trauma',
  RELATIONSHIP = 'relationship',
  SUBSTANCE_USE = 'substance_use',
  GENERAL = 'general',
  OTHER = 'other',
}

/**
 * Therapy content sentiment
 */
export enum TherapySentiment {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  MIXED = 'mixed',
}

/**
 * FHE operation context
 */
export interface FHEOperationContext {
  operationType: string
  contextId: string
  timestamp: number
  parameters?: Record<string, unknown>
  metrics?: FHEPerformanceMetrics
}

/**
 * FHE error types
 */
export enum FHEErrorType {
  INITIALIZATION_ERROR = 'initialization_error',
  ENCRYPTION_ERROR = 'encryption_error',
  DECRYPTION_ERROR = 'decryption_error',
  OPERATION_ERROR = 'operation_error',
  INVALID_FORMAT = 'invalid_format',
  INVALID_KEY = 'invalid_key',
  PERMISSION_DENIED = 'permission_denied',
  CONFIGURATION_ERROR = 'configuration_error',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * FHE operation type
 */
export enum FHEOperationType {
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt',
  PROCESS = 'process',
  KEY_GENERATION = 'key_generation',
  REENCRYPTION = 'reencryption',
}
