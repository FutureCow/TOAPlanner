'use client'
import { useState } from 'react'
import { RequestWithUser } from '@/types'
import { Subject } from '@prisma/client'
import { toDateString } from '@/lib/week'

const SUBJECTS: { value: Subject; label: string }[] = [
  { value: 'NATUURKUNDE', label: 'Natuurkunde' },
  { value: 'SCHEIKUNDE',  label: 'Scheikunde' },
  { value: 'BIOLOGIE',   label: 'Biologie' },
  { value: 'PROJECT',    label: 'Project/NLT' },
]

interface Props {
  date: Date
  period: number
  subject: Subject | null
  request?: RequestWithUser    // if editing
  onClose: () => void
  onSaved: () => void
}

export default function RequestModal({ date, period, subject, request, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(request?.title ?? '')
  const [classroom, setClassroom] = useState(request?.classroom ?? '')
  const [selectedDate, setSelectedDate] = useState(request ? request.date.slice(0, 10) : toDateString(date))
  const [selectedPeriod, setSelectedPeriod] = useState(request?.period ?? period)
  const [selectedSubject, setSelectedSubject] = useState<Subject>(request?.subject ?? subject ?? 'NATUURKUNDE')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !classroom.trim()) {
      setError('Vul alle velden in.')
      return
    }
    setSaving(true)
    setError('')

    const url = request ? `/api/requests/${request.id}` : '/api/requests'
    const method = request ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        classroom: classroom.trim(),
        date: selectedDate,
        period: selectedPeriod,
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
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">
          {request ? 'Aanvraag bewerken' : 'Nieuwe aanvraag'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Naam van de proef *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="bijv. NS1 H4 proef 3 Lampjes"
            />
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Datum *</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Uur *</label>
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(p => (
                  <option key={p} value={p}>{p}e uur</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Vak *</label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value as Subject)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
