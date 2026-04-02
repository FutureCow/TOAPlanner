import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'
import NavBar from '@/components/NavBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TOA Planner — De Amersfoortse Berg',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen`}>
        <SessionProvider>
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 py-4">{children}</main>
        </SessionProvider>
      </body>
    </html>
  )
}
