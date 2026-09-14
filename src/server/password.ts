// PBKDF2 によるパスワードハッシュ。Workers と Node.js の両方で動くよう Web Crypto のみ使う。
// 保存形式: pbkdf2$<iterations>$<salt hex>$<hash hex>

const ITERATIONS = 100_000
const KEY_LENGTH_BITS = 256

function toHex(bytes: ArrayBuffer | Uint8Array) {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string) {
  return new Uint8Array((hex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)))
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, KEY_LENGTH_BITS)
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, salt, ITERATIONS)
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(hash)}`
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iter, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'pbkdf2' || !iter || !saltHex || !hashHex) return false
  const hash = toHex(await derive(password, fromHex(saltHex), Number(iter)))
  if (hash.length !== hashHex.length) return false
  let diff = 0
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ hashHex.charCodeAt(i)
  return diff === 0
}
