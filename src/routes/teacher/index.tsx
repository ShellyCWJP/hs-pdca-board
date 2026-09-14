import { Link, createFileRoute } from '@tanstack/react-router'
import { getTeacherDashboard } from '#/server/fns/dashboard'
import { PageTitle } from '#/components/app-shell'
import { RateChart, YesNo, lessonLabel } from '#/components/pdca'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'

export const Route = createFileRoute('/teacher/')({
  loader: () => getTeacherDashboard(),
  component: Page,
})

function Page() {
  const { currentLesson, submissions, trend } = Route.useLoaderData()
  return (
    <>
      <PageTitle>ダッシュボード</PageTitle>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              提出状況{currentLesson ? `：${lessonLabel(currentLesson)}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!currentLesson ? (
              <p className="text-sm text-muted-foreground">
                授業回がまだありません。<Link to="/teacher/lessons" className="underline">授業回管理</Link>から追加してください。
              </p>
            ) : submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                生徒がまだいません。<Link to="/teacher/students" className="underline">生徒管理</Link>から追加してください。
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>生徒</TableHead>
                      <TableHead className="text-center">Plan</TableHead>
                      <TableHead className="text-center">Do</TableHead>
                      <TableHead className="text-center">Check/Act</TableHead>
                      <TableHead className="text-center">フィードバック</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((s) => (
                      <TableRow key={s.studentId}>
                        <TableCell>
                          {s.recordId ? (
                            <Link to="/teacher/records/$recordId" params={{ recordId: s.recordId }} className="underline">
                              {s.studentName}
                            </Link>
                          ) : (
                            s.studentName
                          )}
                        </TableCell>
                        <TableCell className="text-center"><YesNo value={s.hasPlan} /></TableCell>
                        <TableCell className="text-center"><YesNo value={s.hasDo} /></TableCell>
                        <TableCell className="text-center"><YesNo value={s.hasCheckAct} /></TableCell>
                        <TableCell className="text-center"><YesNo value={s.hasFeedback} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>クラス平均達成率の推移</CardTitle>
          </CardHeader>
          <CardContent>
            <RateChart data={trend.map((t) => ({ lessonNumber: t.lessonNumber, rate: t.average }))} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
