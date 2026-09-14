import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, newId, now } from '../db'
import { users } from '../schema'
import { requireUser } from '../auth'
import { hashPassword } from '../password'

const studentInput = z.object({
  name: z.string().trim().min(1, '氏名を入力してください'),
  email: z.string().trim().email('Email の形式が正しくありません'),
})

async function emailTaken(email: string, exceptId?: string) {
  const found = await getDb().select({ id: users.id }).from(users).where(eq(users.email, email)).get()
  return !!found && found.id !== exceptId
}

export const listStudents = createServerFn({ method: 'GET' }).handler(async () => {
  await requireUser('teacher')
  return getDb()
    .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.role, 'student'))
    .orderBy(asc(users.name))
})

export const createStudent = createServerFn({ method: 'POST' })
  .validator(studentInput.extend({ password: z.string().min(8, 'パスワードは 8 文字以上にしてください') }))
  .handler(async ({ data }) => {
    await requireUser('teacher')
    if (await emailTaken(data.email)) return { ok: false as const, message: 'この Email はすでに登録されています' }
    await getDb().insert(users).values({
      id: newId(),
      role: 'student',
      name: data.name,
      email: data.email,
      passwordHash: await hashPassword(data.password),
      createdAt: now(),
    })
    return { ok: true as const }
  })

export const updateStudent = createServerFn({ method: 'POST' })
  .validator(studentInput.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireUser('teacher')
    if (await emailTaken(data.email, data.id)) return { ok: false as const, message: 'この Email はすでに登録されています' }
    await getDb().update(users).set({ name: data.name, email: data.email }).where(eq(users.id, data.id))
    return { ok: true as const }
  })

export const resetStudentPassword = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), password: z.string().min(8, 'パスワードは 8 文字以上にしてください') }))
  .handler(async ({ data }) => {
    await requireUser('teacher')
    await getDb()
      .update(users)
      .set({ passwordHash: await hashPassword(data.password) })
      .where(eq(users.id, data.id))
    return { ok: true as const }
  })

export const deleteStudent = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireUser('teacher')
    await getDb().delete(users).where(eq(users.id, data.id))
    return { ok: true as const }
  })
