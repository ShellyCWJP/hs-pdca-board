import { asc, desc, lte } from 'drizzle-orm'
import type { Db } from './db'
import { lessons } from './schema'

/** 日本時間での今日の日付（YYYY-MM-DD） */
export function todayJst() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date())
}

/** 直近授業回：日付が今日以前で最新のもの。なければ最も早い未来の回。 */
export async function findCurrentLesson(db: Db) {
  const past = await db.select().from(lessons).where(lte(lessons.date, todayJst())).orderBy(desc(lessons.date), desc(lessons.number)).get()
  if (past) return past
  return db.select().from(lessons).orderBy(asc(lessons.date), asc(lessons.number)).get()
}

