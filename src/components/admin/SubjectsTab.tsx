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
    setSaving(true)
    setError('')
    setSuccess(false)
    const res = await fetch(`/api/admin/subjects/${subject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), accentColor: color, absenceDays: absence }),
    })
    setSaving(false)
    if (res.ok) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      onSaved()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Er is iets misgegaan.')
    }
  }

  async function handleDelete() {
    if (!confirm(`Agenda "${subject.name}" verwijderen? Alle aanvragen blijven bewaard maar worden niet meer weergegeven.`)) return
    const res = await fetch(`/api/admin/subjects/${subject.id}`, { method: 'DELETE' })
    if (res.ok) onDeleted()
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 space-y-3">
      {/* Color stripe */}
      <div className="h-1 rounded-full -mt-0.5" style={{ backgroundColor: color }} />

      {/* Name */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Naam</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Accent color */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Accentkleur</label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-1 ring-slate-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
              style={{ backgroundColor: c }}
              title={COLOR_NAMES[c] ?? c}
            />
          ))}
          <div className="flex items-center gap-1.5 ml-1">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              title="Aangepaste kleur"
            />
            <span className="text-xs text-slate-400">
              {COLOR_NAMES[color] ?? color}
            </span>
          </div>
        </div>
      </div>

      {/* TOA absence days */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">TOA afwezig op</label>
        <div className="flex gap-2">
          {DAYS.map((day, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              title={`TOA afwezig op ${DAY_NAMES[i]}`}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                absence.includes(i)
                  ? 'bg-amber-900/60 border-amber-700 text-amber-300'
                  : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
              }`}
            >
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

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handleDelete}
          className="text-xs text-red-500/60 hover:text-red-400 transition-colors"
        >
          Verwijderen
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            success
              ? 'bg-green-700 text-white'
              : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white'
          }`}
        >
          {saving ? 'Opslaan…' : success ? '✓' : 'Opslaan'}
        </button>
      </div>
    </div>
  )
}

export default function SubjectsTab() {
  const [subjects, setSubjects] = useState<SubjectConfig[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#2563eb')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/subjects')
    if (res.ok) setSubjects(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!newName.trim()) { setAddError('Naam is verplicht'); return }
    setAdding(true)
    setAddError('')
    const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    const res = await fetch('/api/admin/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: slug, name: newName.trim(), accentColor: newColor, absenceDays: [] }),
    })
    setAdding(false)
    if (res.ok) {
      setShowAdd(false)
      setNewName('')
      setNewColor('#2563eb')
      load()
    } else {
      const data = await res.json().catch(() => ({}))
      setAddError(data.error ?? 'Er is iets misgegaan.')
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {subjects.map(s => (
          <SubjectCard
            key={s.id}
            subject={s}
            onSaved={load}
            onDeleted={load}
          />
        ))}
      </div>

      {showAdd ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3 max-w-sm">
          <h3 className="text-sm font-semibold text-white">Nieuwe agenda</h3>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Naam *</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="bijv. Aardrijkskunde"
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Accentkleur</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full transition-all ${newColor === c ? 'ring-2 ring-offset-1 ring-slate-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
                  style={{ backgroundColor: c }}
                  title={COLOR_NAMES[c] ?? c}
                />
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
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
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
        >
          + Nieuwe agenda toevoegen
        </button>
      )}
    </div>
  )
}
