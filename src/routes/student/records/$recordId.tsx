import { useState } from 'react'
import { Link, createFileRoute, notFound, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { getRecord, saveDo } from '#/server/fns/records'
import { DO_STATUSES, type DoStatus } from '#/server/schema'
import { DO_STATUS_LABEL } from '#/lib/achievement'
import { PageTitle } from '#/components/app-shell'
import { ErrorText } from '#/components/pdca'
import { FeedbackCard, RecordBody, RecordSummary } from '#/components/record-view'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import { Textarea } from '#/components/ui/textarea'

export const Route = createFileRoute('/student/records/$recordId')({
  loader: async ({ params }) => {
    const record = await getRecord({ data: { recordId: params.recordId } })
    if (!record) throw notFound()
    if (record.status === 'planning') throw redirect({ to: '/student/records/new', search: { lesson: record.lessonId } })
    return record
  },
  notFoundComponent: () => <p className="text-muted-foreground">記録が見つかりません。</p>,
  component: Page,
})

type ItemInput = { id: string; doText: string; doStatus: DoStatus | null }

function Page() {
  const record = Route.useLoaderData()
  const router = useRouter()
  const doSave = useServerFn(saveDo)
  const [items, setItems] = useState<ItemInput[]>(
    record.planItems.map((p) => ({ id: p.id, doText: p.doText ?? '', doStatus: p.doStatus })),
  )
  const [extras, setExtras] = useState<string[]>(record.extraDos.length > 0 ? record.extraDos.map((d) => d.doText) : [''])
  const [checkAct, setCheckAct] = useState(record.checkAct ?? '')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const updateItem = (id: string, patch: Partial<ItemInput>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = await doSave({ data: { recordId: record.id, items, extraDos: extras, checkAct } })
    if (!result.ok) return setError(result.message)
    setError(null)
    setMessage(result.status === 'reflected' ? '保存しました。' : '保存しました。全項目の達成状態と Check/Act を入力すると入力済みになります。')
    router.invalidate()
  }

  const back = (
    <div className="mb-2">
      <Link to="/student/records" className="text-sm text-muted-foreground underline">← 過去の PDCA</Link>
    </div>
  )

  if (record.status === 'closed') {
    return (
      <>
        {back}
        <PageTitle>PDCA 詳細</PageTitle>
        <div className="mb-6"><RecordSummary record={record} /></div>
        <RecordBody record={record} />
        {record.feedback && <div className="mt-6"><FeedbackCard advice={record.feedback.advice} /></div>}
      </>
    )
  }

  return (
    <>
      {back}
      <PageTitle>Do と Check / Act の記録</PageTitle>
      <div className="mb-6"><RecordSummary record={record} /></div>
      <form onSubmit={onSubmit} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan ごとの Do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {record.planItems.map((p, idx) => {
              const input = items.find((i) => i.id === p.id)!
              return (
                <div key={p.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Plan {idx + 1}</p>
                    <p className="whitespace-pre-wrap text-sm">{p.planText}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor={`do-${p.id}`}>Do（実施内容・結果）</Label>
                      <Textarea id={`do-${p.id}`} rows={3} value={input.doText} onChange={(e) => updateItem(p.id, { doText: e.target.value })} />
                    </div>
                    <RadioGroup
                      value={input.doStatus ?? ''}
                      onValueChange={(v) => updateItem(p.id, { doStatus: v as DoStatus })}
                      className="flex flex-wrap gap-4"
                    >
                      {DO_STATUSES.map((s) => (
                        <div key={s} className="flex items-center gap-2">
                          <RadioGroupItem value={s} id={`${p.id}-${s}`} />
                          <Label htmlFor={`${p.id}-${s}`} className="font-normal">{DO_STATUS_LABEL[s]}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan に無かった実施内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {extras.map((text, i) => (
              <div key={i} className="flex gap-2">
                <Textarea rows={2} value={text} onChange={(e) => setExtras((prev) => prev.map((x, k) => (k === i ? e.target.value : x)))} placeholder="予定になかったが実施したこと" />
                <Button type="button" variant="ghost" size="sm" onClick={() => setExtras((prev) => (prev.length > 1 ? prev.filter((_, k) => k !== i) : ['']))}>
                  削除
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setExtras((p) => [...p, ''])} disabled={extras.length >= 20}>
              追加
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Check / Act（振り返り・次回の課題）</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea rows={5} value={checkAct} onChange={(e) => setCheckAct(e.target.value)} placeholder="うまくいったこと、いかなかったこと、次回に取り組むこと" />
          </CardContent>
        </Card>

        <ErrorText message={error} />
        <div className="flex items-center gap-3">
          <Button type="submit">保存</Button>
          {message && <span className="text-sm text-muted-foreground">{message}</span>}
        </div>
      </form>
    </>
  )
}
