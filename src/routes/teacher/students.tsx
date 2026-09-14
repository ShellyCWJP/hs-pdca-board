import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { createStudent, deleteStudent, listStudents, resetStudentPassword, updateStudent } from '#/server/fns/students'
import { PageTitle } from '#/components/app-shell'
import { ConfirmButton, ErrorText } from '#/components/pdca'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'

export const Route = createFileRoute('/teacher/students')({
  loader: () => listStudents(),
  component: Page,
})

type Student = Awaited<ReturnType<typeof listStudents>>[number]

function Page() {
  const students = Route.useLoaderData()
  const router = useRouter()
  const [editing, setEditing] = useState<Student | null>(null)
  const [resetting, setResetting] = useState<Student | null>(null)
  const doDelete = useServerFn(deleteStudent)

  return (
    <>
      <PageTitle>生徒管理</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>生徒一覧（{students.length} 名）</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ生徒が登録されていません。</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>氏名</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>登録日</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.email}</TableCell>
                        <TableCell>{new Date(s.createdAt * 1000).toLocaleDateString('ja-JP')}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setResetting(null) }}>
                            編集
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setResetting(s); setEditing(null) }}>
                            パスワード再設定
                          </Button>
                          <ConfirmButton
                            variant="ghost"
                            size="sm"
                            title={`${s.name} を削除しますか？`}
                            description="この生徒の PDCA 記録もすべて削除されます。元に戻せません。"
                            confirmLabel="削除する"
                            onConfirm={async () => {
                              await doDelete({ data: { id: s.id } })
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
              </div>
            )}
          </CardContent>
        </Card>
        <div className="grid gap-6 self-start">
          {editing ? (
            <EditForm student={editing} onDone={() => setEditing(null)} />
          ) : resetting ? (
            <ResetForm student={resetting} onDone={() => setResetting(null)} />
          ) : (
            <CreateForm />
          )}
        </div>
      </div>
    </>
  )
}

function CreateForm() {
  const router = useRouter()
  const doCreate = useServerFn(createStudent)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const result = await doCreate({
      data: { name: String(f.get('name')), email: String(f.get('email')), password: String(f.get('password')) },
    })
    if (!result.ok) return setError(result.message)
    setError(null)
    form.reset()
    router.invalidate()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>生徒を追加</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="氏名" name="name" />
          <Field label="Email" name="email" type="email" />
          <Field label="初期パスワード（8 文字以上）" name="password" minLength={8} />
          <ErrorText message={error} />
          <Button type="submit" className="w-full">追加</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function EditForm({ student, onDone }: { student: Student; onDone: () => void }) {
  const router = useRouter()
  const doUpdate = useServerFn(updateStudent)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const result = await doUpdate({ data: { id: student.id, name: String(f.get('name')), email: String(f.get('email')) } })
    if (!result.ok) return setError(result.message)
    router.invalidate()
    onDone()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>生徒を編集</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" key={student.id}>
          <Field label="氏名" name="name" defaultValue={student.name} />
          <Field label="Email" name="email" type="email" defaultValue={student.email} />
          <ErrorText message={error} />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">保存</Button>
            <Button type="button" variant="outline" onClick={onDone}>キャンセル</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function ResetForm({ student, onDone }: { student: Student; onDone: () => void }) {
  const doReset = useServerFn(resetStudentPassword)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    await doReset({ data: { id: student.id, password: String(f.get('password')) } })
    onDone()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>パスワード再設定：{student.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" key={student.id}>
          <Field label="新しいパスワード（8 文字以上）" name="password" minLength={8} />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">再設定</Button>
            <Button type="button" variant="outline" onClick={onDone}>キャンセル</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({ label, name, ...props }: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required {...props} />
    </div>
  )
}
