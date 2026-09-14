import { Link, createFileRoute } from '@tanstack/react-router'
import { getStudentDashboard } from '#/server/fns/dashboard'
import { PageTitle } from '#/components/app-shell'
import { RateChart, StatusBadge, lessonLabel } from '#/components/pdca'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

export const Route = createFileRoute('/student/')({
  loader: () => getStudentDashboard(),
  component: Page,
})

function Page() {
  const { currentLesson, currentRecord, trend, latestFeedback } = Route.useLoaderData()
  const status = currentRecord?.status ?? null

  const action = !currentLesson
    ? null
    : !currentRecord
      ? { label: 'Plan を登録する', to: '/student/records/new' as const, params: undefined }
      : status === 'planning'
        ? { label: 'Plan を続ける', to: '/student/records/new' as const, params: undefined }
        : {
            label: status === 'doing' ? 'Do を記録する' : status === 'reflected' ? '内容を確認・修正する' : '内容を確認する',
            to: '/student/records/$recordId' as const,
            params: { recordId: currentRecord.id },
          }

  return (
    <>
      <PageTitle>ダッシュボード</PageTitle>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>今回の授業{currentLesson ? `：${lessonLabel(currentLesson)}` : ''}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!currentLesson ? (
              <p className="text-sm text-muted-foreground">授業回がまだ登録されていません。</p>
            ) : (
              <>
                <StatusBadge status={status} />
                {action && (
                  <div>
                    {action.to === '/student/records/new' ? (
                      <Button asChild>
                        <Link to={action.to} search={{ lesson: currentLesson.id }}>{action.label}</Link>
                      </Button>
                    ) : (
                      <Button asChild>
                        <Link to={action.to} params={action.params}>{action.label}</Link>
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>最新のフィードバック</CardTitle>
          </CardHeader>
          <CardContent>
            {latestFeedback ? (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  第{latestFeedback.lessonNumber}回（{latestFeedback.lessonDate}）
                </p>
                <p className="whitespace-pre-wrap">{latestFeedback.advice}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">まだフィードバックはありません。</p>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>達成率の推移</CardTitle>
          </CardHeader>
          <CardContent>
            <RateChart data={trend} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
