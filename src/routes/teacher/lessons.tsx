import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { createLesson, deleteLesson, listLessons, updateLesson } from '#/server/fns/lessons'
import { PageTitle } from '#/components/app-shell'
import { ConfirmButton, ErrorText } from '#/components/pdca'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'

export const Route = createFileRoute('/teacher/lessons')({
  loader: () => listLessons(),
  component: Page,
})

type Lesson = Awaited<ReturnType<typeof listLessons>>[number]

function Page() {
  const lessons = Route.useLoaderData()
  const router = useRouter()
  const [editing, setEditing] = useState<Lesson | null>(null)
  const doDelete = useServerFn(deleteLesson)
  const nextNumber = lessons.reduce((m, l) => Math.max(m, l.number), 0) + 1

  return (
    <>
      <PageTitle>授業回管理</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>授業回一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ授業回がありません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>回</TableHead>
                    <TableHead>日付</TableHead>
                    <TableHead className="text-right">記録数</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessons.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>第 {l.number} 回</TableCell>
                      <TableCell>{l.date}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.recordCount}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(l)}>
                          編集
                        </Button>
                        <ConfirmButton
                          variant="ghost"
                          size="sm"
                          disabled={l.recordCount > 0}
                          title={`第 ${l.number} 回を削除しますか？`}
                          confirmLabel="削除する"
                          onConfirm={async () => {
                            await doDelete({ data: { id: l.id } })
                            router.invalidate()
                          }}
                        >
                          削除
                        </ConfirmButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <div className="self-start">
          <LessonForm key={editing?.id ?? 'new'} lesson={editing} nextNumber={nextNumber} onDone={() => setEditing(null)} />
        </div>
      </div>
    </>
  )
}

function LessonForm({ lesson, nextNumber, onDone }: { lesson: Lesson | null; nextNumber: number; onDone: () => void }) {
  const router = useRouter()
  const doCreate = useServerFn(createLesson)
  const doUpdate = useServerFn(updateLesson)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const input = { number: Number(f.get('number')), date: String(f.get('date')) }
    const result = lesson ? await doUpdate({ data: { id: lesson.id, ...input } }) : await doCreate({ data: input })
    if (!result.ok) return setError(result.message)
    setError(null)
    form.reset()
    router.invalidate()
    onDone()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{lesson ? `第 ${lesson.number} 回を編集` : '授業回を追加'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="number">回番号</Label>
            <Input id="number" name="number" type="number" min={1} required defaultValue={lesson?.number ?? nextNumber} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">日付</Label>
            <Input id="date" name="date" type="date" required defaultValue={lesson?.date ?? ''} />
          </div>
          <ErrorText message={error} />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">{lesson ? '保存' : '追加'}</Button>
            {lesson && (
              <Button type="button" variant="outline" onClick={onDone}>
                キャンセル
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
