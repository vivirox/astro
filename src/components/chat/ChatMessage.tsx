import React, { useRef } from "react";
import ZKChatStatus from "./ZKChatStatus";
import type { ChatMessageWithProof } from "../../lib/chat/zkChat";

// Update the interface to include ZK proof and accessibility props
interface ChatMessageProps {
  message: ChatMessageWithProof;
  isUser: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  tabIndex?: number;
  // ... existing props ...
}

export default function ChatMessage({
  message,
  isUser,
  onKeyDown,
  tabIndex = 0,
  /* ... existing props ... */
}: ChatMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null);

  // Handle keyboard interaction
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Call parent handler if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div
      ref={messageRef}
      className={`chat-message ${isUser ? "user" : "ai"} p-3 rounded-lg mb-3 ${
        isUser
          ? "bg-blue-100 dark:bg-blue-900 ml-auto max-w-[80%] text-gray-900 dark:text-gray-100"
          : "bg-gray-100 dark:bg-gray-800 mr-auto max-w-[80%] text-gray-900 dark:text-gray-100"
      }`}
      role="log"
      aria-label={`${isUser ? "Your" : "AI"} message`}
      tabIndex={tabIndex}
      onKeyDown={handleKeyDown}
    >
      <div className="message-header flex justify-between items-center mb-2">
        <span className="text-sm font-semibold" id={`sender-${message.id}`}>
          {isUser ? "You" : "AI"}
        </span>
        <span
          className="text-xs text-gray-500 dark:text-gray-400"
          aria-label={`Sent at ${new Date(message.timestamp).toLocaleTimeString()}`}
        >
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div
        className="message-content whitespace-pre-wrap"
        aria-labelledby={`sender-${message.id}`}
      >
        {message.content}
      </div>

      {/* Add ZK verification status */}
      <div className="message-footer mt-2">
        <ZKChatStatus
          message={message}
          className="chat-message-zk-status text-xs"
        />
      </div>
    </div>
  );
}
