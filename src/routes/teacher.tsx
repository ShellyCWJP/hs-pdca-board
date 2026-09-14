import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '#/components/app-shell'

const NAV = [
  { to: '/teacher', label: 'ダッシュボード' },
  { to: '/teacher/students', label: '生徒管理' },
  { to: '/teacher/lessons', label: '授業回管理' },
  { to: '/teacher/records', label: '記録一覧' },
]

export const Route = createFileRoute('/teacher')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' })
    if (context.user.role !== 'teacher') throw redirect({ to: '/student' })
    return { user: context.user }
  },
  component: TeacherLayout,
})

function TeacherLayout() {
  const { user } = Route.useRouteContext()
  return (
    <AppShell user={user} nav={NAV}>
      <Outlet />
    </AppShell>
  )
}
