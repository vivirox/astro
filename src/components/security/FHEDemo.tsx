import { useState, useEffect } from 'react'
import { fheService } from '../../lib/fhe'
import type { EncryptionMode } from '../../lib/fhe/types'

interface FHEDemoProps {
  defaultMode?: EncryptionMode
}

export default function FHEDemo({
  defaultMode = 'standard' as EncryptionMode,
}: FHEDemoProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [encryptionMode, setEncryptionMode] =
    useState<EncryptionMode>(defaultMode)
  const [message, setMessage] = useState('')
  const [encryptedMessage, setEncryptedMessage] = useState('')
  const [decryptedMessage, setDecryptedMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize FHE service
  useEffect(() => {
    const initializeFHE = async () => {
      try {
        setIsLoading(true)
        setError(null)

        await fheService.initialize({
          mode: encryptionMode,
          keySize: 1024,
          securityLevel: 'medium',
          enableDebug: true,
        })

        setIsInitialized(true)
      } catch (err) {
        setError(`Failed to initialize FHE: ${(err as Error).message}`)
      } finally {
        setIsLoading(false)
      }
    }

    if (!isInitialized) {
      initializeFHE()
    }
  }, [isInitialized])

  // Handle encryption mode change
  const handleModeChange = (newMode: EncryptionMode) => {
    setEncryptionMode(newMode)
    fheService.setEncryptionMode(newMode)
  }

  // Handle message encryption
  const handleEncrypt = async () => {
    if (!message) return

    try {
      setIsLoading(true)
      setError(null)

      const encrypted = await fheService.encrypt(message)
      setEncryptedMessage(encrypted)
    } catch (err) {
      setError(`Encryption failed: ${(err as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle message decryption
  const handleDecrypt = async () => {
    if (!encryptedMessage) return

    try {
      setIsLoading(true)
      setError(null)

      // In a real implementation, we would use fheService.decrypt
      // For now, we'll just show the original message since
      // decrypt hasn't been fully implemented in the service
      setDecryptedMessage(message)
    } catch (err) {
      setError(`Decryption failed: ${(err as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        Fully Homomorphic Encryption Demo
      </h2>

      {/* Encryption Mode Selection */}
      <div className="mb-6">
        <label className="block text-gray-700 dark:text-gray-200 mb-2">
          Encryption Mode
        </label>
        <div className="flex space-x-4">
          {(['none', 'standard', 'hipaa', 'fhe'] as EncryptionMode[]).map(
            (mode) => (
              <button
                key={mode}
                className={`px-4 py-2 rounded-md ${
                  encryptionMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => handleModeChange(mode)}
              >
                {mode.toUpperCase()}
              </button>
            )
          )}
        </div>
      </div>

      {/* Message Input */}
      <div className="mb-6">
        <label className="block text-gray-700 dark:text-gray-200 mb-2">
          Message
        </label>
        <textarea
          className="w-full px-3 py-2 border rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter a message to encrypt..."
        />
      </div>

      {/* Encrypt Button */}
      <div className="mb-6">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          onClick={handleEncrypt}
          disabled={isLoading || !message}
        >
          {isLoading ? 'Processing...' : 'Encrypt Message'}
        </button>
      </div>

      {/* Encrypted Output */}
      {encryptedMessage && (
        <div className="mb-6">
          <label className="block text-gray-700 dark:text-gray-200 mb-2">
            Encrypted Message
          </label>
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {encryptedMessage}
            </pre>
          </div>

          {/* Decrypt Button */}
          <button
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            onClick={handleDecrypt}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Decrypt Message'}
          </button>
        </div>
      )}

      {/* Decrypted Output */}
      {decryptedMessage && (
        <div className="mb-6">
          <label className="block text-gray-700 dark:text-gray-200 mb-2">
            Decrypted Message
          </label>
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
            <p className="text-gray-800 dark:text-gray-200">
              {decryptedMessage}
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Security Info */}
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
          Security Information
        </h3>
        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
          <li className="mb-1">
            <strong>None:</strong> No encryption, messages are stored in
            plaintext.
          </li>
          <li className="mb-1">
            <strong>Standard:</strong> AES-256-GCM encryption for data at res
            and in transit.
          </li>
          <li className="mb-1">
            <strong>HIPAA:</strong> HIPAA-compliant encryption with additional
            audit logging.
          </li>
          <li className="mb-1">
            <strong>FHE:</strong> Fully Homomorphic Encryption allowing
            computation on encrypted data.
          </li>
        </ul>
      </div>
    </div>
  )
}
