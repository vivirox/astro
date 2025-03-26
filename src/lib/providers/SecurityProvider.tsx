import type { EncryptionKey } from '@/lib/fhe/types'
import type { ReactNode } from 'react'
import { FHEService } from '@/lib/fhe'
import { createContext, useContext, useEffect, useState } from 'react'

export type SecurityLevel = 'standard' | 'hipaa' | 'maximum'

interface SecurityState {
  level: SecurityLevel
  isEncrypted: boolean
  isKeyRotationNeeded: boolean
  lastKeyRotation: Date | null
  currentKey: EncryptionKey | null
}

interface SecurityContextValue extends SecurityState {
  setSecurityLevel: (level: SecurityLevel) => Promise<void>
  rotateKeys: () => Promise<void>
  encrypt: (data: unknown) => Promise<string>
  decrypt: (data: string) => Promise<unknown>
  verifyIntegrity: (data: string) => Promise<boolean>
}

interface SecurityProviderProps {
  children: ReactNode
  level?: SecurityLevel
  initialKey?: EncryptionKey
}

const SecurityContext = createContext<SecurityContextValue | null>(null)

const KEY_ROTATION_INTERVAL = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

export function SecurityProvider({
  children,
  level = 'hipaa',
  initialKey,
}: SecurityProviderProps) {
  // Initialize FHE service
  const fheService = new FHEService()

  // State management
  const [securityState, setSecurityState] = useState<SecurityState>({
    level,
    isEncrypted: false,
    isKeyRotationNeeded: false,
    lastKeyRotation: null,
    currentKey: initialKey ?? null,
  })

  // Initialize security system
  useEffect(() => {
    async function initializeSecurity() {
      try {
        // Initialize FHE if not using standard security
        if (level !== 'standard') {
          await fheService.initialize()

          // Generate initial key if none provided
          if (!initialKey) {
            const newKey = await fheService.generateKey()
            setSecurityState((prev) => ({
              ...prev,
              currentKey: newKey,
              lastKeyRotation: new Date(),
            }))
          }
        }

        setSecurityState((prev) => ({
          ...prev,
          isEncrypted: level !== 'standard',
        }))
      } catch (error) {
        console.error('Failed to initialize security:', error)
        // Fallback to standard security on initialization failure
        setSecurityState((prev) => ({
          ...prev,
          level: 'standard',
          isEncrypted: false,
        }))
      }
    }

    initializeSecurity()
  }, [level, initialKey])

  // Check key rotation needs
  useEffect(() => {
    if (!securityState.lastKeyRotation || securityState.level === 'standard') {
      return
    }

    const checkKeyRotation = () => {
      const timeSinceLastRotation =
        Date.now() - securityState.lastKeyRotation!.getTime()
      setSecurityState((prev) => ({
        ...prev,
        isKeyRotationNeeded: timeSinceLastRotation >= KEY_ROTATION_INTERVAL,
      }))
    }

    // Check immediately and set up interval
    checkKeyRotation()
    const interval = setInterval(checkKeyRotation, 60 * 60 * 1000) // Check every hour

    return () => clearInterval(interval)
  }, [securityState.lastKeyRotation, securityState.level])

  // Security level management
  const setSecurityLevel = async (newLevel: SecurityLevel) => {
    try {
      if (newLevel !== 'standard' && !fheService.isInitialized) {
        await fheService.initialize()
      }

      if (newLevel !== 'standard' && !securityState.currentKey) {
        const newKey = await fheService.generateKey()
        setSecurityState((prev) => ({
          ...prev,
          level: newLevel,
          isEncrypted: true,
          currentKey: newKey,
          lastKeyRotation: new Date(),
        }))
      } else {
        setSecurityState((prev) => ({
          ...prev,
          level: newLevel,
          isEncrypted: newLevel !== 'standard',
        }))
      }
    } catch (error) {
      console.error('Failed to change security level:', error)
      throw new Error('Security level change failed')
    }
  }

  // Key rotation
  const rotateKeys = async () => {
    if (securityState.level === 'standard') {
      return
    }

    try {
      const newKey = await fheService.generateKey()
      // Re-encrypt existing data with new key if needed
      // This would typically involve a background job to re-encrypt stored data

      setSecurityState((prev) => ({
        ...prev,
        currentKey: newKey,
        lastKeyRotation: new Date(),
        isKeyRotationNeeded: false,
      }))
    } catch (error) {
      console.error('Key rotation failed:', error)
      throw new Error('Key rotation failed')
    }
  }

  // Encryption operations
  const encrypt = async (data: unknown): Promise<string> => {
    if (securityState.level === 'standard') {
      return JSON.stringify(data)
    }

    if (!securityState.currentKey) {
      throw new Error('No encryption key available')
    }

    return fheService.encrypt(data, securityState.currentKey)
  }

  const decrypt = async (data: string): Promise<unknown> => {
    if (securityState.level === 'standard') {
      return JSON.parse(data)
    }

    if (!securityState.currentKey) {
      throw new Error('No encryption key available')
    }

    return fheService.decrypt(data, securityState.currentKey)
  }

  // Data integrity verification
  const verifyIntegrity = async (data: string): Promise<boolean> => {
    if (securityState.level === 'standard') {
      return true
    }

    return fheService.verifyIntegrity(data)
  }

  const value: SecurityContextValue = {
    ...securityState,
    setSecurityLevel,
    rotateKeys,
    encrypt,
    decrypt,
    verifyIntegrity,
  }

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  )
}

export function useSecurity() {
  const context = useContext(SecurityContext)
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider')
  }
  return context
}

// Export a HOC for wrapping components that need security access
export function withSecurity<T extends object>(
  Component: React.ComponentType<T>,
): React.FC<T & Pick<SecurityProviderProps, 'level' | 'initialKey'>> {
  return function WithSecurityWrapper(
    props: T & Pick<SecurityProviderProps, 'level' | 'initialKey'>,
  ) {
    const { level, initialKey, ...componentProps } = props
    return (
      <SecurityProvider level={level} initialKey={initialKey}>
        <Component {...(componentProps as T)} />
      </SecurityProvider>
    )
  }
}
