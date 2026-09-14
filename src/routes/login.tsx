import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { login } from '#/server/fns/auth'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.user) throw redirect({ to: context.user.role === 'teacher' ? '/teacher' : '/student' })
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const doLogin = useServerFn(login)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setPending(true)
    setError(null)
    const result = await doLogin({
      data: { email: String(form.get('email')), password: String(form.get('password')) },
    })
    setPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    await router.invalidate()
    router.navigate({ to: result.role === 'teacher' ? '/teacher' : '/student' })
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>PDCA Board にログイン</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              ログイン
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
