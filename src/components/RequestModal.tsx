'use client'
import { useState, useEffect } from 'react'
import { RequestWithUser, SubjectConfig } from '@/types'
import { toDateString } from '@/lib/week'

const ALL_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

interface Props {
  date: Date
  period: number
  subject: string | null
  request?: RequestWithUser
  onClose: () => void
  onSaved: () => void
}

export default function RequestModal({ date, period, subject, request, onClose, onSaved }: Props) {
  const [subjects, setSubjects] = useState<SubjectConfig[]>([])
  const [title, setTitle] = useState(request?.title ?? '')
  const [klas, setKlas] = useState(request?.klas ?? '')
  const [classroom, setClassroom] = useState(request?.classroom ?? '')
  const [selectedDate, setSelectedDate] = useState(request ? request.date.slice(0, 10) : toDateString(date))
  // For editing: single period; for creating: multi-select
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>(
    request ? [request.period] : period === 0 ? [0] : [period]
  )
  const [selectedSubject, setSelectedSubject] = useState<string>(request?.subject ?? subject ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!request

  useEffect(() => {
    fetch('/api/subjects')
      .then(r => r.ok ? r.json() : [])
      .then((data: SubjectConfig[]) => {
        setSubjects(data)
        if (!selectedSubject && data.length > 0) {
          setSelectedSubject(subject ?? data[0].id)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function togglePeriod(p: number) {
    setSelectedPeriods(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !classroom.trim()) {
      setError('Vul alle verplichte velden in.')
      return
    }
    if (selectedPeriods.length === 0) {
      setError('Selecteer minimaal één uur.')
      return
    }
    setSaving(true)
    setError('')

    if (isEditing) {
      // Edit: single period
      const res = await fetch(`/api/requests/${request!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          klas: klas.trim(),
          classroom: classroom.trim(),
          date: selectedDate,
          period: selectedPeriods[0],
          subject: selectedSubject,
        }),
      })
      setSaving(false)
      if (res.ok) {
        onSaved()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Er is iets misgegaan.')
      }
    } else {
      // Create: one request per selected period
      const results = await Promise.all(
        selectedPeriods.map(p =>
          fetch('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: title.trim(),
              klas: klas.trim(),
              classroom: classroom.trim(),
              date: selectedDate,
              period: p,
              subject: selectedSubject,
            }),
          })
        )
      )
      setSaving(false)
      if (results.every(r => r.ok)) {
        onSaved()
      } else {
        setError('Eén of meer aanvragen konden niet worden opgeslagen.')
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">
          {isEditing ? 'Aanvraag bewerken' : 'Nieuwe aanvraag'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Klas + Naam */}
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Klas</label>
              <input
                value={klas}
                onChange={e => setKlas(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="3H"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Naam van de proef *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="bijv. NS1 H4 proef 3 Lampjes"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Gewenst lokaal *</label>
            <input
              value={classroom}
              onChange={e => setClassroom(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="bijv. W107"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Datum *</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Period selection */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {isEditing ? 'Uur *' : 'Uur(en) *'}
            </label>
            {isEditing ? (
              /* Editing: single select */
              <select
                value={selectedPeriods[0]}
                onChange={e => setSelectedPeriods([Number(e.target.value)])}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value={0}>Hele dag</option>
                {ALL_PERIODS.map(p => (
                  <option key={p} value={p}>{p}e uur</option>
                ))}
              </select>
            ) : (
              /* Creating: checkboxes */
              <div className="bg-slate-800 border border-slate-700 rounded p-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 mb-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPeriods.includes(0)}
                    onChange={() => togglePeriod(0)}
                  />
                  Hele dag
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {ALL_PERIODS.map(p => (
                    <label key={p} className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPeriods.includes(p)}
                        onChange={() => togglePeriod(p)}
                      />
                      {p}e
                    </label>
                  ))}
                </div>
                {selectedPeriods.length > 1 && (
                  <p className="text-xs text-blue-400 mt-1.5">
                    {selectedPeriods.length} aanvragen worden aangemaakt
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Vak *</label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors">
              Annuleren
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium transition-colors">
              {saving ? 'Opslaan…' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
