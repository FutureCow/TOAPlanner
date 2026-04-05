'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { SubjectConfig } from '@/types'

type FontSize = 'klein' | 'middel' | 'groot'

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

function applyFont(size: FontSize) {
  document.documentElement.classList.remove('font-klein', 'font-middel', 'font-groot')
  document.documentElement.classList.add(`font-${size}`)
  localStorage.setItem('fontsize', size)
}

export default function NavBar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [subjects, setSubjects] = useState<SubjectConfig[]>([])
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [fontSize, setFontSize] = useState<FontSize>('middel')

  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') ?? 'dark') as 'dark' | 'light'
    const savedFont = (localStorage.getItem('fontsize') ?? 'middel') as FontSize
    setTheme(savedTheme)
    setFontSize(savedFont)
  }, [])

  useEffect(() => {
    if (!session) return
    fetch('/api/subjects')
      .then(r => r.ok ? r.json() : [])
      .then(setSubjects)
      .catch(() => {})
  }, [session])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  function changeFont(size: FontSize) {
    setFontSize(size)
    applyFont(size)
  }

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

      <div className="flex items-center gap-2">
        {/* Font size */}
        <div className="flex items-center gap-0.5 bg-slate-800 rounded px-1 py-0.5">
          {(['klein', 'middel', 'groot'] as FontSize[]).map((s, i) => (
            <button
              key={s}
              onClick={() => changeFont(s)}
              title={s.charAt(0).toUpperCase() + s.slice(1)}
              className={`rounded px-1.5 py-0.5 transition-colors text-slate-400 hover:text-white ${
                fontSize === s ? 'bg-slate-600 text-white' : ''
              }`}
              style={{ fontSize: ['0.65rem', '0.75rem', '0.85rem'][i] }}
            >
              A
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Licht thema' : 'Donker thema'}
          className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-white transition-colors text-sm"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        {/* User / logout */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors whitespace-nowrap"
        >
          {session.user.abbreviation.toUpperCase()} · Uitloggen
        </button>
      </div>
    </nav>
  )
}
