// dev サーバーに対する E2E スモークテスト。`pnpm dev` を起動した状態で `pnpm test:e2e`（BASE で接続先を変更可）
import * as seroval from 'seroval'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const fnId = (file, name) =>
  Buffer.from(JSON.stringify({ file: `/src/server/fns/${file}.ts?tss-serverfn-split`, export: `${name}_createServerFn_handler` })).toString('base64url')

function jar() {
  const cookies = {}
  return {
    header: () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
    absorb: (res) => {
      for (const sc of res.headers.getSetCookie?.() ?? []) {
        const [kv] = sc.split(';')
        const [k, v] = kv.split('=')
        cookies[k] = v
      }
    },
  }
}

async function call(session, file, name, method, data) {
  const url = new URL(`/_serverFn/${fnId(file, name)}`, BASE)
  const headers = { 'x-tsr-serverFn': 'true', accept: 'application/json', Origin: BASE, Cookie: session.header() }
  let body
  if (method === 'GET') {
    if (data !== undefined) url.searchParams.set('payload', JSON.stringify(await seroval.toJSONAsync({ data })))
  } else {
    headers['content-type'] = 'application/json'
    body = JSON.stringify(await seroval.toJSONAsync(data === undefined ? {} : { data }))
  }
  const res = await fetch(url, { method, headers, body })
  session.absorb(res)
  const text = await res.text()
  if (!res.ok) throw new Error(`${name} -> ${res.status} ${text.slice(0, 300)}`)
  const json = JSON.parse(text)
  const parsed = decode(json)
  if (parsed.error) throw new Error(`${name} error: ${JSON.stringify(parsed.error)}`)
  return parsed.result
}

// seroval の JSON ツリーを必要な範囲だけ復元する（object / null-proto object / array / string / number / constants / reference）
function decode(node, refs = new Map()) {
  const CONST = [null, undefined, true, false, -0, Infinity, -Infinity, NaN]
  switch (node.t) {
    case 0: return node.s
    case 1: return node.s
    case 2: return CONST[node.s]
    case 4: return refs.get(node.i)
    case 9: { const arr = []; refs.set(node.i, arr); for (const v of node.a) arr.push(v === 0 || v == null ? undefined : decode(v, refs)); return arr }
    case 10: case 11: {
      const obj = {}; refs.set(node.i, obj)
      node.p.k.forEach((k, idx) => { obj[k] = decode(node.p.v[idx], refs) })
      return obj
    }
    default: throw new Error(`unsupported seroval node t=${node.t}: ${JSON.stringify(node).slice(0, 200)}`)
  }
}

async function page(session, path) {
  const res = await fetch(new URL(path, BASE), { headers: { Cookie: session.header() }, redirect: 'manual' })
  const html = await res.text()
  const body = html.slice(html.indexOf('<body')).replace(/<script[\s\S]*?<\/script>/g, '')
  return { status: res.status, location: res.headers.get('location'), body, ssrError: html.includes('server rendering errored') }
}
async function checkPage(session, path, expectText) {
  const r = await page(session, path)
  const ok = r.status === 200 && !r.ssrError && (!expectText || r.body.includes(expectText))
  check(`SSR ${path}`, ok, ok ? '' : `status=${r.status} ssrError=${r.ssrError} hasText=${expectText ? r.body.includes(expectText) : '-'}`)
}

