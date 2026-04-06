'use client'
import { useState, useEffect, useCallback } from 'react'
import { SubjectConfig } from '@/types'

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr']
const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag']

const PRESET_COLORS = [
  '#2563eb', '#16a34a', '#eab308', '#ea580c',
  '#dc2626', '#9333ea', '#db2777',
]

const COLOR_NAMES: Record<string, string> = {
  '#2563eb': 'Blauw',
  '#16a34a': 'Groen',
  '#eab308': 'Geel',
  '#ea580c': 'Oranje',
  '#dc2626': 'Rood',
  '#9333ea': 'Paars',
  '#db2777': 'Roze',
}

// ── Subject card ────────────────────────────────────────────────────────────

interface SubjectCardProps {
  subject: SubjectConfig
  onSaved: () => void
  onDeleted: () => void
}

function SubjectCard({ subject, onSaved, onDeleted }: SubjectCardProps) {
  const [name, setName] = useState(subject.name)
  const [color, setColor] = useState(subject.accentColor)
  const [absence, setAbsence] = useState<number[]>(subject.absenceDays)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function toggleDay(day: number) {
    setAbsence(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  async function handleSave() {
    if (!name.trim()) { setError('Naam is verplicht'); return }
    setSaving(true); setError(''); setSuccess(false)
    const res = await fetch(`/api/admin/subjects/${subject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), accentColor: color, absenceDays: absence }),
    })
    setSaving(false)
    if (res.ok) { setSuccess(true); setTimeout(() => setSuccess(false), 2000); onSaved() }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Er is iets misgegaan.') }
  }

  async function handleDelete() {
    if (!confirm(`Agenda "${subject.name}" verwijderen? Alle aanvragen blijven bewaard maar worden niet meer weergegeven.`)) return
    const res = await fetch(`/api/admin/subjects/${subject.id}`, { method: 'DELETE' })
    if (res.ok) onDeleted()
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 space-y-2">
      <div className="h-1 rounded-full -mt-0.5" style={{ backgroundColor: color }} />
      <div>
        <label className="block text-xs text-slate-400 mb-1">Naam</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Accentkleur</label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-1 ring-slate-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
              style={{ backgroundColor: c }} title={COLOR_NAMES[c] ?? c} />
          ))}
          <div className="flex items-center gap-1.5 ml-1">
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" title="Aangepaste kleur" />
            <span className="text-xs text-slate-400">{COLOR_NAMES[color] ?? color}</span>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">TOA afwezig op</label>
        <div className="flex gap-2">
          {DAYS.map((day, i) => (
            <button key={i} onClick={() => toggleDay(i)} title={`TOA afwezig op ${DAY_NAMES[i]}`}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                absence.includes(i)
                  ? 'bg-amber-900/60 border-amber-700 text-amber-300'
                  : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
              }`}>
              {day}
            </button>
          ))}
        </div>
        {absence.length > 0 && (
          <p className="text-xs text-amber-400/70 mt-1">
            TOA niet aanwezig op: {absence.sort().map(d => DAY_NAMES[d]).join(', ')}
          </p>
        )}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex items-center justify-between pt-1">
        <button onClick={handleDelete} className="text-xs text-red-500/60 hover:text-red-400 transition-colors">
          Verwijderen
        </button>
        <button onClick={handleSave} disabled={saving}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            success ? 'bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white'
          }`}>
          {saving ? 'Opslaan…' : success ? '✓' : 'Opslaan'}
        </button>
      </div>
    </div>
  )
}

// ── Main SettingsTab ─────────────────────────────────────────────────────────

const DEFAULT_STATUS = {
  PENDING:              { label: 'Aangevraagd',         color: '#64748b' },
  APPROVED_WITH_TOA:    { label: 'Goedgekeurd met TOA', color: '#16a34a' },
  APPROVED_WITHOUT_TOA: { label: 'Zonder TOA',          color: '#d97706' },
  REJECTED:             { label: 'Afgekeurd',           color: '#dc2626' },
}

const STATUS_ROWS = [
  { key: 'PENDING'              as const, title: 'Aanvraag' },
  { key: 'APPROVED_WITH_TOA'    as const, title: 'Goedgekeurd met TOA' },
  { key: 'APPROVED_WITHOUT_TOA' as const, title: 'Zonder TOA' },
  { key: 'REJECTED'             as const, title: 'Afgekeurd' },
]

export default function SettingsTab() {
  // App settings
  const [registrationOpen, setRegistrationOpen] = useState(true)
  const [logo, setLogo] = useState('')
  const [logoInput, setLogoInput] = useState('')
  const [periodsPerDay, setPeriodsPerDay] = useState(10)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [logoSaving, setLogoSaving] = useState(false)
  const [logoSaved, setLogoSaved] = useState(false)
  const [periodsSaving, setPeriodsSaving] = useState(false)
  const [periodsSaved, setPeriodsSaved] = useState(false)

  // Status labels + colors — type is inferred from DEFAULT_STATUS, no generic needed
  const [statusCfg, setStatusCfg] = useState(DEFAULT_STATUS)
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusSaved, setStatusSaved] = useState(false)

  // Subjects
  const [subjects, setSubjects] = useState([] as SubjectConfig[])
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#2563eb')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      setRegistrationOpen(d.registrationOpen)
      setLogo(d.schoolLogo ?? '')
      setLogoInput(d.schoolLogo ?? '')
      setPeriodsPerDay(d.periodsPerDay ?? 10)
      setSettingsLoading(false)
      const sl = d.statusLabels || {}
      const sc = d.statusColors || {}
      setStatusCfg({
        PENDING:              { label: sl.PENDING              || DEFAULT_STATUS.PENDING.label,              color: sc.PENDING              || DEFAULT_STATUS.PENDING.color },
        APPROVED_WITH_TOA:    { label: sl.APPROVED_WITH_TOA    || DEFAULT_STATUS.APPROVED_WITH_TOA.label,    color: sc.APPROVED_WITH_TOA    || DEFAULT_STATUS.APPROVED_WITH_TOA.color },
        APPROVED_WITHOUT_TOA: { label: sl.APPROVED_WITHOUT_TOA || DEFAULT_STATUS.APPROVED_WITHOUT_TOA.label, color: sc.APPROVED_WITHOUT_TOA || DEFAULT_STATUS.APPROVED_WITHOUT_TOA.color },
        REJECTED:             { label: sl.REJECTED             || DEFAULT_STATUS.REJECTED.label,             color: sc.REJECTED             || DEFAULT_STATUS.REJECTED.color },
      })
    })
  }, [])

  const loadSubjects = useCallback(async () => {
    const res = await fetch('/api/admin/subjects')
    if (res.ok) setSubjects(await res.json())
  }, [])

  useEffect(() => { loadSubjects() }, [loadSubjects])

  async function toggleRegistration() {
    const next = !registrationOpen
    setRegistrationOpen(next)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationOpen: next }),
    })
  }

  async function saveLogo() {
    setLogoSaving(true); setLogoSaved(false)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolLogo: logoInput.trim() }),
    })
    setLogo(logoInput.trim()); setLogoSaving(false); setLogoSaved(true)
    setTimeout(() => setLogoSaved(false), 2000)
  }

  async function saveStatusConfig() {
    setStatusSaving(true); setStatusSaved(false)
    const statusLabels = {
      PENDING: statusCfg.PENDING.label,
      APPROVED_WITH_TOA: statusCfg.APPROVED_WITH_TOA.label,
      APPROVED_WITHOUT_TOA: statusCfg.APPROVED_WITHOUT_TOA.label,
      REJECTED: statusCfg.REJECTED.label,
    }
    const statusColors = {
      PENDING: statusCfg.PENDING.color,
      APPROVED_WITH_TOA: statusCfg.APPROVED_WITH_TOA.color,
      APPROVED_WITHOUT_TOA: statusCfg.APPROVED_WITHOUT_TOA.color,
      REJECTED: statusCfg.REJECTED.color,
    }
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusLabels, statusColors }),
    })
    setStatusSaving(false); setStatusSaved(true)
    setTimeout(() => setStatusSaved(false), 2000)
  }

  async function savePeriods(value: number) {
    setPeriodsSaving(true); setPeriodsSaved(false)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodsPerDay: value }),
    })
    setPeriodsSaving(false); setPeriodsSaved(true)
    setTimeout(() => setPeriodsSaved(false), 2000)
  }

  async function handleAdd() {
    if (!newName.trim()) { setAddError('Naam is verplicht'); return }
    setAdding(true); setAddError('')
    const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    const res = await fetch('/api/admin/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: slug, name: newName.trim(), accentColor: newColor, absenceDays: [] }),
    })
    setAdding(false)
    if (res.ok) { setShowAdd(false); setNewName(''); setNewColor('#2563eb'); loadSubjects() }
    else { const d = await res.json().catch(() => ({})); setAddError(d.error ?? 'Er is iets misgegaan.') }
  }

  return (
    <div className="space-y-6">

      {/* ── Algemeen ── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Algemeen</h2>
        <div className="space-y-3">

          {/* Registration toggle */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div>
              <p className="font-semibold text-slate-200 text-sm">Nieuwe aanmeldingen</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Wanneer uitgeschakeld kunnen nieuwe gebruikers niet voor het eerst inloggen
              </p>
            </div>
            {!settingsLoading && (
              <button onClick={toggleRegistration}
                className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <span className={registrationOpen ? 'text-green-400' : 'text-red-400'}>
                  {registrationOpen ? 'Aanmeldingen open' : 'Aanmeldingen gesloten'}
                </span>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${registrationOpen ? 'bg-green-600' : 'bg-slate-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${registrationOpen ? 'left-5' : 'left-0.5'}`} />
                </div>
              </button>
            )}
          </div>

          {/* School logo */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <p className="font-semibold text-slate-200 text-sm mb-1">Schoollogo</p>
            <p className="text-xs text-slate-500 mb-3">
              URL van het schoollogo (PNG/SVG). Wordt subtiel weergegeven in de navigatiebalk.
            </p>
            <div className="flex gap-2 items-start">
              <input value={logoInput} onChange={e => setLogoInput(e.target.value)}
                placeholder="https://…/logo.png"
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
              {logoInput && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoInput} alt="preview"
                  className="h-8 w-auto rounded object-contain bg-slate-800 p-1"
                  onError={e => (e.currentTarget.style.display = 'none')} />
              )}
              <button onClick={saveLogo} disabled={logoSaving || logoInput === logo}
                className={`px-3 py-2 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  logoSaved ? 'bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white'
                }`}>
                {logoSaving ? 'Opslaan…' : logoSaved ? '✓ Opgeslagen' : 'Opslaan'}
              </button>
            </div>
            {logo && (
              <p className="text-xs text-slate-500 mt-2">
                Huidig: <span className="text-slate-400 font-mono truncate">{logo}</span>
              </p>
            )}
          </div>

          {/* Periods per day */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <p className="font-semibold text-slate-200 text-sm mb-1">Uren per dag</p>
            <p className="text-xs text-slate-500 mb-3">
              Hoeveel lesuren er per dag in de kalender worden weergegeven.
            </p>
            <div className="flex items-center gap-3">
              <select
                value={periodsPerDay}
                onChange={e => setPeriodsPerDay(Number(e.target.value))}
                className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                  <option key={n} value={n}>{n} uren</option>
                ))}
              </select>
              <button
                onClick={() => savePeriods(periodsPerDay)}
                disabled={periodsSaving}
                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                  periodsSaved ? 'bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white'
                }`}
              >
                {periodsSaving ? 'Opslaan…' : periodsSaved ? '✓ Opgeslagen' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Statuslabels en kleuren ── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Statuslabels en kleuren</h2>
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
          <p className="text-xs text-slate-500">Pas de tekst en kleur aan van elke status.</p>
          {STATUS_ROWS.map(({ key, title }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-3 h-8 rounded flex-shrink-0" style={{ backgroundColor: statusCfg[key].color }} />
              <span className="text-xs text-slate-400 w-36 flex-shrink-0">{title}</span>
              <input
                value={statusCfg[key].label}
                onChange={e => {
                  const val = e.target.value
                  setStatusCfg(prev => ({ ...prev, [key]: { ...prev[key], label: val } }))
                }}
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <input
                type="color"
                value={statusCfg[key].color}
                onChange={e => {
                  const val = e.target.value
                  setStatusCfg(prev => ({ ...prev, [key]: { ...prev[key], color: val } }))
                }}
                className="w-8 h-8 rounded cursor-pointer border border-slate-600 flex-shrink-0"
                title="Kies kleur"
              />
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setStatusCfg(DEFAULT_STATUS)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Standaard herstellen
            </button>
            <button
              onClick={saveStatusConfig}
              disabled={statusSaving}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${statusSaved ? 'bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white'}`}
            >
              {statusSaving ? 'Opslaan…' : statusSaved ? '✓ Opgeslagen' : 'Opslaan'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Vakken ── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Vakken</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {subjects.map(s => (
            <SubjectCard key={s.id} subject={s} onSaved={loadSubjects} onDeleted={loadSubjects} />
          ))}
        </div>

        {showAdd ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3 max-w-sm">
            <h3 className="text-sm font-semibold text-white">Nieuwe agenda</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Naam *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="bijv. Aardrijkskunde"
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Accentkleur</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full transition-all ${newColor === c ? 'ring-2 ring-offset-1 ring-slate-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
                    style={{ backgroundColor: c }} title={COLOR_NAMES[c] ?? c} />
                ))}
                <div className="flex items-center gap-1.5">
                  <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
                  <span className="text-xs text-slate-400">{COLOR_NAMES[newColor] ?? newColor}</span>
                </div>
              </div>
            </div>
            {addError && <p className="text-red-400 text-xs">{addError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowAdd(false); setAddError('') }}
                className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors">
                Annuleren
              </button>
              <button onClick={handleAdd} disabled={adding}
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors">
                {adding ? 'Aanmaken…' : 'Aanmaken'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-sm transition-colors">
            + Nieuwe agenda toevoegen
          </button>
        )}
      </section>
    </div>
  )
}
