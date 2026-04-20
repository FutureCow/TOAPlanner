'use client'
import { useState, useEffect, useCallback } from 'react'
import { SubjectConfig } from '@/types'
import { getPeriodStartTime } from '@/lib/periodTimes'

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr']
const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag']

// Accent colors for subjects — saturated but readable on dark and light backgrounds
const PRESET_COLORS = [
  '#2563eb', '#16a34a', '#eab308', '#ea580c',
  '#dc2626', '#9333ea', '#db2777', '#0891b2',
]

const COLOR_NAMES: Record<string, string> = {
  '#2563eb': 'Blauw',
  '#16a34a': 'Groen',
  '#eab308': 'Geel',
  '#ea580c': 'Oranje',
  '#dc2626': 'Rood',
  '#9333ea': 'Paars',
  '#db2777': 'Roze',
  '#0891b2': 'Cyaan',
}

// ── Statuskleur-presets ──────────────────────────────────────────────────────
// Eerste vier zijn het Wong colorblind-safe palet (aanbevolen).
// De rest zijn alternatieve opties voor wie eigen kleuren wil.
const STATUS_PRESET_COLORS: { hex: string; label: string; wong?: boolean }[] = [
  { hex: '#56B4E9', label: 'Hemelsblauw (kleurenblindveilig)',  wong: true },
  { hex: '#009E73', label: 'Blauwgroen (kleurenblindveilig)',   wong: true },
  { hex: '#E69F00', label: 'Oranje (kleurenblindveilig)',       wong: true },
  { hex: '#D55E00', label: 'Vermiljoen (kleurenblindveilig)',   wong: true },
  // ── overige opties ──
  { hex: '#64748b', label: 'Leisteen grijs'  },
  { hex: '#3b82f6', label: 'Blauw'           },
  { hex: '#06b6d4', label: 'Cyaan'           },
  { hex: '#16a34a', label: 'Groen'           },
  { hex: '#65a30d', label: 'Lime'            },
  { hex: '#d97706', label: 'Amber'           },
  { hex: '#dc2626', label: 'Rood'            },
  { hex: '#9333ea', label: 'Paars'           },
  { hex: '#db2777', label: 'Roze'            },
]

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

