import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MAL+ PORTAL',
  description: 'Make A Line Plus Seminar Portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        {/* これが最終兵器：インターネットから直接デザインエンジンを強制ロードします */}
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  )
}