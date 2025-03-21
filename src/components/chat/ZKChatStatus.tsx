import React, { useState, useEffect } from 'react'
import { zkChat } from '../../lib/chat/index'
import type { ChatMessageWithProof } from '../../lib/chat/index'

interface ZKChatStatusProps {
  message: ChatMessageWithProof
  className?: string
}

/**
 * Component to display the ZK verification status of a chat message
 * Enhanced with accessibility features
 */
export default function ZKChatStatus({
  message,
  className = '',
}: ZKChatStatusProps) {
  const [verificationStatus, setVerificationStatus] = useState<{
    isValid: boolean
    isVerifying: boolean
    error?: string
  }>({
    isValid: false,
    isVerifying: true,
  })

  useEffect(() => {
    let isMounted = true

    const verifyMessage = async () => {
      try {
        // Verify the message proof
        const result = await zkChat.verifyMessageProof(message)

        if (isMounted) {
          setVerificationStatus({
            isValid: result?.isValid,
            isVerifying: false,
          })
        }
      } catch (error) {
        if (isMounted) {
          setVerificationStatus({
            isValid: false,
            isVerifying: false,
            error:
              error instanceof Error ? error?.message : 'Verification failed',
          })
        }
      }
    }

    verifyMessage()

    return () => {
      isMounted = false
    }
  }, [message])

  // Determine the appropriate ARIA attributes based on verification status
  const getAriaAttributes = () => {
    if (verificationStatus.isVerifying) {
      return {
        'role': 'status',
        'aria-live': 'polite' as React.AriaAttributes['aria-live'],
        'aria-label': 'Verifying message security',
      }
    } else if (verificationStatus.isValid) {
      return {
        'role': 'status',
        'aria-live': 'polite' as React.AriaAttributes['aria-live'],
        'aria-label': `Message verified at ${new Date(message.timestamp).toLocaleTimeString()}`,
      }
    } else {
      return {
        'role': 'alert',
        'aria-live': 'assertive' as React.AriaAttributes['aria-live'],
        'aria-label': `Message verification failed: ${verificationStatus.error || 'Unknown error'}`,
      }
    }
  }

  const ariaAttributes = getAriaAttributes()

  return (
    <div className={`zk-chat-status ${className}`} {...ariaAttributes}>
      {verificationStatus.isVerifying ? (
        <div className="zk-status-verifying flex items-center text-gray-500 dark:text-gray-400">
          <span className="zk-status-icon mr-1" aria-hidden="true">
            ⏳
          </span>
          <span className="zk-status-text">Verifying...</span>
        </div>
      ) : verificationStatus.isValid ? (
        <div className="zk-status-valid flex items-center text-green-600 dark:text-green-400">
          <span className="zk-status-icon mr-1" aria-hidden="true">
            ✅
          </span>
          <span className="zk-status-text">Verified</span>
          <span className="zk-status-timestamp ml-2">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ) : (
        <div className="zk-status-invalid flex items-center text-red-600 dark:text-red-400">
          <span className="zk-status-icon mr-1" aria-hidden="true">
            ❌
          </span>
          <span className="zk-status-text">Invalid</span>
          {verificationStatus.error && (
            <span
              className="zk-status-error ml-2"
              title={verificationStatus.error}
            >
              {verificationStatus.error.length > 30
                ? `${verificationStatus.error.substring(0, 30)}...`
                : verificationStatus.error}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
