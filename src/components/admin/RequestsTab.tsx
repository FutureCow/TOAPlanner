'use client'
import { useState, useEffect, useCallback } from 'react'
import { RequestWithUser } from '@/types'
import { Subject, Status } from '@prisma/client'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const SUBJECT_LABELS: Record<Subject, string> = {
  NATUURKUNDE: 'Natuurkunde', SCHEIKUNDE: 'Scheikunde',
  BIOLOGIE: 'Biologie', PROJECT: 'Project/NLT',
}
const STATUS_LABELS: Record<Status, string> = {
  PENDING: 'Aangevraagd', APPROVED_WITH_TOA: 'Met TOA',
  APPROVED_WITHOUT_TOA: 'Zonder TOA', REJECTED: 'Afgekeurd',
}
const STATUS_STYLES: Record<Status, string> = {
  PENDING: 'bg-slate-700 text-slate-300',
  APPROVED_WITH_TOA: 'bg-green-900 text-green-300',
  APPROVED_WITHOUT_TOA: 'bg-amber-900 text-amber-300',
  REJECTED: 'bg-red-900 text-red-300',
}

export default function RequestsTab() {
  const [requests, setRequests] = useState<RequestWithUser[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (subject) params.set('subject', subject)
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/requests?${params}`)
    if (res.ok) setRequests(await res.json())
  }, [subject, status, search])

  useEffect(() => { load() }, [load])

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(requests.map(r => r.id)) : new Set())
  }

  async function bulkDelete() {
    if (!selected.size) return
    if (!confirm(`${selected.size} aanvragen verwijderen?`)) return
    setDeleting(true)
    await fetch('/api/admin/requests', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected) }),
    })
    setSelected(new Set())
    setDeleting(false)
    load()
  }

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <select value={subject} onChange={e => setSubject(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs">
          <option value="">Alle vakken</option>
          {Object.entries(SUBJECT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs">
          <option value="">Alle statussen</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Zoek op naam of docent…"
          className="flex-1 min-w-[150px] bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs" />
        {selected.size > 0 && (
          <button onClick={bulkDelete} disabled={deleting}
            className="px-3 py-1.5 bg-red-900 border border-red-700 text-red-300 rounded text-xs font-semibold disabled:opacity-50">
            🗑 Verwijder ({selected.size})
          </button>
        )}
      </div>

      <div className="border border-slate-700 rounded-lg overflow-hidden text-xs">
        <div className="grid bg-slate-900 border-b-2 border-slate-600 px-3 py-2 gap-2 font-semibold text-slate-500 uppercase tracking-wide text-[0.65rem]"
          style={{ gridTemplateColumns: '1.5rem 3fr 1.2fr 1fr 0.8fr 1.2fr 1.5fr' }}>
          <input type="checkbox" onChange={e => toggleAll(e.target.checked)}
            checked={selected.size === requests.length && requests.length > 0} />
          <span>Proef</span><span>Vak</span><span>Datum</span><span>Uur</span><span>Docent</span><span>Status</span>
        </div>
        {requests.length === 0 && (
          <p className="text-center text-slate-600 py-8 text-sm">Geen aanvragen gevonden</p>
        )}
        {requests.map(r => (
          <div key={r.id}
            className="grid px-3 py-2 gap-2 border-b border-slate-800 items-center hover:bg-slate-900/50 last:border-b-0"
            style={{ gridTemplateColumns: '1.5rem 3fr 1.2fr 1fr 0.8fr 1.2fr 1.5fr' }}>
            <input type="checkbox" checked={selected.has(r.id)}
              onChange={e => {
                const next = new Set(selected)
                if (e.target.checked) { next.add(r.id) } else { next.delete(r.id) }
                setSelected(next)
              }} />
            <span className="text-slate-200 font-medium truncate">{r.title}</span>
            <span className="text-slate-400">{SUBJECT_LABELS[r.subject]}</span>
            <span className="text-slate-400">{format(new Date(r.date), 'd MMM', { locale: nl })}</span>
            <span className="text-slate-400">{r.period}e</span>
            <span className="text-slate-300 font-semibold">{r.createdBy?.abbreviation.toUpperCase() ?? '—'}</span>
            <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-medium inline-block ${STATUS_STYLES[r.status]}`}>
              {STATUS_LABELS[r.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
