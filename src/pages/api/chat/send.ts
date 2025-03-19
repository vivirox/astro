import { zkChat } from "../../../lib/chat";

// Update the message sending handler to include ZK proof generation
export async function POST(request: Request) {
  try {
    // ... existing message validation logic ...

    // Create message data
    const messageData = {
      id: "msg-" + crypto.randomUUID(),
      conversationId: body.conversationId,
      senderId: body.userId,
      content: body.message,
      timestamp: Date.now(),
      metadata: {
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    };

    // Generate ZK proof for the message
    const messageWithProof = await zkChat.generateMessageProof(messageData);

    // For sensitive conversations, encrypt the message with proof
    let encryptedMessage;
    if (body.isEncrypted) {
      encryptedMessage = await zkChat.encryptMessageWithProof(messageData);
      // ... store encrypted message ...
    } else {
      // ... store message with proof ...
    }

    // Verify the sender is authorized (for AI messages or restricted conversations)
    if (body.requireSenderVerification) {
      const authorizedSenders = await getAuthorizedSenders(body.conversationId);
      await zkChat.verifyAuthorizedSender(body.userId, authorizedSenders);
    }

    // ... existing message processing logic ...

    // Return the message with proof
    return new Response(
      JSON.stringify({
        success: true,
        message: messageWithProof,
        // ... other response data ...
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          // ... other headers ...
        },
      },
    );
  } catch (error) {
    // ... existing error handling ...
  }
}

// Helper function to get authorized senders for a conversation
async function getAuthorizedSenders(conversationId: string): Promise<string[]> {
  // In a real implementation, this would fetch the authorized senders from the database
  // For now, return a mock list
  return ["user-1", "user-2", "ai-assistant"];
}
