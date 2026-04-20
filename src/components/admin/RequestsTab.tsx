'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { RequestWithUser, SubjectConfig } from '@/types'
import { Status } from '@prisma/client'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const STATUS_LABELS: Record<Status, string> = {
  PENDING: 'Aangevraagd',
  APPROVED_WITH_TOA: 'Met TOA',
  APPROVED_WITHOUT_TOA: 'Zonder TOA',
  REJECTED: 'Afgekeurd',
}
const STATUS_STYLES: Record<Status, string> = {
  PENDING: 'bg-slate-700 text-slate-300',
  APPROVED_WITH_TOA: 'bg-green-900 text-green-300',
  APPROVED_WITHOUT_TOA: 'bg-amber-900 text-amber-300',
  REJECTED: 'bg-red-900 text-red-300',
}
const STATUS_VALUES: Status[] = ['PENDING', 'APPROVED_WITH_TOA', 'APPROVED_WITHOUT_TOA', 'REJECTED']

function StatusCell({ request, onUpdated }: { request: RequestWithUser; onUpdated: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  async function changeStatus(status: Status) {
    setOpen(false)
    await fetch(`/api/requests/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    onUpdated()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Klik om status te wijzigen"
        className={`px-1.5 py-0.5 rounded text-[0.65rem] font-medium cursor-pointer hover:opacity-80 transition-opacity ${STATUS_STYLES[request.status]}`}
      >
        {STATUS_LABELS[request.status]} ▾
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-30 bg-slate-900 border border-slate-600 rounded shadow-xl min-w-[130px]">
          {STATUS_VALUES.map(s => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 transition-colors text-slate-200 ${
                s === request.status ? 'font-bold' : 'opacity-60'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RequestsTab() {
  const [requests, setRequests] = useState<RequestWithUser[]>([])
  const [subjects, setSubjects] = useState<SubjectConfig[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [weekFilter, setWeekFilter] = useState('')
  const [pageSize, setPageSize] = useState(50)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/admin/subjects').then(r => r.ok ? r.json() : []).then(setSubjects).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (subject) params.set('subject', subject)
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    if (weekFilter) params.set('weekStart', weekFilter)
    params.set('limit', String(pageSize))
    const res = await fetch(`/api/admin/requests?${params}`)
    if (res.ok) setRequests(await res.json())
  }, [subject, status, search, weekFilter, pageSize])

  useEffect(() => { load() }, [load])

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(requests.map(r => r.id)) : new Set())
  }

  async function deleteRequest(id: string) {
    if (!confirm('Aanvraag verwijderen?')) return
    await fetch(`/api/requests/${id}`, { method: 'DELETE' })
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
    load()
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

  function subjectLabel(id: string) {
    return subjects.find(s => s.id === id)?.name ?? id
  }

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <select value={subject} onChange={e => setSubject(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs">
          <option value="">Alle vakken</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs">
          <option value="">Alle statussen</option>
          {STATUS_VALUES.map(v => <option key={v} value={v}>{STATUS_LABELS[v]}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <div className="relative flex items-center">
            <svg className="absolute left-2 text-slate-400 pointer-events-none" width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
            </svg>
            <input
              type="date"
              value={weekFilter}
              onChange={e => setWeekFilter(e.target.value)}
              className="date-input bg-slate-800 border border-slate-700 text-slate-300 rounded pl-7 pr-2 py-1.5 text-xs [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              title="Filter op week (kies een dag in de gewenste week)"
            />
          </div>
          {weekFilter && (
            <button onClick={() => setWeekFilter('')} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
          )}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Zoek op naam of docent…"
          className="flex-1 min-w-[150px] bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs" />
        <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs">
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={250}>250</option>
        </select>
        {selected.size > 0 && (
          <button onClick={bulkDelete} disabled={deleting}
            className="px-3 py-1.5 bg-red-900 border border-red-700 text-red-300 rounded text-xs font-semibold disabled:opacity-50">
            🗑 Verwijder ({selected.size})
          </button>
        )}
      </div>

      <div className="border border-slate-700 rounded-lg text-xs">
        {/* Header */}
        <div className="grid bg-slate-900 border-b-2 border-slate-600 rounded-t-lg px-3 py-2 gap-2 font-semibold text-slate-500 uppercase tracking-wide text-[0.65rem]"
          style={{ gridTemplateColumns: '1.5rem 0.5fr 1.5fr 1.2fr 1fr 0.8fr 1.2fr 1.4fr 1.5rem' }}>
          <input type="checkbox" onChange={e => toggleAll(e.target.checked)}
            checked={selected.size === requests.length && requests.length > 0} />
          <span>Klas</span>
          <span>Proef</span>
          <span>Vak</span>
          <span>Datum</span>
          <span>Uur</span>
          <span>Docent</span>
          <span>Status</span>
          <span></span>
        </div>

        {requests.length === 0 && (
          <p className="text-center text-slate-600 py-8 text-sm">Geen aanvragen gevonden</p>
        )}

        {requests.map(r => (
          <div key={r.id}
            className="grid px-3 py-2 gap-2 border-b border-slate-800 items-center hover:bg-slate-900/50 last:border-b-0"
            style={{ gridTemplateColumns: '1.5rem 0.5fr 1.5fr 1.2fr 1fr 0.8fr 1.2fr 1.4fr 1.5rem' }}>
            <input type="checkbox" checked={selected.has(r.id)}
              onChange={e => {
                const next = new Set(selected)
                if (e.target.checked) next.add(r.id); else next.delete(r.id)
                setSelected(next)
              }} />
            <span className="text-slate-400 font-medium truncate">{r.klas || '—'}</span>
            <span className="text-slate-200 font-medium truncate">{r.title}</span>
            <span className="text-slate-400 truncate">{subjectLabel(r.subject)}</span>
            <span className="text-slate-400 whitespace-nowrap">{format(new Date(r.date), 'd MMM', { locale: nl })}</span>
            <span className="text-slate-400">{r.period === 0 ? 'Dag' : `${r.period}e`}</span>
            <span className="text-slate-300 font-semibold">{r.createdBy?.abbreviation.toUpperCase() ?? '—'}</span>
            <StatusCell request={r} onUpdated={load} />
            <button
              onClick={() => deleteRequest(r.id)}
              className="text-slate-600 hover:text-red-400 transition-colors"
              title="Verwijderen"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
