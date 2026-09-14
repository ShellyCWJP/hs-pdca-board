import { eq } from 'drizzle-orm'
import { getCookie, setCookie, deleteCookie, getRequest } from '@tanstack/react-start/server'
import { getDb, now } from './db'
import { sessions, users, type User, type UserRole } from './schema'

const COOKIE_NAME = 'session'
const SESSION_DAYS = 30

export type SessionUser = Pick<User, 'id' | 'role' | 'email' | 'name'>

function toSessionUser(u: User): SessionUser {
  return { id: u.id, role: u.role, email: u.email, name: u.name }
}

export async function createSession(userId: string) {
  const db = getDb()
  const id = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('')
  const expiresAt = now() + SESSION_DAYS * 24 * 60 * 60
  await db.insert(sessions).values({ id, userId, expiresAt })
  // HTTP でアクセスする開発環境（LAN / Tailscale 経由など）では Secure 属性付き Cookie が保存されないため、
  // HTTPS のときだけ Secure を付ける。
  const secure = new URL(getRequest().url).protocol === 'https:'
  setCookie(COOKIE_NAME, id, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function destroySession() {
  const id = getCookie(COOKIE_NAME)
  if (id) await getDb().delete(sessions).where(eq(sessions.id, id))
  deleteCookie(COOKIE_NAME, { path: '/' })
}

/** Cookie からログイン中のユーザーを返す。未ログインや期限切れなら null。 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const id = getCookie(COOKIE_NAME)
  if (!id) return null
  const db = getDb()
  const row = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .get()
  if (!row) return null
  if (row.expiresAt < now()) {
    await db.delete(sessions).where(eq(sessions.id, id))
    return null
  }
  return toSessionUser(row.user)
}

export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message)
  }
}

/** Server Function 内で権限を検査する。role を渡すとその役割のみ許可。 */
export async function requireUser(role?: UserRole): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new AuthError(401, 'ログインが必要です')
  if (role && user.role !== role) throw new AuthError(403, '権限がありません')
  return user
}