// Wong colorblind-safe palette als standaard
const DEFAULT_STATUS = {
  PENDING:              { label: 'Aangevraagd',         color: '#56B4E9' },
  APPROVED_WITH_TOA:    { label: 'Goedgekeurd met TOA', color: '#009E73' },
  APPROVED_WITHOUT_TOA: { label: 'Zonder TOA',          color: '#E69F00' },
  REJECTED:             { label: 'Afgekeurd',           color: '#D55E00' },
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
  const [periodStartTime, setPeriodStartTime] = useState('08:30')
  const [periodDuration, setPeriodDuration]   = useState(50)
  const [breaks, setBreaks]                   = useState<{ afterPeriod: number; duration: number; label: string }[]>([])
  const [timingSaving, setTimingSaving]       = useState(false)
  const [timingSaved, setTimingSaved]         = useState(false)
  const [newBreakAfter, setNewBreakAfter]     = useState(1)
  const [newBreakDuration, setNewBreakDuration] = useState(15)
  const [newBreakLabel, setNewBreakLabel]     = useState('')
  const [showBreakForm, setShowBreakForm]     = useState(false)

  // Status labels + colors
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
      setPeriodStartTime(d.periodStartTime ?? '08:30')
      setPeriodDuration(d.periodDuration ?? 50)
      setBreaks(Array.isArray(d.breaks) ? d.breaks : [])
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

  async function saveTiming() {
    setTimingSaving(true); setTimingSaved(false)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodStartTime, periodDuration, breaks }),
    })
    setTimingSaving(false); setTimingSaved(true)
    setTimeout(() => setTimingSaved(false), 2000)
  }

  function addBreak() {
    setBreaks(prev => [...prev, { afterPeriod: newBreakAfter, duration: newBreakDuration, label: newBreakLabel }]
      .sort((a, b) => a.afterPeriod - b.afterPeriod))
    setShowBreakForm(false)
    setNewBreakLabel('')
  }

  function removeBreak(idx: number) {
    setBreaks(prev => prev.filter((_, i) => i !== idx))
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

          {/* Uurindeling */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-4">
            <div>
              <p className="font-semibold text-slate-200 text-sm mb-1">Uurindeling</p>
              <p className="text-xs text-slate-500 mb-3">
                Starttijd van het eerste uur en duur per uur. Pauzes worden automatisch meegenomen in de tijdberekening.
              </p>
              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Starttijd eerste uur</label>
                  <input
                    type="time"
                    value={periodStartTime}
                    onChange={e => setPeriodStartTime(e.target.value)}
                    className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Duur per uur (min)</label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    value={periodDuration}
                    onChange={e => setPeriodDuration(Number(e.target.value))}
                    className="w-20 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={saveTiming}
                  disabled={timingSaving}
                  className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                    timingSaved ? 'bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white'
                  }`}
                >
                  {timingSaving ? 'Opslaan…' : timingSaved ? '✓ Opgeslagen' : 'Opslaan'}
                </button>
              </div>
            </div>

            {/* Live preview */}
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Berekende tijden:</p>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map(p => (
                  <span key={p} className="text-xs text-slate-400 bg-slate-800 rounded px-2 py-0.5">
                    <span className="font-semibold text-slate-300">{p}</span>
                    {' → '}
                    {getPeriodStartTime(p, periodStartTime, periodDuration, breaks)}
                  </span>
                ))}
              </div>
            </div>

            {/* Pauzes */}
            <div>
              <p className="text-xs text-slate-400 font-semibold mb-2">Pauzes</p>
              {breaks.length === 0 && (
                <p className="text-xs text-slate-600 mb-2">Geen pauzes ingesteld.</p>
              )}
              <div className="space-y-1 mb-2">
                {breaks.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800 rounded px-2 py-1.5">
                    <span>Na uur {b.afterPeriod} — {b.duration} min</span>
                    {b.label && <span className="text-slate-500">({b.label})</span>}
                    <button
                      onClick={() => removeBreak(idx)}
                      className="ml-auto text-slate-500 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {showBreakForm ? (
                <div className="flex gap-2 items-end flex-wrap bg-slate-800 rounded p-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Na uur</label>
                    <select
                      value={newBreakAfter}
                      onChange={e => setNewBreakAfter(Number(e.target.value))}
                      className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none"
                    >
                      {Array.from({ length: periodsPerDay - 1 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Duur (min)</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={newBreakDuration}
                      onChange={e => setNewBreakDuration(Number(e.target.value))}
                      className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Label (optioneel)</label>
                    <input
                      value={newBreakLabel}
                      onChange={e => setNewBreakLabel(e.target.value)}
                      placeholder="Kleine pauze"
                      className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none w-32"
                    />
                  </div>
                  <button
                    onClick={addBreak}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                  >
                    Toevoegen
                  </button>
                  <button
                    onClick={() => setShowBreakForm(false)}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
                  >
                    Annuleren
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowBreakForm(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  + Pauze toevoegen
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Statuslabels en kleuren ── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Statuslabels en kleuren</h2>
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-4">
          <p className="text-xs text-slate-500">
            Pas de tekst en kleur aan van elke status.{' '}
            <span className="text-slate-400">
              De eerste vier kleuren (gemarkeerd met ✦) zijn kleurenblindveilig.
            </span>
          </p>
          {STATUS_ROWS.map(({ key, title }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-3">
                {/* Kleurblok preview */}
                <div className="w-3 h-6 rounded flex-shrink-0" style={{ backgroundColor: statusCfg[key].color }} />
                <span className="text-xs text-slate-400 w-36 flex-shrink-0">{title}</span>
                <input
                  value={statusCfg[key].label}
                  onChange={e => {
                    const val = e.target.value
                    setStatusCfg(prev => ({ ...prev, [key]: { ...prev[key], label: val } }))
                  }}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              {/* Kleur swatches — Wong-kleuren eerst, daarna scheidingslijn, dan overige */}
              <div className="flex items-center gap-1.5 pl-6 flex-wrap">
                {STATUS_PRESET_COLORS.map((c, idx) => {
                  const isWong = c.wong
                  const prevWong = STATUS_PRESET_COLORS[idx - 1]?.wong
                  return (
                    <span key={c.hex} className="inline-flex items-center">
                      {/* Scheidingslijn na de Wong-kleuren */}
                      {!isWong && prevWong && (
                        <span className="inline-block w-px h-4 bg-slate-600 mx-1.5" />
                      )}
                      <button
                        onClick={() => setStatusCfg(prev => ({ ...prev, [key]: { ...prev[key], color: c.hex } }))}
                        className={`relative flex-shrink-0 transition-all ${
                          statusCfg[key].color === c.hex
                            ? 'ring-2 ring-offset-1 ring-slate-400 scale-110'
                            : 'opacity-75 hover:opacity-100'
                        } ${isWong ? 'w-5 h-5 rounded-full' : 'w-4 h-4 rounded-full'}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {/* Wong-markering */}
                        {isWong && (
                          <span className="absolute -top-1 -right-1 text-[7px] text-white font-bold leading-none select-none pointer-events-none"
                            style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' }}>
                            ✦
                          </span>
                        )}
                      </button>
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <button
              onClick={() => setStatusCfg(DEFAULT_STATUS)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Standaard herstellen
            </button>
            <button
              onClick={saveStatusConfig}
              disabled={statusSaving}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                statusSaved ? 'bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white'
              }`}
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
