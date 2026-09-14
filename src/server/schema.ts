import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const USER_ROLES = ['teacher', 'student'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const RECORD_STATUSES = ['planning', 'doing', 'reflected', 'closed'] as const
export type RecordStatus = (typeof RECORD_STATUSES)[number]

export const DO_STATUSES = ['done', 'partial', 'not_done'] as const
export type DoStatus = (typeof DO_STATUSES)[number]

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  role: text('role', { enum: USER_ROLES }).notNull(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull(),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
})

export const lessons = sqliteTable('lessons', {
  id: text('id').primaryKey(),
  number: integer('number').notNull().unique(),
  date: text('date').notNull(),
  createdAt: integer('created_at').notNull(),
})

export const pdcaRecords = sqliteTable(
  'pdca_records',
  {
    id: text('id').primaryKey(),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lessonId: text('lesson_id')
      .notNull()
      .references(() => lessons.id),
    status: text('status', { enum: RECORD_STATUSES }).notNull(),
    checkAct: text('check_act'),
    achievementRate: integer('achievement_rate'),
    planConfirmedAt: integer('plan_confirmed_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [uniqueIndex('pdca_records_student_lesson').on(t.studentId, t.lessonId)],
)

export const planItems = sqliteTable('plan_items', {
  id: text('id').primaryKey(),
  recordId: text('record_id')
    .notNull()
    .references(() => pdcaRecords.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  planText: text('plan_text').notNull(),
  doText: text('do_text'),
  doStatus: text('do_status', { enum: DO_STATUSES }),
})

export const extraDos = sqliteTable('extra_dos', {
  id: text('id').primaryKey(),
  recordId: text('record_id')
    .notNull()
    .references(() => pdcaRecords.id, { onDelete: 'cascade' }),
  doText: text('do_text').notNull(),
})

export const feedbacks = sqliteTable('feedbacks', {
  recordId: text('record_id')
    .primaryKey()
    .references(() => pdcaRecords.id, { onDelete: 'cascade' }),
  advice: text('advice').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export type User = typeof users.$inferSelect
export type Lesson = typeof lessons.$inferSelect
export type PdcaRecord = typeof pdcaRecords.$inferSelect
export type PlanItem = typeof planItems.$inferSelect
export type ExtraDo = typeof extraDos.$inferSelect
export type Feedback = typeof feedbacks.$inferSelect
