// 教員アカウントを作成する。`pnpm seed`（ローカル D1）/ `pnpm seed:remote`（本番 D1）
// .env の SEED_TEACHER_EMAIL / SEED_TEACHER_PASSWORD / SEED_TEACHER_NAME を読む。
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { webcrypto as crypto } from 'node:crypto'

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
}

const email = process.env.SEED_TEACHER_EMAIL
const password = process.env.SEED_TEACHER_PASSWORD
const name = process.env.SEED_TEACHER_NAME ?? '教員'
if (!email || !password) {
  console.error('SEED_TEACHER_EMAIL と SEED_TEACHER_PASSWORD を .env に設定してください')
  process.exit(1)
}

const toHex = (b) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('')
async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256)
  return `pbkdf2$100000$${toHex(salt)}$${toHex(bits)}`
}

const remote = process.argv.includes('--remote')
const id = crypto.randomUUID()
const hash = await hashPassword(password)
const esc = (s) => s.replaceAll("'", "''")
const sql = `INSERT INTO users (id, role, email, name, password_hash, created_at)
VALUES ('${id}', 'teacher', '${esc(email)}', '${esc(name)}', '${hash}', ${Math.floor(Date.now() / 1000)})
ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, name = excluded.name;`

execFileSync('pnpm', ['wrangler', 'd1', 'execute', 'pdca-board', remote ? '--remote' : '--local', '--command', sql], {
  stdio: 'inherit',
})
console.log(`教員アカウントを作成しました: ${email}`)
