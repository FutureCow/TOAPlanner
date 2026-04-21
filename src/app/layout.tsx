import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'
import NavBar from '@/components/NavBar'
import ThemeProvider from '@/components/ThemeProvider'
import PwaRegister from '@/components/PwaRegister'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TOA Planner',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TOA Planner',
  },
}

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className={`${inter.className} bg-slate-950 text-slate-200 min-h-screen`}>
        <ThemeProvider />
        <PwaRegister />
        <SessionProvider>
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 py-4">{children}</main>
        </SessionProvider>
      </body>
    </html>
  )
}
