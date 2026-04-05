'use client'
import { useState, useEffect } from 'react'
import { RequestWithUser, SubjectConfig } from '@/types'
import { toDateString } from '@/lib/week'

const ALL_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/** Calculate school year end: Aug 1 of current or next year */
function schoolYearEnd(from: string): Date {
  const d = new Date(from + 'T00:00:00Z')
  const year = d.getUTCMonth() >= 7 // Aug = 7
    ? d.getUTCFullYear() + 1
    : d.getUTCFullYear()
  return new Date(`${year}-08-01T00:00:00Z`)
}

/** All dates with the same weekday from `from` until `end` (exclusive) */
function weeklyDates(from: string, end: Date): string[] {
  const dates: string[] = []
  const d = new Date(from + 'T00:00:00Z')
  while (d < end) {
    dates.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 7)
  }
  return dates
}

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
  const [selectedDate, setSelectedDate] = useState(
    request ? request.date.slice(0, 10) : toDateString(date)
  )
  const [selectedPeriod, setSelectedPeriod] = useState(request?.period ?? period)
  const [selectedPeriodEnd, setSelectedPeriodEnd] = useState(
    request?.periodEnd ?? request?.period ?? period
  )
  const [multiHour, setMultiHour] = useState(
    request ? (request.periodEnd != null && request.periodEnd !== request.period) : false
  )
  const [recurring, setRecurring] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string>(request?.subject ?? subject ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [seriesPrompt, setSeriesPrompt] = useState(false)

  const isEditing = !!request
  const isHeleDag = selectedPeriod === 0

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

  // Keep periodEnd >= period
  useEffect(() => {
    if (selectedPeriodEnd < selectedPeriod) setSelectedPeriodEnd(selectedPeriod)
  }, [selectedPeriod, selectedPeriodEnd])

  const patchPayload = () => ({
    title: title.trim(),
    klas: klas.trim(),
    classroom: classroom.trim(),
    date: selectedDate,
    period: selectedPeriod,
    periodEnd: !isHeleDag && multiHour && selectedPeriodEnd > selectedPeriod ? selectedPeriodEnd : null,
    subject: selectedSubject,
  })

  async function applyEdit(scope: 'one' | 'series') {
    setSaving(true)
    setError('')
    const payload = patchPayload()
    let res: Response
    if (scope === 'series' && request!.recurringGroupId) {
      res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recurringGroupId: request!.recurringGroupId, ...payload }),
      })
    } else {
      res = await fetch(`/api/requests/${request!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    setSaving(false)
    if (res.ok) { onSaved() } else {
      setError((await res.json().catch(() => ({}))).error ?? 'Er is iets misgegaan.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !classroom.trim()) {
      setError('Vul alle verplichte velden in.')
      return
    }

    if (isEditing) {
      if (request!.recurringGroupId) {
        setSeriesPrompt(true)
      } else {
        await applyEdit('one')
      }
      return
    }

    // New request — possibly recurring
    setSaving(true)
    setError('')
    const { periodEnd: pEnd, ...basePayload } = { ...patchPayload(), date: undefined }
    const groupId = recurring ? crypto.randomUUID() : undefined
    const dates = recurring
      ? weeklyDates(selectedDate, schoolYearEnd(selectedDate))
      : [selectedDate]

    const results = await Promise.all(
      dates.map(d =>
        fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...basePayload,
            date: d,
            periodEnd: pEnd,
            recurringGroupId: groupId,
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

  const periodOptions = [
    <option key={0} value={0}>Hele dag</option>,
    ...ALL_PERIODS.map(p => <option key={p} value={p}>{p}e uur</option>),
  ]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="relative bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
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

          {/* Lokaal */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Gewenst lokaal *</label>
            <input
              value={classroom}
              onChange={e => setClassroom(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="bijv. W107"
            />
          </div>

          {/* Datum */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Datum *</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Period / period range */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-400">Uur *</label>
              {!isHeleDag && (
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multiHour}
                    onChange={e => setMultiHour(e.target.checked)}
                  />
                  Meerdere uren
                </label>
              )}
            </div>

            {!multiHour || isHeleDag ? (
              <select
                value={selectedPeriod}
                onChange={e => {
                  const v = Number(e.target.value)
                  setSelectedPeriod(v)
                  setSelectedPeriodEnd(v)
                }}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {periodOptions}
              </select>
            ) : (
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                <select
                  value={selectedPeriod}
                  onChange={e => setSelectedPeriod(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {ALL_PERIODS.map(p => <option key={p} value={p}>{p}e uur</option>)}
                </select>
                <span className="text-slate-500 text-xs text-center">t/m</span>
                <select
                  value={selectedPeriodEnd}
                  onChange={e => setSelectedPeriodEnd(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {ALL_PERIODS.filter(p => p >= selectedPeriod).map(p => (
                    <option key={p} value={p}>{p}e uur</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Vak */}
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

          {/* Recurring — only for new requests */}
          {!isEditing && !isHeleDag && (
            <label className="flex items-center gap-2.5 cursor-pointer bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5">
              <input
                type="checkbox"
                checked={recurring}
                onChange={e => setRecurring(e.target.checked)}
              />
              <span className="text-sm text-slate-200">
                Wekelijks herhalen
                {recurring && (
                  <span className="text-blue-400 ml-1 text-xs">
                    ({weeklyDates(selectedDate, schoolYearEnd(selectedDate)).length}×)
                  </span>
                )}
              </span>
            </label>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors">
              Annuleren
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium transition-colors text-white">
              {saving ? 'Opslaan…' : recurring ? `Opslaan (${weeklyDates(selectedDate, schoolYearEnd(selectedDate)).length}×)` : 'Opslaan'}
            </button>
          </div>
        </form>

        {/* Series edit prompt */}
        {seriesPrompt && (
          <div className="absolute inset-0 bg-slate-900/90 rounded-xl flex flex-col items-center justify-center gap-4 p-6">
            <p className="text-white text-sm font-medium text-center">↺ Dit is een herhalende aanvraag. Wat wil je aanpassen?</p>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => { setSeriesPrompt(false); applyEdit('one') }}
                disabled={saving}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium text-white transition-colors"
              >
                Alleen deze aanvraag
              </button>
              <button
                onClick={() => { setSeriesPrompt(false); applyEdit('series') }}
                disabled={saving}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm font-medium text-slate-200 transition-colors"
              >
                Hele reeks aanpassen
              </button>
              <button
                onClick={() => setSeriesPrompt(false)}
                className="w-full py-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
