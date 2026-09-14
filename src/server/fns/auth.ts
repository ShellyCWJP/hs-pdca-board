import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db'
import { users } from '../schema'
import { createSession, destroySession, getSessionUser, requireUser } from '../auth'
import { hashPassword, verifyPassword } from '../password'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(() => getSessionUser())

export const login = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.string().email(), password: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await getDb().select().from(users).where(eq(users.email, data.email)).get()
    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      return { ok: false as const, message: 'Email またはパスワードが違います' }
    }
    await createSession(user.id)
    return { ok: true as const, role: user.role }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  await destroySession()
  return { ok: true }
})

export const changePassword = createServerFn({ method: 'POST' })
  .validator(z.object({ current: z.string().min(1), next: z.string().min(8) }))
  .handler(async ({ data }) => {
    const me = await requireUser('student')
    const db = getDb()
    const user = await db.select().from(users).where(eq(users.id, me.id)).get()
    if (!user || !(await verifyPassword(data.current, user.passwordHash))) {
      return { ok: false as const, message: '現在のパスワードが違います' }
    }
    await db.update(users).set({ passwordHash: await hashPassword(data.next) }).where(eq(users.id, me.id))
    return { ok: true as const }
  })
