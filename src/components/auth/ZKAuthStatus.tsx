import { useState, useEffect } from 'react'
import { zkAuth } from '../../lib/auth/index'
import type { AuthSessionWithProof } from '../../lib/auth/index'

interface ZKAuthStatusProps {
  session: AuthSessionWithProof
  className?: string
}

/**
 * Component to display the ZK verification status of an authentication session
 */
export default function ZKAuthStatus({
  session,
  className = '',
}: ZKAuthStatusProps) {
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

    const verifySession = async () => {
      try {
        // Verify the session proof
        const result = await zkAuth.verifySessionProofWithZK(session)

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

    verifySession()

    return () => {
      isMounted = false
    }
  }, [session])

  return (
    <div className={`zk-auth-status ${className}`}>
      {verificationStatus.isVerifying ? (
        <div className="zk-status-verifying">
          <span className="zk-status-icon">⏳</span>
          <span className="zk-status-text">Verifying session...</span>
        </div>
      ) : verificationStatus.isValid ? (
        <div className="zk-status-valid">
          <span className="zk-status-icon">✅</span>
          <span className="zk-status-text">Session verified</span>
          <span className="zk-status-timestamp">
            {new Date(session.startTime).toLocaleTimeString()}
          </span>
        </div>
      ) : (
        <div className="zk-status-invalid">
          <span className="zk-status-icon">❌</span>
          <span className="zk-status-text">Invalid session</span>
          {verificationStatus.error && (
            <span className="zk-status-error">{verificationStatus.error}</span>
          )}
        </div>
      )}
    </div>
  )
}
