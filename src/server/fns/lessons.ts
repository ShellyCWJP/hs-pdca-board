import { createServerFn } from '@tanstack/react-start'
import { count, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, newId, now } from '../db'
import { lessons, pdcaRecords } from '../schema'
import { requireUser } from '../auth'

const lessonInput = z.object({
  number: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
})

export const listLessons = createServerFn({ method: 'GET' }).handler(async () => {
  await requireUser()
  const db = getDb()
  return db
    .select({
      id: lessons.id,
      number: lessons.number,
      date: lessons.date,
      recordCount: sql<number>`(select count(*) from ${pdcaRecords} where ${pdcaRecords.lessonId} = ${lessons.id})`,
    })
    .from(lessons)
    .orderBy(desc(lessons.number))
})

export const createLesson = createServerFn({ method: 'POST' })
  .validator(lessonInput)
  .handler(async ({ data }) => {
    await requireUser('teacher')
    const db = getDb()
    const dup = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.number, data.number)).get()
    if (dup) return { ok: false as const, message: `第 ${data.number} 回はすでに存在します` }
    await db.insert(lessons).values({ id: newId(), number: data.number, date: data.date, createdAt: now() })
    return { ok: true as const }
  })

export const updateLesson = createServerFn({ method: 'POST' })
  .validator(lessonInput.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireUser('teacher')
    const db = getDb()
    const dup = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.number, data.number)).get()
    if (dup && dup.id !== data.id) return { ok: false as const, message: `第 ${data.number} 回はすでに存在します` }
    await db.update(lessons).set({ number: data.number, date: data.date }).where(eq(lessons.id, data.id))
    return { ok: true as const }
  })

export const deleteLesson = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireUser('teacher')
    const db = getDb()
    const [{ n }] = await db.select({ n: count() }).from(pdcaRecords).where(eq(pdcaRecords.lessonId, data.id))
    if (n > 0) return { ok: false as const, message: '記録が存在する授業回は削除できません' }
    await db.delete(lessons).where(eq(lessons.id, data.id))
    return { ok: true as const }
  })
