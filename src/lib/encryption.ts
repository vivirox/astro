import { Buffer } from 'node:buffer'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import process from 'node:process'

export class FHE {
  private static readonly algorithm = 'aes-256-gcm'
  private static readonly key = process.env.ENCRYPTION_KEY || randomBytes(32)

  static async encrypt(data: unknown): Promise<string> {
    const iv = randomBytes(16)
    const cipher = createCipheriv(this.algorithm, this.key, iv)
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final(),
    ])
    const authTag = cipher.getAuthTag()
    return JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted.toString('hex'),
      tag: authTag.toString('hex'),
    })
  }

  static async decrypt(encryptedData: string): Promise<unknown> {
    const { iv, data, tag } = JSON.parse(encryptedData)
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex'),
    )
    decipher.setAuthTag(Buffer.from(tag, 'hex'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data, 'hex')),
      decipher.final(),
    ])
    return JSON.parse(decrypted.toString())
  }
}
