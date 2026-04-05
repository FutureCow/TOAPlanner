'use client'
import { useState, useEffect } from 'react'

export default function RegistrationToggle() {
  const [open, setOpen] = useState(true)
  const [logo, setLogo] = useState('')
  const [logoInput, setLogoInput] = useState('')
  const [logoSaving, setLogoSaving] = useState(false)
  const [logoSaved, setLogoSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      setOpen(d.registrationOpen)
      setLogo(d.schoolLogo ?? '')
      setLogoInput(d.schoolLogo ?? '')
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

  async function saveLogo() {
    setLogoSaving(true)
    setLogoSaved(false)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolLogo: logoInput.trim() }),
    })
    setLogo(logoInput.trim())
    setLogoSaving(false)
    setLogoSaved(true)
    setTimeout(() => setLogoSaved(false), 2000)
  }

  return (
    <div className="space-y-3 mb-4">
      {/* Registration toggle */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg p-4">
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

      {/* School logo URL */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
        <p className="font-semibold text-slate-200 text-sm mb-1">Schoollogo</p>
        <p className="text-xs text-slate-500 mb-3">
          URL van het schoollogo (PNG/SVG). Wordt subtiel weergegeven in de navigatiebalk.
        </p>
        <div className="flex gap-2 items-start">
          <input
            value={logoInput}
            onChange={e => setLogoInput(e.target.value)}
            placeholder="https://…/logo.png"
            className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
          {logoInput && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoInput} alt="preview" className="h-8 w-auto rounded object-contain bg-slate-800 p-1" onError={e => (e.currentTarget.style.display = 'none')} />
          )}
          <button
            onClick={saveLogo}
            disabled={logoSaving || logoInput === logo}
            className={`px-3 py-2 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              logoSaved ? 'bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white'
            }`}
          >
            {logoSaving ? 'Opslaan…' : logoSaved ? '✓ Opgeslagen' : 'Opslaan'}
          </button>
        </div>
        {logo && (
          <p className="text-xs text-slate-500 mt-2">
            Huidig logo: <span className="text-slate-400 font-mono truncate">{logo}</span>
          </p>
        )}
      </div>
    </div>
  )
}
