import { useState } from 'react'
import { Link, createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { getRecord, upsertFeedback } from '#/server/fns/records'
import { PageTitle } from '#/components/app-shell'
import { ErrorText } from '#/components/pdca'
import { RecordBody, RecordSummary } from '#/components/record-view'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Textarea } from '#/components/ui/textarea'

export const Route = createFileRoute('/teacher/records/$recordId')({
  loader: async ({ params }) => {
    const record = await getRecord({ data: { recordId: params.recordId } })
    if (!record) throw notFound()
    return record
  },
  notFoundComponent: () => <p className="text-muted-foreground">記録が見つかりません。</p>,
  component: Page,
})

function Page() {
  const record = Route.useLoaderData()
  const router = useRouter()
  const doUpsert = useServerFn(upsertFeedback)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const canFeedback = record.status !== 'planning'

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const advice = String(new FormData(e.currentTarget).get('advice'))
    const result = await doUpsert({ data: { recordId: record.id, advice } })
    if (!result.ok) return setError(result.message)
    setError(null)
    setSaved(true)
    router.invalidate()
  }

  return (
    <>
      <div className="mb-2">
        <Link to="/teacher/records" search={{ lesson: record.lessonId }} className="text-sm text-muted-foreground underline">
          ← 記録一覧
        </Link>
      </div>
      <PageTitle>記録詳細</PageTitle>
      <div className="mb-6">
        <RecordSummary record={record} showStudent />
      </div>
      <RecordBody record={record} />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>教員フィードバック</CardTitle>
        </CardHeader>
        <CardContent>
          {canFeedback ? (
            <form onSubmit={onSubmit} className="space-y-3">
              <Textarea name="advice" rows={5} required defaultValue={record.feedback?.advice ?? ''} placeholder="アドバイスを入力" />
              <ErrorText message={error} />
              <div className="flex items-center gap-3">
                <Button type="submit">{record.feedback ? '修正して保存' : '投稿'}</Button>
                {saved && <span className="text-sm text-muted-foreground">保存しました</span>}
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Plan 確定前のためフィードバックできません</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
