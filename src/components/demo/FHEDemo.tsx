'use client'

import type {
  EncryptionMode,
  HomomorphicOperationResult,
} from '@/lib/fhe/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fheService } from '@/lib/fhe'
import { FHEOperation } from '@/lib/fhe/types'
import { useEffect, useState } from 'react'
import { Badge } from '../ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

/**
 * FHE Demo Component for demonstrating Fully Homomorphic Encryption capabilities
 */
export interface FHEDemoProps {
  defaultMessage?: string
}

export function FHEDemo({
  defaultMessage = 'This is a secure message',
}: FHEDemoProps) {
  const [initialized, setInitialized] = useState(false)
  const [message, setMessage] = useState(defaultMessage)
  const [encryptedMessage, setEncryptedMessage] = useState('')
  const [decryptedMessage, setDecryptedMessage] = useState('')
  const [operation, setOperation] = useState<string>(FHEOperation.SENTIMENT)
  const [operationResult, setOperationResult] =
    useState<HomomorphicOperationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [encryptionMode, setEncryptionMode] =
    useState<string>('Not initialized')
  const [keyId, setKeyId] = useState<string>('Not generated')

  useEffect(() => {
    async function initializeFHE() {
      try {
        await fheService.initialize({
          mode: 'fhe' as EncryptionMode,
          securityLevel: 'high',
        })
        setInitialized(true)
        setEncryptionMode(fheService.getEncryptionMode())
        // Get current key ID
        const keyRotationInfo = await fheService.rotateKeys()
        setKeyId(keyRotationInfo)
      } catch (error) {
        setError(`Failed to initialize FHE: ${(error as Error).message}`)
      }
    }

    initializeFHE()
  }, [])

  const handleEncrypt = async () => {
    if (!message) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const encrypted = await fheService.encrypt(message)
      setEncryptedMessage(encrypted)
    } catch (error) {
      setError(`Encryption failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDecrypt = async () => {
    if (!encryptedMessage) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const decrypted = await fheService.decrypt(encryptedMessage)
      setDecryptedMessage(decrypted)
    } catch (error) {
      setError(`Decryption failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async () => {
    if (!encryptedMessage) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // First try client-side processing
      let result = null

      try {
        result = await fheService.processEncrypted(
          encryptedMessage,
          operation as FHEOperation,
        )
      } catch (clientError) {
        console.warn('Client-side processing failed, trying API:', clientError)

        // Fall back to API processing
        const response = await fetch('/api/fhe/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            encryptedData: encryptedMessage,
            operation: operation as FHEOperation,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'API processing failed')
        }

        result = data.result
      }

      setOperationResult(result)
    } catch (error) {
      setError(`Processing failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRotateKeys = async () => {
    setLoading(true)
    setError(null)

    try {
      let newKeyId = ''

      // First try client-side rotation
      try {
        newKeyId = await fheService.rotateKeys()
      } catch (clientError) {
        console.warn(
          'Client-side key rotation failed, trying API:',
          clientError,
        )

        // Fall back to API rotation
        const response = await fetch('/api/fhe/rotate-keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'API key rotation failed')
        }

        newKeyId = data.keyId
      }

      setKeyId(newKeyId)
    } catch (error) {
      setError(`Key rotation failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Fully Homomorphic Encryption Demo</CardTitle>
        <CardDescription>
          Explore secure data processing with FHE technology
        </CardDescription>
        <div className="flex gap-2 mt-2">
          <Badge variant={initialized ? 'default' : 'destructive'}>
            {initialized ? 'FHE Initialized' : 'Not Initialized'}
          </Badge>
          <Badge variant="outline">
            Mode:
            {encryptionMode}
          </Badge>
          <Badge variant="outline">
            Key ID: {keyId.substring(0, 8)}
            ...
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="encrypt" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="encrypt">Encrypt</TabsTrigger>
            <TabsTrigger value="process">Process</TabsTrigger>
            <TabsTrigger value="decrypt">Decrypt</TabsTrigger>
          </TabsList>

          <TabsContent value="encrypt">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Message to Encrypt</Label>
                <Input
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter a message to encrypt"
                />
              </div>

              <Button
                onClick={handleEncrypt}
                disabled={!initialized || loading || !message}
                className="w-full"
              >
                {loading ? 'Encrypting...' : 'Encrypt Message'}
              </Button>

              {encryptedMessage && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <Label>Encrypted Message</Label>
                  <p className="text-xs font-mono break-all mt-1">
                    {encryptedMessage}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="process">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Operation</Label>
                <div className="flex gap-2">
                  <Button
                    variant={
                      operation === FHEOperation.SENTIMENT
                        ? 'primary'
                        : 'outline'
                    }
                    onClick={() => setOperation(FHEOperation.SENTIMENT)}
                  >
                    Sentiment
                  </Button>
                  <Button
                    variant={
                      operation === FHEOperation.CATEGORIZE
                        ? 'primary'
                        : 'outline'
                    }
                    onClick={() => setOperation(FHEOperation.CATEGORIZE)}
                  >
                    Categorize
                  </Button>
                  <Button
                    variant={
                      operation === FHEOperation.SUMMARIZE
                        ? 'primary'
                        : 'outline'
                    }
                    onClick={() => setOperation(FHEOperation.SUMMARIZE)}
                  >
                    Summarize
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleProcess}
                disabled={!initialized || loading || !encryptedMessage}
                className="w-full"
              >
                {loading ? 'Processing...' : `Process with ${operation}`}
              </Button>

              {operationResult && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <Label>Operation Result</Label>
                  <pre className="text-xs font-mono mt-1 whitespace-pre-wrap">
                    {JSON.stringify(operationResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="decrypt">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="encryptedMessage">Encrypted Message</Label>
                <Input
                  id="encryptedMessage"
                  value={encryptedMessage}
                  onChange={(e) => setEncryptedMessage(e.target.value)}
                  placeholder="Enter an encrypted message"
                />
              </div>

              <Button
                onClick={handleDecrypt}
                disabled={!initialized || loading || !encryptedMessage}
                className="w-full"
              >
                {loading ? 'Decrypting...' : 'Decrypt Message'}
              </Button>

              {decryptedMessage && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <Label>Decrypted Message</Label>
                  <p className="mt-1">{decryptedMessage}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md">
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reset Demo
        </Button>
        <Button
          variant="secondary"
          onClick={handleRotateKeys}
          disabled={!initialized || loading}
        >
          Rotate Encryption Keys
        </Button>
      </CardFooter>
    </Card>
  )
}
