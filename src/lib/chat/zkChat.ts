/**
 * Zero-knowledge chat integration
 * Provides ZK proof verification for chat messages
 */

import { createZKSystem } from '../zk'
import { createCryptoSystem } from '../crypto'
import type { ProofData, VerificationResult } from '../zk'
import { createAuditLog } from '../audit/log'
import sha256 from 'crypto-js/sha256'

// Initialize crypto and ZK systems
const crypto = createCryptoSystem({
  namespace: 'chat',
})
const zkSystem = createZKSystem({
  namespace: 'chat',
  crypto,
})

// Helper function for audit logging
async function logAudit(
  userId: string,
  action: string,
  metadata?: Record<string, any>
) {
  await createAuditLog({
    userId,
    action,
    resource: 'chat',
    metadata,
  })
}

/**
 * Chat message with ZK proof
 */
export interface ChatMessageWithProof {
  id: string
  conversationId: string
  senderId: string
  content: string
  timestamp: number
  metadata?: Record<string, any>
  proof: ProofData
}

/**
 * Encrypted chat message with ZK proof
 */
export interface EncryptedChatMessage {
  id: string
  conversationId: string
  senderId: string
  encryptedContent: string
  timestamp: number
  metadata?: Record<string, any>
  proof: ProofData
}

/**
 * ZK Chat service
 */
export const zkChat = {
  /**
   * Generate a proof for a chat message
   *
   * @param message Chat message data
   * @returns Message with proof
   */
  async generateMessageProof(message: {
    id: string
    conversationId: string
    senderId: string
    content: string
    timestamp: number
    metadata?: Record<string, any>
  }): Promise<ChatMessageWithProof> {
    try {
      // Generate a proof for the message
      const proof = await zkSystem.generateProof({
        messageId: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        contentHash: sha256(message.content).toString(),
        timestamp: message.timestamp,
      } as any)

      // Log the proof generation
      await logAudit(message.senderId, 'zk_message_proof_generated', {
        messageId: message.id,
        conversationId: message.conversationId,
        proofId: proof.publicHash,
      })

      // Return the message with proof
      return {
        ...message,
        proof,
      }
    } catch (error) {
      await logAudit(message.senderId, 'zk_message_proof_generation_failed', {
        messageId: message.id,
        conversationId: message.conversationId,
        error: error instanceof Error ? error?.message : String(error),
      })
      throw error
    }
  },

  /**
   * Verify a proof for a chat message
   *
   * @param messageWithProof Message with proof
   * @returns Verification resul
   */
  async verifyMessageProof(
    messageWithProof: ChatMessageWithProof
  ): Promise<VerificationResult> {
    try {
      // Verify the proof
      const result = await zkSystem.verifyProof(messageWithProof.proof)

      // Log the verification resul
      await logAudit(messageWithProof.senderId, 'zk_message_proof_verified', {
        messageId: messageWithProof.id,
        conversationId: messageWithProof.conversationId,
        proofId: messageWithProof.proof.publicHash,
        isValid: result?.isValid,
      })

      return result
    } catch (error) {
      await logAudit(
        messageWithProof.senderId,
        'zk_message_proof_verification_failed',
        {
          messageId: messageWithProof.id,
          conversationId: messageWithProof.conversationId,
          proofId: messageWithProof.proof.publicHash,
          error: error instanceof Error ? error?.message : String(error),
        }
      )
      throw error
    }
  },

  /**
   * Encrypt a chat message and generate a proof
   *
   * @param message Chat message data
   * @returns Encrypted message with proof
   */
  async encryptMessageWithProof(message: {
    id: string
    conversationId: string
    senderId: string
    content: string
    timestamp: number
    metadata?: Record<string, any>
  }): Promise<EncryptedChatMessage> {
    try {
      // Create message data for ZK proof
      const messageData = {
        messageId: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        timestamp: message.timestamp,
      }

      // Encrypt and generate proof
      const result = await zkSystem.encryptAndProve(
        messageData as any,
        'chat-message'
      )

      // Log the encryption and proof generation
      await logAudit(message.senderId, 'zk_message_encrypted', {
        messageId: message.id,
        conversationId: message.conversationId,
        proofId: result?.proof.publicHash,
      })

      // Return the encrypted message with proof
      return {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        encryptedContent: result?.encryptedData,
        timestamp: message.timestamp,
        metadata: message.metadata,
        proof: result?.proof,
      }
    } catch (error) {
      await logAudit(message.senderId, 'zk_message_encryption_failed', {
        messageId: message.id,
        conversationId: message.conversationId,
        error: error instanceof Error ? error?.message : String(error),
      })
      throw error
    }
  },

  /**
   * Decrypt an encrypted chat message
   *
   * @param encryptedMessage Encrypted message
   * @returns Decrypted message
   */
  async decryptMessage(
    encryptedMessage: EncryptedChatMessage
  ): Promise<ChatMessageWithProof> {
    try {
      // Decrypt the message conten
      const decryptedContent = await crypto.decrypt(
        encryptedMessage.encryptedContent,
        'chat-message'
      )
      const parsedContent = JSON.parse(decryptedContent)

      // Log the decryption
      await logAudit(encryptedMessage.senderId, 'zk_message_decrypted', {
        messageId: encryptedMessage.id,
        conversationId: encryptedMessage.conversationId,
      })

      // Return the decrypted message with proof
      return {
        id: encryptedMessage.id,
        conversationId: encryptedMessage.conversationId,
        senderId: encryptedMessage.senderId,
        content: parsedContent.content,
        timestamp: encryptedMessage.timestamp,
        metadata: encryptedMessage.metadata,
        proof: encryptedMessage.proof,
      }
    } catch (error) {
      await logAudit(
        encryptedMessage.senderId,
        'zk_message_decryption_failed',
        {
          messageId: encryptedMessage.id,
          conversationId: encryptedMessage.conversationId,
          error: error instanceof Error ? error?.message : String(error),
        }
      )
      throw error
    }
  },
  /**
   * Verify that a message is from an authorized sender
   *
   * @param senderId Sender ID
   * @param authorizedSenders List of authorized sender IDs
   * @returns Proof data for the verification
   */
  async verifyAuthorizedSender(
    senderId: string,
    authorizedSenders: string[]
  ): Promise<ProofData> {
    try {
      // Check if the sender is in the authorized lis
      const isAuthorized = authorizedSenders.includes(senderId)

      if (!isAuthorized) {
        throw new Error(`Sender ${senderId} is not authorized`)
      }

      // Generate a proof for the authorization
      const proof = await zkSystem.generateProof({
        senderId,
        authorizedSenders,
        isAuthorized: true,
        timestamp: Date.now(),
      } as any)

      // Log the authorization proof generation
      await logAudit(senderId, 'zk_sender_authorization_verified', {
        proofId: proof.publicHash,
      })

      return proof
    } catch (error) {
      await logAudit(senderId, 'zk_sender_authorization_failed', {
        error: error instanceof Error ? error?.message : String(error),
      })
      throw error
    }
  },
}

export default zkChat
