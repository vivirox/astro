/**
 * Zero-knowledge chat integration
 * Provides ZK proof verification for chat messages
 */

import { createZKSystem } from '../zk';
import { createCryptoSystem } from '../crypto';
import type { ProofData, VerificationResult } from '../zk';
import { auditLogger } from '../audit';

// Initialize crypto and ZK systems
const crypto = createCryptoSystem({
  namespace: 'chat',
  keyRotationDays: 90,
});

const zkSystem = createZKSystem({
  namespace: 'chat',
  crypto,
});

/**
 * Chat message with ZK proof
 */
export interface ChatMessageWithProof {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
  proof: ProofData;
}

/**
 * Encrypted chat message with ZK proof
 */
export interface EncryptedChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  encryptedContent: string;
  timestamp: number;
  metadata?: Record<string, any>;
  proof: ProofData;
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
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    timestamp: number;
    metadata?: Record<string, any>;
  }): Promise<ChatMessageWithProof> {
    try {
      // Generate a proof for the message
      const proof = await zkSystem.generateProof({
        messageId: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        contentHash: crypto.encryption.hash(message.content),
        timestamp: message.timestamp,
      });

      // Log the proof generation
      auditLogger.log({
        action: 'zk_message_proof_generated',
        category: 'chat',
        data: {
          messageId: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          proofId: proof.publicHash,
        },
      });

      // Return the message with proof
      return {
        ...message,
        proof,
      };
    } catch (error) {
      auditLogger.error({
        action: 'zk_message_proof_generation_failed',
        category: 'chat',
        data: {
          messageId: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  },

  /**
   * Verify a proof for a chat message
   * 
   * @param messageWithProof Message with proof
   * @returns Verification result
   */
  async verifyMessageProof(messageWithProof: ChatMessageWithProof): Promise<VerificationResult> {
    try {
      // Verify the proof
      const result = await zkSystem.verifyProof(messageWithProof.proof);

      // Log the verification result
      auditLogger.log({
        action: 'zk_message_proof_verified',
        category: 'chat',
        data: {
          messageId: messageWithProof.id,
          conversationId: messageWithProof.conversationId,
          senderId: messageWithProof.senderId,
          proofId: messageWithProof.proof.publicHash,
          isValid: result.isValid,
        },
      });

      return result;
    } catch (error) {
      auditLogger.error({
        action: 'zk_message_proof_verification_failed',
        category: 'chat',
        data: {
          messageId: messageWithProof.id,
          conversationId: messageWithProof.conversationId,
          senderId: messageWithProof.senderId,
          proofId: messageWithProof.proof.publicHash,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  },

  /**
   * Encrypt a chat message and generate a proof
   * 
   * @param message Chat message data
   * @returns Encrypted message with proof
   */
  async encryptMessageWithProof(message: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    timestamp: number;
    metadata?: Record<string, any>;
  }): Promise<EncryptedChatMessage> {
    try {
      // Create message data for ZK proof
      const messageData = {
        messageId: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        timestamp: message.timestamp,
      };

      // Encrypt and generate proof
      const result = await zkSystem.encryptAndProve(messageData, 'chat-message');

      // Log the encryption and proof generation
      auditLogger.log({
        action: 'zk_message_encrypted',
        category: 'chat',
        data: {
          messageId: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          proofId: result.proof.publicHash,
        },
      });

      // Return the encrypted message with proof
      return {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        encryptedContent: result.encryptedData,
        timestamp: message.timestamp,
        metadata: message.metadata,
        proof: result.proof,
      };
    } catch (error) {
      auditLogger.error({
        action: 'zk_message_encryption_failed',
        category: 'chat',
        data: {
          messageId: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  },

  /**
   * Decrypt an encrypted chat message
   * 
   * @param encryptedMessage Encrypted message
   * @returns Decrypted message
   */
  async decryptMessage(encryptedMessage: EncryptedChatMessage): Promise<ChatMessageWithProof> {
    try {
      // Decrypt the message content
      const decryptedContent = await crypto.decrypt(encryptedMessage.encryptedContent);
      const parsedContent = JSON.parse(decryptedContent);

      // Log the decryption
      auditLogger.log({
        action: 'zk_message_decrypted',
        category: 'chat',
        data: {
          messageId: encryptedMessage.id,
          conversationId: encryptedMessage.conversationId,
          senderId: encryptedMessage.senderId,
        },
      });

      // Return the decrypted message with proof
      return {
        id: encryptedMessage.id,
        conversationId: encryptedMessage.conversationId,
        senderId: encryptedMessage.senderId,
        content: parsedContent.content,
        timestamp: encryptedMessage.timestamp,
        metadata: encryptedMessage.metadata,
        proof: encryptedMessage.proof,
      };
    } catch (error) {
      auditLogger.error({
        action: 'zk_message_decryption_failed',
        category: 'chat',
        data: {
          messageId: encryptedMessage.id,
          conversationId: encryptedMessage.conversationId,
          senderId: encryptedMessage.senderId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  },

  /**
   * Verify that a message is from an authorized sender
   * 
   * @param senderId Sender ID
   * @param authorizedSenders List of authorized sender IDs
   * @returns Proof data for the verification
   */
  async verifyAuthorizedSender(senderId: string, authorizedSenders: string[]): Promise<ProofData> {
    try {
      // Check if the sender is in the authorized list
      const isAuthorized = authorizedSenders.includes(senderId);
      
      if (!isAuthorized) {
        throw new Error(`Sender ${senderId} is not authorized`);
      }

      // Generate a proof for the authorization
      const proof = await zkSystem.generateProof({
        senderId,
        authorizedSenders,
        isAuthorized: true,
        timestamp: Date.now(),
      });

      // Log the authorization proof generation
      auditLogger.log({
        action: 'zk_sender_authorization_verified',
        category: 'chat',
        data: {
          senderId,
          proofId: proof.publicHash,
        },
      });

      return proof;
    } catch (error) {
      auditLogger.error({
        action: 'zk_sender_authorization_failed',
        category: 'chat',
        data: {
          senderId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  },
};

export default zkChat; 