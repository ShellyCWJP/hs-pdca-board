import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { listLessons } from '#/server/fns/lessons'
import { listRecordsByLesson } from '#/server/fns/records'
import { PageTitle } from '#/components/app-shell'
import { Rate, StatusBadge, YesNo, lessonLabel } from '#/components/pdca'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'

export const Route = createFileRoute('/teacher/records/')({
  validateSearch: z.object({ lesson: z.string().optional() }),
  loaderDeps: ({ search }) => ({ lesson: search.lesson }),
  loader: async ({ deps }) => {
    const lessons = await listLessons()
    const selected = lessons.find((l) => l.id === deps.lesson) ?? lessons[0] ?? null
    const records = selected ? await listRecordsByLesson({ data: { lessonId: selected.id } }) : []
    return { lessons, selected, records }
  },
  component: Page,
})

function Page() {
  const { lessons, selected, records } = Route.useLoaderData()
  const navigate = useNavigate()

  return (
    <>
      <PageTitle>記録一覧</PageTitle>
      {lessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">授業回がまだありません。</p>
      ) : (
        <>
          <div className="mb-4 max-w-xs">
            <Select value={selected?.id} onValueChange={(v) => navigate({ to: '/teacher/records', search: { lesson: v } })}>
              <SelectTrigger>
                <SelectValue placeholder="授業回を選択" />
              </SelectTrigger>
              <SelectContent>
                {lessons.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {lessonLabel(l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">この授業回の記録はまだありません。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>生徒</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="text-right">達成率</TableHead>
                  <TableHead className="text-center">フィードバック</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link to="/teacher/records/$recordId" params={{ recordId: r.id }} className="underline">
                        {r.studentName}
                      </Link>
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right"><Rate value={r.achievementRate} /></TableCell>
                    <TableCell className="text-center"><YesNo value={!!r.hasFeedback} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </>
  )
}
