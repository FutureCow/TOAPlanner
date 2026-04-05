'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { SubjectConfig } from '@/types'

export default function NavBar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [subjects, setSubjects] = useState<SubjectConfig[]>([])

  useEffect(() => {
    if (!session) return
    fetch('/api/subjects')
      .then(r => r.ok ? r.json() : [])
      .then(setSubjects)
      .catch(() => {})
  }, [session])

  if (!session) return null

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-1 flex-wrap">
        {subjects.map((s) => {
          const isActive = pathname === `/${s.id}`
          return (
            <Link
              key={s.id}
              href={`/${s.id}`}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isActive ? 'text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              style={isActive ? { backgroundColor: s.accentColor } : undefined}
            >
              {s.name}
            </Link>
          )
        })}
        <Link
          href="/overzicht"
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            pathname === '/overzicht'
              ? 'bg-slate-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          Overzicht
        </Link>
        {session.user.isAdmin && (
          <Link
            href="/admin"
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              pathname === '/admin'
                ? 'bg-slate-600 text-white'
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
