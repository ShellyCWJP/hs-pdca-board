import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, lt } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, newId, now, type Db } from '../db'
import { DO_STATUSES, extraDos, feedbacks, lessons, pdcaRecords, planItems, users } from '../schema'
import { AuthError, requireUser } from '../auth'
import { calcAchievementRate } from '#/lib/achievement'

const planItemsInput = z.array(z.string().trim()).max(20)

async function loadRecordDetail(db: Db, recordId: string) {
  const row = await db
    .select({ record: pdcaRecords, lesson: lessons, student: { id: users.id, name: users.name } })
    .from(pdcaRecords)
    .innerJoin(lessons, eq(pdcaRecords.lessonId, lessons.id))
    .innerJoin(users, eq(pdcaRecords.studentId, users.id))
    .where(eq(pdcaRecords.id, recordId))
    .get()
  if (!row) return null
  const [items, extras, feedback] = await Promise.all([
    db.select().from(planItems).where(eq(planItems.recordId, recordId)).orderBy(asc(planItems.position)),
    db.select().from(extraDos).where(eq(extraDos.recordId, recordId)),
    db.select().from(feedbacks).where(eq(feedbacks.recordId, recordId)).get(),
  ])
  return { ...row.record, lesson: row.lesson, student: row.student, planItems: items, extraDos: extras, feedback: feedback ?? null }
}

export type RecordDetail = NonNullable<Awaited<ReturnType<typeof loadRecordDetail>>>

/** 教員は全レコード、生徒は自分のレコードのみ */
export const getRecord = createServerFn({ method: 'GET' })
  .validator(z.object({ recordId: z.string() }))
  .handler(async ({ data }) => {
    const me = await requireUser()
    const detail = await loadRecordDetail(getDb(), data.recordId)
    if (!detail) return null
    if (me.role === 'student' && detail.studentId !== me.id) throw new AuthError(403, '権限がありません')
    return detail
  })

export const listRecordsByLesson = createServerFn({ method: 'GET' })
  .validator(z.object({ lessonId: z.string() }))
  .handler(async ({ data }) => {
    await requireUser('teacher')
    const db = getDb()
    return db
      .select({
        id: pdcaRecords.id,
        status: pdcaRecords.status,
        achievementRate: pdcaRecords.achievementRate,
        studentName: users.name,
        hasFeedback: feedbacks.recordId,
      })
      .from(pdcaRecords)
      .innerJoin(users, eq(pdcaRecords.studentId, users.id))
      .leftJoin(feedbacks, eq(feedbacks.recordId, pdcaRecords.id))
      .where(eq(pdcaRecords.lessonId, data.lessonId))
      .orderBy(asc(users.name))
  })

export const upsertFeedback = createServerFn({ method: 'POST' })
  .validator(z.object({ recordId: z.string(), advice: z.string().trim().min(1, 'アドバイスを入力してください') }))
  .handler(async ({ data }) => {
    await requireUser('teacher')
    const db = getDb()
    const record = await db.select().from(pdcaRecords).where(eq(pdcaRecords.id, data.recordId)).get()
    if (!record) return { ok: false as const, message: '記録が見つかりません' }
    if (record.status === 'planning') return { ok: false as const, message: 'Plan 確定前のためフィードバックできません' }
    const t = now()
    await db
      .insert(feedbacks)
      .values({ recordId: data.recordId, advice: data.advice, createdAt: t, updatedAt: t })
      .onConflictDoUpdate({ target: feedbacks.recordId, set: { advice: data.advice, updatedAt: t } })
    await db.update(pdcaRecords).set({ status: 'closed', updatedAt: t }).where(eq(pdcaRecords.id, data.recordId))
    return { ok: true as const }
  })

/** 指定授業回の直前の回にある自分の Check/Act とフィードバック */
export const getPreviousReflection = createServerFn({ method: 'GET' })
  .validator(z.object({ lessonId: z.string() }))
  .handler(async ({ data }) => {
    const me = await requireUser('student')
    const db = getDb()
    const target = await db.select().from(lessons).where(eq(lessons.id, data.lessonId)).get()
    if (!target) return null
    const prev = await db.select().from(lessons).where(lt(lessons.number, target.number)).orderBy(desc(lessons.number)).get()
    if (!prev) return null
    const row = await db
      .select({ checkAct: pdcaRecords.checkAct, advice: feedbacks.advice })
      .from(pdcaRecords)
      .leftJoin(feedbacks, eq(feedbacks.recordId, pdcaRecords.id))
      .where(and(eq(pdcaRecords.studentId, me.id), eq(pdcaRecords.lessonId, prev.id)))
      .get()
    return { lesson: prev, checkAct: row?.checkAct ?? null, advice: row?.advice ?? null }
  })

async function replacePlanItems(db: Db, recordId: string, texts: string[]) {
  await db.delete(planItems).where(eq(planItems.recordId, recordId))
  if (texts.length > 0) {
    await db.insert(planItems).values(texts.map((planText, position) => ({ id: newId(), recordId, position, planText })))
  }
}

