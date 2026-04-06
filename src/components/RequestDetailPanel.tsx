'use client'
import { useState } from 'react'
import type { Session } from 'next-auth'
import { RequestWithUser } from '@/types'
import { DEFAULT_STATUS_COLORS, DEFAULT_STATUS_LABELS } from './RequestBlock'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const STATUS_KEYS = ['PENDING', 'APPROVED_WITH_TOA', 'APPROVED_WITHOUT_TOA', 'REJECTED'] as const
type StatusKey = typeof STATUS_KEYS[number]

interface Props {
  request: RequestWithUser
  session: Session
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
  onStatusChanged: () => void
  statusColors?: typeof DEFAULT_STATUS_COLORS
  statusLabels?: typeof DEFAULT_STATUS_LABELS
}

export default function RequestDetailPanel({ request, session, onClose, onEdit, onDeleted, onStatusChanged, statusColors, statusLabels }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [applyToSeries, setApplyToSeries] = useState(false)
  const canModify = session.user.isTOA || session.user.isAdmin || request.createdById === session.user.id
  const canChangeStatus = session.user.isTOA || session.user.isAdmin
  const dateLabel = format(new Date(request.date), 'EEEE d MMMM yyyy', { locale: nl })
  const colors = statusColors ?? DEFAULT_STATUS_COLORS
  const labels = statusLabels ?? DEFAULT_STATUS_LABELS

  async function handleStatus(status: StatusKey) {
    if (applyToSeries && request.recurringGroupId) {
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recurringGroupId: request.recurringGroupId, status }),
      })
      if (res.ok) onStatusChanged()
    } else {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) onStatusChanged()
    }
  }

  async function handleDelete() {
    if (!confirm('Weet je zeker dat je deze aanvraag wilt verwijderen?')) return
    setDeleting(true)
    const res = await fetch(`/api/requests/${request.id}`, { method: 'DELETE' })
    if (res.ok) onDeleted()
    else setDeleting(false)
  }

  async function handleDeleteSeries() {
    if (!request.recurringGroupId) return
    if (!confirm('Wil je de HELE reeks (alle weken) verwijderen?')) return
    setDeleting(true)
    const res = await fetch('/api/requests', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recurringGroupId: request.recurringGroupId }),
    })
    if (res.ok) onDeleted()
    else setDeleting(false)
  }

  const periodLabel = request.period === 0
    ? 'Hele dag'
    : request.periodEnd != null
      ? `${request.period}e–${request.periodEnd}e uur`
      : `${request.period}e uur`

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-white text-base">
              {request.klas && !request.title.startsWith(request.klas) ? <><span className="text-slate-400 font-normal">{request.klas} – </span>{request.title}</> : request.title}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5 capitalize">
              {dateLabel} · {periodLabel} · {request.classroom}
            </p>
            {request.createdBy && (
              <p className="text-slate-500 text-xs mt-0.5">
                Door <strong className="text-slate-300">{request.createdBy.abbreviation.toUpperCase()}</strong> — {request.createdBy.name}
              </p>
            )}
            {request.recurringGroupId && (
              <p className="text-xs text-blue-400 mt-1">↺ Wekelijks herhalend</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 text-lg leading-none">×</button>
        </div>

        {canChangeStatus && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
              {request.recurringGroupId && (
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={applyToSeries} onChange={e => setApplyToSeries(e.target.checked)} />
                  Hele reeks
                </label>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_KEYS.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatus(s)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors text-slate-100 ${request.status === s ? 'ring-2 ring-white/30' : 'opacity-60 hover:opacity-90'}`}
                  style={{ backgroundColor: colors[s] + '55', border: `1px solid ${colors[s]}99` }}
                >
                  {labels[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {canModify && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={onEdit}
              className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium transition-colors text-blue-300">
              ✏ Bewerken
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="py-1.5 px-3 bg-red-950 hover:bg-red-900 border border-red-800 rounded text-xs font-medium transition-colors text-red-300 disabled:opacity-50"
              title="Alleen deze aanvraag verwijderen">
              {deleting ? '…' : '🗑'}
            </button>
            {request.recurringGroupId && (
              <button onClick={handleDeleteSeries} disabled={deleting}
                className="py-1.5 px-2 bg-red-950 hover:bg-red-900 border border-red-700 rounded text-xs font-medium transition-colors text-red-400 disabled:opacity-50 whitespace-nowrap"
                title="Hele reeks verwijderen">
                🗑 Hele reeks
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
