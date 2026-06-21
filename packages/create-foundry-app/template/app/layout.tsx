import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '{{PROJECT_NAME}}',
  description: 'Built with create-foundry-app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#fff' }}>{children}</body>
    </html>
  )
}
