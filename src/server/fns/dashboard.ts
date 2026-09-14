import { createServerFn } from '@tanstack/react-start'
import { and, asc, avg, eq, isNotNull } from 'drizzle-orm'
import { getDb } from '../db'
import { feedbacks, lessons, pdcaRecords, users } from '../schema'
import { requireUser } from '../auth'
import { findCurrentLesson } from '../lesson-utils'

export const getTeacherDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  await requireUser('teacher')
  const db = getDb()
  const current = await findCurrentLesson(db)

  const submissions = current
    ? await db
        .select({
          studentId: users.id,
          studentName: users.name,
          recordId: pdcaRecords.id,
          status: pdcaRecords.status,
          checkAct: pdcaRecords.checkAct,
          achievementRate: pdcaRecords.achievementRate,
          hasFeedback: feedbacks.recordId,
        })
        .from(users)
        .leftJoin(pdcaRecords, and(eq(pdcaRecords.studentId, users.id), eq(pdcaRecords.lessonId, current.id)))
        .leftJoin(feedbacks, eq(feedbacks.recordId, pdcaRecords.id))
        .where(eq(users.role, 'student'))
        .orderBy(asc(users.name))
    : []

  const trend = await db
    .select({ lessonNumber: lessons.number, date: lessons.date, average: avg(pdcaRecords.achievementRate) })
    .from(lessons)
    .leftJoin(pdcaRecords, and(eq(pdcaRecords.lessonId, lessons.id), isNotNull(pdcaRecords.achievementRate)))
    .groupBy(lessons.id)
    .orderBy(asc(lessons.number))

  return {
    currentLesson: current ?? null,
    submissions: submissions.map((s) => ({
      ...s,
      hasPlan: s.status !== null && s.status !== 'planning',
      hasDo: s.achievementRate !== null,
      hasCheckAct: !!s.checkAct,
      hasFeedback: !!s.hasFeedback,
    })),
    trend: trend.map((t) => ({ ...t, average: t.average === null ? null : Math.round(Number(t.average)) })),
  }
})

export const getStudentDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  const me = await requireUser('student')
  const db = getDb()
  const current = await findCurrentLesson(db)

  const currentRecord = current
    ? await db
        .select({ id: pdcaRecords.id, status: pdcaRecords.status })
        .from(pdcaRecords)
        .where(and(eq(pdcaRecords.studentId, me.id), eq(pdcaRecords.lessonId, current.id)))
        .get()
    : null

  const trend = await db
    .select({ lessonNumber: lessons.number, date: lessons.date, rate: pdcaRecords.achievementRate })
    .from(pdcaRecords)
    .innerJoin(lessons, eq(pdcaRecords.lessonId, lessons.id))
    .where(eq(pdcaRecords.studentId, me.id))
    .orderBy(asc(lessons.number))

  const latestFeedback = await db
    .select({ advice: feedbacks.advice, lessonNumber: lessons.number, lessonDate: lessons.date, recordId: pdcaRecords.id })
    .from(feedbacks)
    .innerJoin(pdcaRecords, eq(feedbacks.recordId, pdcaRecords.id))
    .innerJoin(lessons, eq(pdcaRecords.lessonId, lessons.id))
    .where(eq(pdcaRecords.studentId, me.id))
    .orderBy(asc(lessons.number))
    .then((rows) => rows.at(-1) ?? null)

  return { currentLesson: current ?? null, currentRecord: currentRecord ?? null, trend, latestFeedback }
})
