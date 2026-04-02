'use client'
import { useState, useEffect } from 'react'

export default function RegistrationToggle() {
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      setOpen(d.registrationOpen)
      setLoading(false)
    })
  }, [])

  async function toggle() {
    const next = !open
    setOpen(next)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationOpen: next }),
    })
  }

  return (
    <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4">
      <div>
        <p className="font-semibold text-slate-200 text-sm">Nieuwe aanmeldingen</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Wanneer uitgeschakeld kunnen nieuwe gebruikers niet voor het eerst inloggen
        </p>
      </div>
      {!loading && (
        <button onClick={toggle}
          className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <span className={open ? 'text-green-400' : 'text-red-400'}>
            {open ? 'Aanmeldingen open' : 'Aanmeldingen gesloten'}
          </span>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${open ? 'bg-green-600' : 'bg-slate-600'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${open ? 'left-5' : 'left-0.5'}`} />
          </div>
        </button>
      )}
    </div>
  )
}