async function upsertPlanningRecord(db: Db, studentId: string, lessonId: string) {
  const existing = await db
    .select()
    .from(pdcaRecords)
    .where(and(eq(pdcaRecords.studentId, studentId), eq(pdcaRecords.lessonId, lessonId)))
    .get()
  if (existing) return existing
  const t = now()
  const record = { id: newId(), studentId, lessonId, status: 'planning' as const, createdAt: t, updatedAt: t }
  await db.insert(pdcaRecords).values(record)
  return { ...record, checkAct: null, achievementRate: null, planConfirmedAt: null }
}

export const savePlanDraft = createServerFn({ method: 'POST' })
  .validator(z.object({ lessonId: z.string(), items: planItemsInput }))
  .handler(async ({ data }) => {
    const me = await requireUser('student')
    const db = getDb()
    const record = await upsertPlanningRecord(db, me.id, data.lessonId)
    if (record.status !== 'planning') return { ok: false as const, message: 'Plan は確定済みのため編集できません' }
    await replacePlanItems(db, record.id, data.items)
    await db.update(pdcaRecords).set({ updatedAt: now() }).where(eq(pdcaRecords.id, record.id))
    return { ok: true as const, recordId: record.id }
  })

export const confirmPlan = createServerFn({ method: 'POST' })
  .validator(z.object({ lessonId: z.string(), items: planItemsInput }))
  .handler(async ({ data }) => {
    const me = await requireUser('student')
    const items = data.items.filter((t) => t.length > 0)
    if (items.length === 0) return { ok: false as const, message: 'Plan 項目を 1 件以上入力してください' }
    const db = getDb()
    const record = await upsertPlanningRecord(db, me.id, data.lessonId)
    if (record.status !== 'planning') return { ok: false as const, message: 'Plan は確定済みのため編集できません' }
    await replacePlanItems(db, record.id, items)
    const t = now()
    await db.update(pdcaRecords).set({ status: 'doing', planConfirmedAt: t, updatedAt: t }).where(eq(pdcaRecords.id, record.id))
    return { ok: true as const, recordId: record.id }
  })

export const saveDo = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      recordId: z.string(),
      items: z.array(z.object({ id: z.string(), doText: z.string().trim(), doStatus: z.enum(DO_STATUSES).nullable() })),
      extraDos: z.array(z.string().trim()).max(20),
      checkAct: z.string().trim(),
    }),
  )
  .handler(async ({ data }) => {
    const me = await requireUser('student')
    const db = getDb()
    const record = await db.select().from(pdcaRecords).where(eq(pdcaRecords.id, data.recordId)).get()
    if (!record || record.studentId !== me.id) throw new AuthError(403, '権限がありません')
    if (record.status === 'closed') return { ok: false as const, message: 'フィードバック済みのため編集できません' }
    if (record.status === 'planning') return { ok: false as const, message: 'Plan を確定してから入力してください' }

    const items = await db.select().from(planItems).where(eq(planItems.recordId, record.id))
    const byId = new Map(data.items.map((i) => [i.id, i]))
    for (const item of items) {
      const input = byId.get(item.id)
      if (!input) continue
      await db
        .update(planItems)
        .set({ doText: input.doText || null, doStatus: input.doStatus })
        .where(eq(planItems.id, item.id))
    }
    await db.delete(extraDos).where(eq(extraDos.recordId, record.id))
    const extras = data.extraDos.filter((t) => t.length > 0)
    if (extras.length > 0) {
      await db.insert(extraDos).values(extras.map((doText) => ({ id: newId(), recordId: record.id, doText })))
    }

    const merged = items.map((item) => ({ doStatus: byId.get(item.id)?.doStatus ?? item.doStatus }))
    const complete = merged.every((i) => i.doStatus !== null) && data.checkAct.length > 0
    await db
      .update(pdcaRecords)
      .set({
        checkAct: data.checkAct || null,
        achievementRate: calcAchievementRate(merged),
        status: complete ? 'reflected' : 'doing',
        updatedAt: now(),
      })
      .where(eq(pdcaRecords.id, record.id))
    return { ok: true as const, status: complete ? ('reflected' as const) : ('doing' as const) }
  })

export const listMyRecords = createServerFn({ method: 'GET' }).handler(async () => {
  const me = await requireUser('student')
  const db = getDb()
  return db
    .select({
      id: pdcaRecords.id,
      status: pdcaRecords.status,
      achievementRate: pdcaRecords.achievementRate,
      lessonNumber: lessons.number,
      lessonDate: lessons.date,
      hasFeedback: feedbacks.recordId,
    })
    .from(pdcaRecords)
    .innerJoin(lessons, eq(pdcaRecords.lessonId, lessons.id))
    .leftJoin(feedbacks, eq(feedbacks.recordId, pdcaRecords.id))
    .where(eq(pdcaRecords.studentId, me.id))
    .orderBy(desc(lessons.number))
})
