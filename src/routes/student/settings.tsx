import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { changePassword } from '#/server/fns/auth'
import { PageTitle } from '#/components/app-shell'
import { ErrorText } from '#/components/pdca'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export const Route = createFileRoute('/student/settings')({ component: Page })

function Page() {
  const doChange = useServerFn(changePassword)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const next = String(f.get('next'))
    if (next !== String(f.get('confirm'))) return setError('新しいパスワードが一致しません')
    const result = await doChange({ data: { current: String(f.get('current')), next } })
    if (!result.ok) return setError(result.message)
    setError(null)
    setDone(true)
    form.reset()
  }

  return (
    <>
      <PageTitle>パスワード変更</PageTitle>
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>新しいパスワードを設定</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">現在のパスワード</Label>
              <Input id="current" name="current" type="password" autoComplete="current-password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next">新しいパスワード（8 文字以上）</Label>
              <Input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">新しいパスワード（確認）</Label>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <ErrorText message={error} />
            {done && <p className="text-sm text-muted-foreground">パスワードを変更しました</p>}
            <Button type="submit" className="w-full">変更</Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
