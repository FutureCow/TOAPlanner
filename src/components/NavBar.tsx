'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

const SUBJECTS = [
  { label: 'Natuurkunde', href: '/natuurkunde' },
  { label: 'Scheikunde',  href: '/scheikunde' },
  { label: 'Biologie',   href: '/biologie' },
  { label: 'Project/NLT', href: '/project' },
  { label: 'Overzicht',  href: '/overzicht' },
]

export default function NavBar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  if (!session) return null

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-1 flex-wrap">
        {SUBJECTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              pathname.startsWith(s.href)
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {s.label}
          </Link>
        ))}
        {session.user.isAdmin && (
          <Link
            href="/admin"
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              pathname === '/admin'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Admin
          </Link>
        )}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors whitespace-nowrap"
      >
        {session.user.abbreviation.toUpperCase()} · Uitloggen
      </button>
    </nav>
  )
}
