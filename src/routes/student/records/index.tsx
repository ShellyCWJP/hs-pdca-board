import { Link, createFileRoute } from '@tanstack/react-router'
import { listMyRecords } from '#/server/fns/records'
import { PageTitle } from '#/components/app-shell'
import { Rate, StatusBadge, YesNo } from '#/components/pdca'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'

export const Route = createFileRoute('/student/records/')({
  loader: () => listMyRecords(),
  component: Page,
})

function Page() {
  const records = Route.useLoaderData()
  return (
    <>
      <PageTitle>過去の PDCA</PageTitle>
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだ記録がありません。</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>授業回</TableHead>
              <TableHead>日付</TableHead>
              <TableHead>状態</TableHead>
              <TableHead className="text-right">達成率</TableHead>
              <TableHead className="text-center">フィードバック</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.status === 'planning' ? (
                    <Link to="/student/records/new" className="underline">第 {r.lessonNumber} 回</Link>
                  ) : (
                    <Link to="/student/records/$recordId" params={{ recordId: r.id }} className="underline">
                      第 {r.lessonNumber} 回
                    </Link>
                  )}
                </TableCell>
                <TableCell>{r.lessonDate}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="text-right"><Rate value={r.achievementRate} /></TableCell>
                <TableCell className="text-center"><YesNo value={!!r.hasFeedback} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}
