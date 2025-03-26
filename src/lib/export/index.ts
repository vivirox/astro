/**
 * Export Service for Therapy Chat System
 *
 * Provides secure conversation export capabilities with maintained encryption
 * for privacy and HIPAA compliance.
 */

import type { ChatMessage } from '../../types/chat'
// Import only the EncryptionMode from fhe types
import { EncryptionMode } from '../fhe/types'
import { getLogger } from '../logging'
import { createSignedVerificationToken } from '../security/verification'
import { generateId } from '../utils'

// Initialize logger
const logger = getLogger()

// Define FHE service interface with required methods
interface FHEServiceInterface {
  encrypt: (data: string) => Promise<string>
  encryptData: (
    data: Uint8Array,
    mode: EncryptionMode,
  ) => Promise<{
    data: ArrayBuffer
    encryptedKey?: string
    iv?: string
    authTag?: string
  }>
}

/**
 * Export format types
 */
export enum ExportFormat {
  JSON = 'json',
  PDF = 'pdf',
  ENCRYPTED_ARCHIVE = 'encrypted_archive',
}

/**
 * Export options configuration
 */
export interface ExportOptions {
  format: ExportForma
  includeMetadata: boolean
  encryptionMode: EncryptionMode
  includeVerificationToken: boolean
  password?: string
  recipientPublicKey?: string
}

/**
 * Default export options
 */
const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: ExportFormat.JSON,
  includeMetadata: true,
  encryptionMode: EncryptionMode.HIPAA,
  includeVerificationToken: true,
}

/**
 * Export result with metadata
 */
export interface ExportResult {
  id: string
  data: string | Uint8Array
  format: ExportForma
  encryptionMode: EncryptionMode
  verificationToken?: string
  timestamp: number
  mimeType: string
  filename: string
  totalMessages: number
}

/**
 * JWE-compatible header for exported content
 */
interface JWEHeader {
  alg: string
  enc: string
  kid?: string
  cty: string
}

/**
 * Service for securely exporting therapy conversations
 */
export class ExportService {
  private static instance: ExportService

  private fheService: FHEServiceInterface
  private initialized = false

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(fheService: FHEServiceInterface) {
    this.fheService = fheService
    logger.info('Export service initialized')
  }

