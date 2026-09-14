import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { getCurrentUser } from '#/server/fns/auth'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  beforeLoad: async () => ({ user: await getCurrentUser() }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'PDCA Board' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
