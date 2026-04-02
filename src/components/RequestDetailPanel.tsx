'use client'
import { useState } from 'react'
import type { Session } from 'next-auth'
import { RequestWithUser } from '@/types'
import { Status } from '@prisma/client'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const STATUS_OPTIONS: { value: Status; label: string; style: string }[] = [
  { value: 'PENDING',              label: 'Aangevraagd',    style: 'bg-slate-700 text-slate-300 hover:bg-slate-600' },
  { value: 'APPROVED_WITH_TOA',    label: '✓ Met TOA',      style: 'bg-green-900 text-green-300 hover:bg-green-800 border border-green-600' },
  { value: 'APPROVED_WITHOUT_TOA', label: '◑ Zonder TOA',   style: 'bg-amber-900 text-amber-300 hover:bg-amber-800 border border-amber-600' },
  { value: 'REJECTED',             label: '✗ Afgekeurd',    style: 'bg-red-900 text-red-300 hover:bg-red-800 border border-red-600' },
]

interface Props {
  request: RequestWithUser
  session: Session
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
  onStatusChanged: () => void
}

export default function RequestDetailPanel({ request, session, onClose, onEdit, onDeleted, onStatusChanged }: Props) {
  const [deleting, setDeleting] = useState(false)
  const canModify = session.user.isTOA || session.user.isAdmin || request.createdById === session.user.id
  const canChangeStatus = session.user.isTOA || session.user.isAdmin
  const dateLabel = format(new Date(request.date), 'EEEE d MMMM yyyy', { locale: nl })

  async function handleStatus(status: Status) {
    const res = await fetch(`/api/requests/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) onStatusChanged()
  }

  async function handleDelete() {
    if (!confirm('Weet je zeker dat je deze aanvraag wilt verwijderen?')) return
    setDeleting(true)
    const res = await fetch(`/api/requests/${request.id}`, { method: 'DELETE' })
    if (res.ok) onDeleted()
    else setDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-white text-base">{request.title}</h3>
            <p className="text-slate-400 text-xs mt-0.5 capitalize">{dateLabel} · {request.period}e uur · {request.classroom}</p>
            {request.createdBy && (
              <p className="text-slate-500 text-xs mt-0.5">
                Door <strong className="text-slate-300">{request.createdBy.abbreviation.toUpperCase()}</strong> — {request.createdBy.name}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 text-lg leading-none">×</button>
        </div>

        {canChangeStatus && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleStatus(opt.value)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${opt.style} ${request.status === opt.value ? 'ring-2 ring-white/30' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {canModify && (
          <div className="flex gap-2">
            <button onClick={onEdit}
              className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium transition-colors text-blue-300">
              ✏ Bewerken
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="py-1.5 px-3 bg-red-950 hover:bg-red-900 border border-red-800 rounded text-xs font-medium transition-colors text-red-300 disabled:opacity-50">
              {deleting ? '…' : '🗑'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
