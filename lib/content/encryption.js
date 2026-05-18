import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const KEY_BYTES = 32

function getKey() {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) throw new Error('ENCRYPTION_KEY must be 32-byte hex (64 chars)')
  return Buffer.from(hex, 'hex')
}

export function encrypt(plaintext) {
  if (!plaintext) return null
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(ciphertext) {
  if (!ciphertext) return null
  const key = getKey()
  const buf = Buffer.from(ciphertext, 'base64')
  const iv = buf.slice(0, 12)
  const tag = buf.slice(12, 28)
  const encrypted = buf.slice(28)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
