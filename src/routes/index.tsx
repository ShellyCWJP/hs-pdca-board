import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' })
    throw redirect({ to: context.user.role === 'teacher' ? '/teacher' : '/student' })
  },
})