let failures = 0
function check(label, cond, extra = '') {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${extra ? ' ' + extra : ''}`)
  if (!cond) failures++
}

const stamp = Date.now()
const teacher = jar()
const r0 = await call(teacher, 'auth', 'login', 'POST', { email: 'teacher@example.com', password: 'password' })
check('teacher login', r0.ok && r0.role === 'teacher')

// 生徒作成
const email = `student${stamp}@example.com`
check('createStudent', (await call(teacher, 'students', 'createStudent', 'POST', { name: 'テスト太郎', email, password: 'password1' })).ok)
const dup = await call(teacher, 'students', 'createStudent', 'POST', { name: 'x', email, password: 'password1' })
check('duplicate email rejected', dup.ok === false)
const students = await call(teacher, 'students', 'listStudents', 'GET')
const student = students.find((s) => s.email === email)
check('listStudents contains new', !!student)

// 授業回作成（今日と昨日）
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date())
const yesterday = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date(Date.now() - 86400e3))
const before = await call(teacher, 'lessons', 'listLessons', 'GET')
const maxN = before.reduce((m, l) => Math.max(m, l.number), 0)
check('createLesson 1', (await call(teacher, 'lessons', 'createLesson', 'POST', { number: maxN + 1, date: yesterday })).ok)
check('createLesson 2', (await call(teacher, 'lessons', 'createLesson', 'POST', { number: maxN + 2, date: today })).ok)
check('duplicate number rejected', (await call(teacher, 'lessons', 'createLesson', 'POST', { number: maxN + 1, date: today })).ok === false)
const lessons = await call(teacher, 'lessons', 'listLessons', 'GET')
const l1 = lessons.find((l) => l.number === maxN + 1)
const l2 = lessons.find((l) => l.number === maxN + 2)

// 生徒ログイン
const stu = jar()
const sl = await call(stu, 'auth', 'login', 'POST', { email, password: 'password1' })
check('student login', sl.ok && sl.role === 'student')
const forbidden = await call(stu, 'students', 'listStudents', 'GET').then(() => false, (e) => /error|403|権限/.test(String(e)))
check('student cannot listStudents', forbidden)

// 第1回: 下書き → 確定 → Do → Check/Act
check('savePlanDraft', (await call(stu, 'records', 'savePlanDraft', 'POST', { lessonId: l1.id, items: ['下書きA', ''] })).ok)
check('confirmPlan empty rejected', (await call(stu, 'records', 'confirmPlan', 'POST', { lessonId: l1.id, items: ['', ' '] })).ok === false)
const c1 = await call(stu, 'records', 'confirmPlan', 'POST', { lessonId: l1.id, items: ['機能Aを作る', '機能Bを作る', 'テストを書く'] })
check('confirmPlan', c1.ok)
check('confirmPlan again rejected', (await call(stu, 'records', 'confirmPlan', 'POST', { lessonId: l1.id, items: ['x'] })).ok === false)
let rec = await call(stu, 'records', 'getRecord', 'GET', { recordId: c1.recordId })
check('record doing with 3 items', rec.status === 'doing' && rec.planItems.length === 3)

// 部分保存（Check/Act なし）→ doing のまま
const items = rec.planItems
const partial = await call(stu, 'records', 'saveDo', 'POST', {
  recordId: rec.id,
  items: [
    { id: items[0].id, doText: 'できた', doStatus: 'done' },
    { id: items[1].id, doText: '半分', doStatus: 'partial' },
    { id: items[2].id, doText: '', doStatus: null },
  ],
  extraDos: ['予定外の調査'],
  checkAct: '',
})
check('saveDo partial -> doing', partial.ok && partial.status === 'doing')
rec = await call(stu, 'records', 'getRecord', 'GET', { recordId: rec.id })
check('rate 50% (1 + 0.5 + 0)/3', rec.achievementRate === 50, `got ${rec.achievementRate}`)
check('extraDos saved', rec.extraDos.length === 1)

const full = await call(stu, 'records', 'saveDo', 'POST', {
  recordId: rec.id,
  items: [
    { id: items[0].id, doText: 'できた', doStatus: 'done' },
    { id: items[1].id, doText: '半分', doStatus: 'partial' },
    { id: items[2].id, doText: 'やらなかった', doStatus: 'not_done' },
  ],
  extraDos: [],
  checkAct: '次回はテストから書く',
})
check('saveDo full -> reflected', full.ok && full.status === 'reflected')

// 教員: 一覧・フィードバック
const list = await call(teacher, 'records', 'listRecordsByLesson', 'GET', { lessonId: l1.id })
check('listRecordsByLesson', list.some((r) => r.id === rec.id && r.status === 'reflected'))
check('upsertFeedback', (await call(teacher, 'records', 'upsertFeedback', 'POST', { recordId: rec.id, advice: '良い計画です' })).ok)
rec = await call(stu, 'records', 'getRecord', 'GET', { recordId: rec.id })
check('record closed with feedback', rec.status === 'closed' && rec.feedback?.advice === '良い計画です')
check('saveDo after closed rejected', (await call(stu, 'records', 'saveDo', 'POST', { recordId: rec.id, items: [], extraDos: [], checkAct: 'x' })).ok === false)
check('upsertFeedback update', (await call(teacher, 'records', 'upsertFeedback', 'POST', { recordId: rec.id, advice: '修正版' })).ok)

// 第2回: 前回の振り返り
const prev = await call(stu, 'records', 'getPreviousReflection', 'GET', { lessonId: l2.id })
check('previous reflection', prev?.checkAct === '次回はテストから書く' && prev?.advice === '修正版')

// ダッシュボード
const sd = await call(stu, 'dashboard', 'getStudentDashboard', 'GET')
check('student dashboard current lesson = today', sd.currentLesson?.id === l2.id)
check('student dashboard trend has rate 50', sd.trend.some((t) => t.lessonNumber === maxN + 1 && t.rate === 50))
check('student dashboard latest feedback', sd.latestFeedback?.advice === '修正版')
const td = await call(teacher, 'dashboard', 'getTeacherDashboard', 'GET')
const row = td.submissions.find((s) => s.studentId === student.id)
check('teacher dashboard: new student unsubmitted for today', row && !row.hasPlan && !row.hasFeedback)
check('teacher dashboard trend avg', td.trend.some((t) => t.lessonNumber === maxN + 1 && t.average === 50))
const mine = await call(stu, 'records', 'listMyRecords', 'GET')
check('listMyRecords', mine.length === 1 && mine[0].hasFeedback)

// 画面の SSR
await checkPage(teacher, '/teacher', 'テスト太郎')
await checkPage(teacher, `/teacher/records?lesson=${l1.id}`, 'テスト太郎')
await checkPage(teacher, `/teacher/records/${rec.id}`, '機能Aを作る')
await checkPage(stu, '/student', '修正版')
await checkPage(stu, '/student/records', yesterday)
await checkPage(stu, `/student/records/${rec.id}`, '修正版')
await checkPage(stu, `/student/records/new?lesson=${l2.id}`, '次回はテストから書く')
await checkPage(stu, '/student/settings', 'パスワード変更')
const redir = await page(stu, `/student/records/new?lesson=${l1.id}`)
check('new with confirmed lesson redirects to detail', redir.status === 307 && redir.location?.includes(`/student/records/${rec.id}`), `${redir.status} ${redir.location}`)
const tRedir = await page(teacher, '/student')
check('teacher blocked from /student', tRedir.status === 307 && tRedir.location?.endsWith('/teacher'))

// パスワード変更
check('changePassword wrong current', (await call(stu, 'auth', 'changePassword', 'POST', { current: 'bad', next: 'password2' })).ok === false)
check('changePassword', (await call(stu, 'auth', 'changePassword', 'POST', { current: 'password1', next: 'password2' })).ok)

// 後片付け: 授業回削除は記録ありで拒否 → 生徒削除 → 授業回削除
check('deleteLesson with records rejected', (await call(teacher, 'lessons', 'deleteLesson', 'POST', { id: l1.id })).ok === false)
check('deleteStudent', (await call(teacher, 'students', 'deleteStudent', 'POST', { id: student.id })).ok)
check('deleteLesson 1', (await call(teacher, 'lessons', 'deleteLesson', 'POST', { id: l1.id })).ok)
check('deleteLesson 2', (await call(teacher, 'lessons', 'deleteLesson', 'POST', { id: l2.id })).ok)

console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
