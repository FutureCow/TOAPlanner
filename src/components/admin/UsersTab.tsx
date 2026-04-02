'use client'
import { useState, useEffect } from 'react'
import { UserRow } from '@/types'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import RegistrationToggle from './RegistrationToggle'

export default function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([])

  async function load() {
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
  }

  useEffect(() => { load() }, [])

  async function updateUser(id: string, data: Partial<UserRow>) {
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
      <RegistrationToggle />
      <div className="border border-slate-700 rounded-lg overflow-hidden text-xs">
        <div className="grid bg-slate-900 border-b-2 border-slate-600 px-3 py-2 gap-2 font-semibold text-slate-500 uppercase tracking-wide text-[0.65rem]"
          style={{ gridTemplateColumns: '2rem 2.5fr 1rem 3fr 1.5fr 1.2fr 1.5rem' }}>
          <span></span>
          <span>Naam / E-mail</span>
          <span></span>
          <span>Rollen</span>
          <span>Toegang</span>
          <span>Lid sinds</span>
          <span></span>
        </div>
        {users.map(u => (
          <div key={u.id}
            className="grid px-3 py-2.5 gap-2 border-b border-slate-800 items-center hover:bg-slate-900/50 last:border-b-0"
            style={{ gridTemplateColumns: '2rem 2.5fr 1rem 3fr 1.5fr 1.2fr 1.5rem' }}>
            {u.image
              ? <img src={u.image} className="w-7 h-7 rounded-full object-cover" alt="" />
              : <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                  {u.abbreviation.slice(0, 1).toUpperCase()}
                </div>
            }
            <div>
              <p className="text-slate-200 font-medium">{u.name}</p>
              <p className="text-slate-500 text-[0.65rem]">{u.email}</p>
            </div>
            <span className="text-slate-400 font-semibold text-[0.7rem]">{u.abbreviation.toUpperCase()}</span>
            <div className="flex gap-2 flex-wrap">
              {(['isTeacher', 'isTOA', 'isAdmin'] as const).map(field => (
                <label key={field} className="flex items-center gap-1 cursor-pointer text-slate-400">
                  <input type="checkbox" checked={u[field]}
                    onChange={e => updateUser(u.id, { [field]: e.target.checked })} />
                  {field === 'isTeacher' ? 'Docent' : field === 'isTOA' ? 'TOA' : 'Admin'}
                </label>
              ))}
            </div>
            <button
              onClick={() => updateUser(u.id, { allowed: !u.allowed })}
              className={`px-2 py-1 rounded text-[0.65rem] font-semibold border transition-colors ${
                u.allowed
                  ? 'bg-green-950 border-green-700 text-green-400 hover:bg-green-900'
                  : 'bg-red-950 border-red-800 text-red-400 hover:bg-red-900'
              }`}
            >
              {u.allowed ? '✓ Toegestaan' : '✗ Geblokkeerd'}
            </button>
            <span className="text-slate-500 text-[0.65rem]">
              {format(new Date(u.createdAt), 'd MMM yyyy', { locale: nl })}
            </span>
            <button
              onClick={() => deleteUser(u.id, u.name)}
              className="text-slate-600 hover:text-red-400 transition-colors text-base"
              title="Verwijder gebruiker"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
