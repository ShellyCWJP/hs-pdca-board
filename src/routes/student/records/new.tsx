import { useState } from 'react'
import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { listLessons } from '#/server/fns/lessons'
import { confirmPlan, getPreviousReflection, savePlanDraft } from '#/server/fns/records'
import { listMyRecords, getRecord } from '#/server/fns/records'
import { PageTitle } from '#/components/app-shell'
import { ConfirmButton, ErrorText, lessonLabel } from '#/components/pdca'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { Textarea } from '#/components/ui/textarea'

export const Route = createFileRoute('/student/records/new')({
  validateSearch: z.object({ lesson: z.string().optional() }),
  loaderDeps: ({ search }) => ({ lesson: search.lesson }),
  loader: async ({ deps }) => {
    const [lessons, myRecords] = await Promise.all([listLessons(), listMyRecords()])
    const byLesson = new Map(myRecords.map((r) => [r.lessonNumber, r]))
    // 選択可能：レコードが無い、または planning のままの授業回
    const selectable = lessons.filter((l) => {
      const r = byLesson.get(l.number)
      return !r || r.status === 'planning'
    })
    const selected = selectable.find((l) => l.id === deps.lesson) ?? selectable[0] ?? null
    // 確定済みの授業回を指定された場合は詳細画面へ
    const requested = lessons.find((l) => l.id === deps.lesson)
    const requestedRecord = requested ? byLesson.get(requested.number) : undefined
    if (requestedRecord && requestedRecord.status !== 'planning') {
      throw redirect({ to: '/student/records/$recordId', params: { recordId: requestedRecord.id } })
    }
    if (!selected) return { selectable, selected: null, previous: null, draftItems: [] as string[] }
    const draft = byLesson.get(selected.number)
    const [previous, draftRecord] = await Promise.all([
      getPreviousReflection({ data: { lessonId: selected.id } }),
      draft ? getRecord({ data: { recordId: draft.id } }) : null,
    ])
    return { selectable, selected, previous, draftItems: draftRecord?.planItems.map((p) => p.planText) ?? [] }
  },
  component: Page,
})

function Page() {
  const { selectable, selected, previous, draftItems } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const doDraft = useServerFn(savePlanDraft)
  const doConfirm = useServerFn(confirmPlan)
  const [items, setItems] = useState<string[]>(draftItems.length > 0 ? draftItems : [''])
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  if (!selected) {
    return (
      <>
        <PageTitle>PDCA 新規追加</PageTitle>
        <p className="text-sm text-muted-foreground">Plan を登録できる授業回がありません。すべての授業回に登録済みか、授業回が未作成です。</p>
      </>
    )
  }

  const update = (i: number, v: string) => setItems((prev) => prev.map((x, k) => (k === i ? v : x)))
  const remove = (i: number) => setItems((prev) => (prev.length > 1 ? prev.filter((_, k) => k !== i) : prev))

  async function onDraft() {
    const result = await doDraft({ data: { lessonId: selected!.id, items } })
    if (!result.ok) return setError(result.message)
    setError(null)
    setSavedAt(new Date().toLocaleTimeString('ja-JP'))
  }

  async function onConfirm() {
    const result = await doConfirm({ data: { lessonId: selected!.id, items } })
    if (!result.ok) return setError(result.message)
    await router.invalidate()
    navigate({ to: '/student/records/$recordId', params: { recordId: result.recordId } })
  }

  return (
    <>
      <PageTitle>PDCA 新規追加</PageTitle>
      <div className="grid gap-6">
        <div className="max-w-xs space-y-2">
          <Label>授業回</Label>
          <Select
            value={selected.id}
            onValueChange={(v) => navigate({ to: '/student/records/new', search: { lesson: v } })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectable.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {lessonLabel(l)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>前回の振り返り{previous ? `：${lessonLabel(previous.lesson)}` : ''}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!previous || (!previous.checkAct && !previous.advice) ? (
              <p className="text-muted-foreground">前回の記録はありません</p>
            ) : (
              <>
                <div>
                  <p className="mb-1 font-medium">Check / Act</p>
                  <p className="whitespace-pre-wrap">{previous.checkAct ?? <span className="text-muted-foreground">未入力</span>}</p>
                </div>
                <div>
                  <p className="mb-1 font-medium">教員フィードバック</p>
                  <p className="whitespace-pre-wrap">{previous.advice ?? <span className="text-muted-foreground">なし</span>}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan（本日の目標・予定）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((text, i) => (
              <div key={i} className="flex gap-2">
                <span className="pt-2 text-sm text-muted-foreground tabular-nums">{i + 1}.</span>
                <Textarea value={text} onChange={(e) => update(i, e.target.value)} rows={2} placeholder="例：ログイン画面のバリデーションを実装する" />
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} disabled={items.length === 1}>
                  削除
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((p) => [...p, ''])} disabled={items.length >= 20}>
              項目を追加
            </Button>
            <ErrorText message={error} />
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onDraft}>
                下書き保存
              </Button>
              <ConfirmButton
                title="Plan を確定しますか？"
                description="確定後は Plan を編集できません。授業が終わったら、この Plan に対して Do を記録します。"
                confirmLabel="確定して授業を始める"
                onConfirm={onConfirm}
              >
                Plan を確定して授業を始める
              </ConfirmButton>
              {savedAt && <span className="text-sm text-muted-foreground">{savedAt} に下書き保存</span>}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
