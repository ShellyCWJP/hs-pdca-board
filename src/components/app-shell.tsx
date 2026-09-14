import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { logout } from '#/server/fns/auth'
import type { SessionUser } from '#/server/auth'
import { Button } from '#/components/ui/button'

type NavItem = { to: string; label: string }

export function AppShell({
  user,
  nav,
  children,
}: {
  user: SessionUser
  nav: NavItem[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const doLogout = useServerFn(logout)

  async function onLogout() {
    await doLogout()
    await router.invalidate()
    router.navigate({ to: '/login' })
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b bg-card md:sticky md:top-0 md:h-screen md:w-56 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:block md:py-4">
          <span className="font-semibold">PDCA Board</span>
          <span className="text-sm text-muted-foreground md:mt-1 md:block">{user.name}</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:px-2 md:pb-0">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: 'bg-muted font-medium text-foreground' }}
              activeOptions={{ exact: item.to === '/teacher' || item.to === '/student' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden px-4 py-4 md:block">
          <Button variant="outline" size="sm" className="w-full" onClick={onLogout}>
            ログアウト
          </Button>
        </div>
      </aside>
      <div className="flex-1">
        <div className="flex justify-end px-4 pt-3 md:hidden">
          <Button variant="outline" size="sm" onClick={onLogout}>
            ログアウト
          </Button>
        </div>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </div>
    </div>
  )
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-6 text-2xl font-bold">{children}</h1>
}
