'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { RequestWithUser, SubjectConfig } from '@/types'
import { Status } from '@prisma/client'
import { format, addWeeks, startOfWeek, addDays, getISOWeek } from 'date-fns'
import { nl } from 'date-fns/locale'

function WeekPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  function toMonday(d: Date) {
    return startOfWeek(d, { weekStartsOn: 1 })
  }
  const monday = value ? toMonday(new Date(value + 'T00:00:00')) : null
  const friday = monday ? addDays(monday, 4) : null

  function navigate(delta: number) {
    const base = monday ?? toMonday(new Date())
    onChange(format(addWeeks(base, delta), 'yyyy-MM-dd'))
  }

  const label = monday && friday
    ? `Week ${getISOWeek(monday)} · ${format(monday, 'd', { locale: nl })}–${format(friday, 'd MMM', { locale: nl })}`
    : 'Kies week'

  return (
    <div className="flex items-center gap-0.5">
      <button onClick={() => navigate(-1)} className="px-1.5 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded text-xs transition-colors" title="Vorige week">‹</button>
      <button
        onClick={() => navigate(0)}
        className={`px-2 py-1 rounded text-xs border transition-colors whitespace-nowrap ${
          monday ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-slate-800 border-slate-700 text-slate-500'
        }`}
        title={monday ? 'Klik voor huidige week' : 'Kies een week'}
        onDoubleClick={() => onChange(format(toMonday(new Date()), 'yyyy-MM-dd'))}
      >
        {label}
      </button>
      <button onClick={() => navigate(1)} className="px-1.5 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded text-xs transition-colors" title="Volgende week">›</button>
      {monday && (
        <button onClick={() => onChange('')} className="ml-0.5 text-slate-500 hover:text-slate-300 text-xs px-1" title="Filter wissen">✕</button>
      )}
    </div>
  )
}

const STATUS_LABELS: Record<Status, string> = {
  PENDING: 'Aangevraagd',
  APPROVED_WITH_TOA: 'Met TOA',
  APPROVED_WITHOUT_TOA: 'Zonder TOA',
  REJECTED: 'Afgekeurd',
}
const STATUS_STYLES: Record<Status, { bg: string; color: string }> = {
  PENDING:              { bg: 'rgba(86,180,233,0.15)',  color: '#56B4E9' },
  APPROVED_WITH_TOA:    { bg: 'rgba(0,158,115,0.15)',   color: '#009E73' },
  APPROVED_WITHOUT_TOA: { bg: 'rgba(230,159,0,0.15)',   color: '#E69F00' },
  REJECTED:             { bg: 'rgba(213,94,0,0.15)',    color: '#D55E00' },
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
        className="px-1.5 py-0.5 rounded text-[0.65rem] font-medium cursor-pointer hover:opacity-80 transition-opacity"
        style={{ background: STATUS_STYLES[request.status].bg, color: STATUS_STYLES[request.status].color }}
      >
        {STATUS_LABELS[request.status]} ▾
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-30 bg-slate-900 border border-slate-600 rounded shadow-xl min-w-[130px]">
          {STATUS_VALUES.map(s => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 transition-colors flex items-center gap-2 ${
                s === request.status ? 'font-bold' : 'opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_STYLES[s].color }} />
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
        <WeekPicker value={weekFilter} onChange={setWeekFilter} />
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
