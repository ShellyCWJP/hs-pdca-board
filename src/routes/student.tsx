import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '#/components/app-shell'

const NAV = [
  { to: '/student', label: 'ダッシュボード' },
  { to: '/student/records/new', label: '新規追加' },
  { to: '/student/records', label: '過去の PDCA' },
  { to: '/student/settings', label: '設定' },
]

export const Route = createFileRoute('/student')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' })
    if (context.user.role !== 'student') throw redirect({ to: '/teacher' })
    return { user: context.user }
  },
  component: StudentLayout,
})

function StudentLayout() {
  const { user } = Route.useRouteContext()
  return (
    <AppShell user={user} nav={NAV}>
      <Outlet />
    </AppShell>
  )
}
