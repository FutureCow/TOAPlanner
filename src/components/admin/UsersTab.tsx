'use client'
import { useState, useEffect } from 'react'
import { UserRow, SubjectConfig } from '@/types'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const AVATAR_COLORS = [
  '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#db2777', '#0891b2', '#65a30d',
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [subjects, setSubjects] = useState<SubjectConfig[]>([])

  useEffect(() => {
    load()
    fetch('/api/admin/subjects').then(r => r.ok ? r.json() : []).then(setSubjects).catch(() => {})
  }, [])

  async function load() {
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
  }

  async function updateUser(id: string, data: Partial<UserRow & { defaultPage: string | null }>) {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    load()
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Gebruiker "${name}" verwijderen? Hun aanvragen blijven bestaan.`)) return
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-slate-700 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-900 border-b-2 border-slate-600 text-slate-500 uppercase tracking-wide text-[0.65rem]">
              <th className="px-3 py-2 text-left w-8"></th>
              <th className="px-3 py-2 text-left min-w-[10rem]">Naam / E-mail</th>
              <th className="px-3 py-2 text-left w-16">Afkorting</th>
              <th className="px-3 py-2 text-left min-w-[9rem]">Rollen</th>
              <th className="px-3 py-2 text-left min-w-[8rem]">Standaard pagina</th>
              <th className="px-3 py-2 text-left w-24">Toegang</th>
              <th className="px-3 py-2 text-left w-20">Lid sinds</th>
              <th className="px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-slate-800 hover:bg-slate-900/50 last:border-b-0">
                {/* Avatar */}
                <td className="px-3 py-2.5">
                  {u.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={u.image} width={32} height={32} className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-700" alt="" referrerPolicy="no-referrer" />
                    : <div className="w-8 h-8 rounded-full flex items-center justify-center text-[0.65rem] font-bold text-white ring-2 ring-slate-700 shrink-0"
                        style={{ backgroundColor: avatarColor(u.name) }}>
                        {initials(u.name)}
                      </div>
                  }
                </td>
                {/* Name + email */}
                <td className="px-3 py-2.5">
                  <p className="text-slate-200 font-medium">{u.name}</p>
                  <p className="text-slate-500 text-[0.65rem]">{u.email}</p>
                </td>
                {/* Abbreviation */}
                <td className="px-3 py-2.5">
                  <span className="text-slate-300 font-semibold text-[0.7rem] bg-slate-700 px-1.5 py-0.5 rounded">
                    {u.abbreviation.toUpperCase()}
                  </span>
                </td>
                {/* Roles */}
                <td className="px-3 py-2.5">
                  <div className="flex gap-2 flex-wrap">
                    {(['isTeacher', 'isTOA', 'isAdmin'] as const).map(field => (
                      <label key={field} className="flex items-center gap-1 cursor-pointer text-slate-400 whitespace-nowrap">
                        <input type="checkbox" checked={u[field]}
                          onChange={e => updateUser(u.id, { [field]: e.target.checked })} />
                        {field === 'isTeacher' ? 'Docent' : field === 'isTOA' ? 'TOA' : 'Admin'}
                      </label>
                    ))}
                  </div>
                </td>
                {/* Default page */}
                <td className="px-3 py-2.5">
                  <select
                    value={u.defaultPage ?? ''}
                    onChange={e => updateUser(u.id, { defaultPage: e.target.value || null })}
                    className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1 text-[0.7rem] w-full"
                  >
                    <option value="">— standaard —</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </td>
                {/* Access */}
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => updateUser(u.id, { allowed: !u.allowed })}
                    className={`px-2 py-1 rounded text-[0.65rem] font-semibold border transition-colors whitespace-nowrap ${
                      u.allowed
                        ? 'bg-green-950 border-green-700 text-green-400 hover:bg-green-900'
                        : 'bg-red-950 border-red-800 text-red-400 hover:bg-red-900'
                    }`}
                  >
                    {u.allowed ? '✓ Toegestaan' : '✗ Geblokkeerd'}
                  </button>
                </td>
                {/* Joined */}
                <td className="px-3 py-2.5 text-slate-500 text-[0.65rem] whitespace-nowrap">
                  {format(new Date(u.createdAt), 'd MMM yyyy', { locale: nl })}
                </td>
                {/* Delete */}
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => deleteUser(u.id, u.name)}
                    className="text-slate-600 hover:text-red-400 transition-colors text-base"
                    title="Verwijder gebruiker"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