  /**
   * Get singleton instance
   */
  public static getInstance(fheService: FHEServiceInterface): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService(fheService)
    }
    return ExportService.instance
  }

  /**
   * Initialize the export service
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Export service already initialized')
      return
    }

    logger.info('Initializing export service')

    try {
      // Ensure FHE service is initialized
      if (!this.fheService) {
        throw new Error('FHE service not available')
      }

      this.initialized = true
      logger.info('Export service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize export service', error)
      throw error
    }
  }

  /**
   * Export conversation messages with secure encryption
   *
   * @param messages - The conversation messages to export
   * @param options - Export configuration options
   * @returns Export result with the exported data
   */
  public async exportConversation(
    messages: ChatMessage[],
    options: Partial<ExportOptions> = {},
  ): Promise<ExportResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    const exportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options }
    const timestamp = Date.now()

    // Generate export ID
    const exportId = generateId()

    try {
      logger.info(
        `Exporting conversation with ${messages.length} messages in ${exportOptions.format} format`,
      )

      // Create export data based on forma
      let exportData: string | Uint8Array
      let mimeType: string
      let filename: string

      switch (exportOptions.format) {
        case ExportFormat.PDF: {
          const result = await this.createPDFExport(messages, exportOptions)
          exportData = result.data
          mimeType = 'application/pdf'
          filename = `therapy-conversation-${exportId}.pdf`
          break
        }

        case ExportFormat.ENCRYPTED_ARCHIVE: {
          const archive = await this.createEncryptedArchive(
            messages,
            exportOptions,
          )
          exportData = archive.data
          mimeType = 'application/octet-stream'
          filename = `therapy-conversation-${exportId}.secz`
          break
        }

        case ExportFormat.JSON:
        default: {
          const json = await this.createJSONExport(messages, exportOptions)
          exportData = json.data
          mimeType = 'application/json'
          filename = `therapy-conversation-${exportId}.json`
        }
      }

      // Create verification token if needed
      let verificationToken: string | undefined
      if (exportOptions.includeVerificationToken) {
        verificationToken = await this.createVerificationToken(
          exportData,
          exportId,
          timestamp,
        )
      }

      return {
        id: exportId,
        data: exportData,
        format: exportOptions.format,
        encryptionMode: exportOptions.encryptionMode,
        verificationToken,
        timestamp,
        mimeType,
        filename,
        totalMessages: messages.length,
      }
    } catch (error) {
      logger.error('Failed to export conversation', error)
      throw new Error(`Export failed: ${error.message}`)
    }
  }

  /**
   * Create JSON export with JWE encryption if needed
   */
  private async createJSONExport(
    messages: ChatMessage[],
    options: ExportOptions,
  ): Promise<{ data: string }> {
    // Prepare export content
    const exportContent = {
      id: generateId(),
      timestamp: Date.now(),
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || Date.now(),
      })),
      metadata: options.includeMetadata
        ? {
            exportVersion: '1.0',
            encryptionMode: options.encryptionMode,
            totalMessages: messages.length,
          }
        : undefined,
    }

    // Convert to JSON
    const jsonData = JSON.stringify(exportContent, null, 2)

    // Encrypt if needed
    if (options.encryptionMode !== EncryptionMode.NONE) {
      // Create JWE format with headers
      const jweHeader: JWEHeader = {
        alg: 'ECDH-ES+A256KW',
        enc: 'A256GCM',
        cty: 'application/json',
      }

      // Use FHE service to encrypt
      const encryptedData = await this.fheService.encryptData(
        new TextEncoder().encode(jsonData),
        options.encryptionMode,
      )

      // Format as JWE
      const jwe = {
        protected: btoa(JSON.stringify(jweHeader)),
        encrypted_key: encryptedData.encryptedKey,
        iv: encryptedData.iv,
        ciphertext: encryptedData.data,
        tag: encryptedData.authTag,
      }

      return { data: JSON.stringify(jwe) }
    }

    return { data: jsonData }
  }

  /**
   * Create PDF export with embedded encryption
   */
  private async createPDFExport(
    messages: ChatMessage[],
    options: ExportOptions,
  ): Promise<{ data: Uint8Array }> {
    // Note: In a real implementation, this would use a PDF generation library
    // For now, we'll create a placeholder implementation

    // Convert messages to PDF-compatible forma
    const pdfContent = `
      Therapy Conversation export
      Generated: ${new Date().toISOString()}
      Messages: ${messages.length}

      ${messages.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}
    `

    // For now, we'll just return the text as a buffer
    // In a real implementation, this would generate a PDF
    const pdfBuffer = new TextEncoder().encode(pdfContent)

    // Encrypt if needed
    if (options.encryptionMode !== EncryptionMode.NONE) {
      const encryptedData = await this.fheService.encryptData(
        pdfBuffer,
        options.encryptionMode,
      )

      return { data: new Uint8Array(encryptedData.data) }
    }

    return { data: pdfBuffer }
  }

  /**
   * Create encrypted archive for maximum security
   */
  private async createEncryptedArchive(
    messages: ChatMessage[],
    options: ExportOptions,
  ): Promise<{ data: Uint8Array }> {
    // Note: In a real implementation, this would use a secure archive forma
    // For this example, we'll create a simplified version

    // Create JSON representation
    const jsonResult = await this.createJSONExport(messages, options)

    // Create archive header
    const header = new TextEncoder().encode(
      JSON.stringify({
        format: 'SECZ-1.0',
        encryption: options.encryptionMode,
        timestamp: Date.now(),
        contentType: 'application/json',
      }),
    )

    // Combine header and data
    const headerSize = new Uint32Array([header.length])
    const headerSizeBuffer = new Uint8Array(headerSize.buffer)

    // Combine all buffers
    const jsonBuffer = new TextEncoder().encode(jsonResult.data)
    const completeBuffer = new Uint8Array(
      headerSizeBuffer.length + header.length + jsonBuffer.length,
    )

    completeBuffer.set(headerSizeBuffer, 0)
    completeBuffer.set(header, headerSizeBuffer.length)
    completeBuffer.set(jsonBuffer, headerSizeBuffer.length + header.length)

    return { data: completeBuffer }
  }

  /**
   * Create verification token for export integrity
   */
  private async createVerificationToken(
    data: string | Uint8Array,
    exportId: string,
    timestamp: number,
  ): Promise<string> {
    const dataBuffer =
      typeof data === 'string' ? new TextEncoder().encode(data) : data

    // Create token payload
    const tokenPayload = {
      exportId,
      timestamp,
      contentLength: dataBuffer.length,
    }

    // Sign with verification token from security module
    return createSignedVerificationToken(tokenPayload)
  }
}
