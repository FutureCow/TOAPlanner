'use client'
import React, { useState, useEffect, useCallback } from 'react'
import type { Session } from 'next-auth'
import { RequestWithUser, SubjectConfig } from '@/types'
import { getWeekDates, getWeekLabel, prevWeek, nextWeek, toDateString } from '@/lib/week'
import RequestBlock from './RequestBlock'
import RequestModal from './RequestModal'
import RequestDetailPanel from './RequestDetailPanel'

const DAYS_SHORT = ['Maa', 'Din', 'Woe', 'Don', 'Vri']
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const GRID_COLS = '2rem repeat(5, 1fr)'

interface Props {
  subject: string | null
  session: Session
  subjectConfig?: SubjectConfig | null
}

export default function WeekCalendar({ subject, session, subjectConfig }: Props) {
  const [currentDate, setCurrentDate] = useState(() => getWeekDates(new Date())[0])
  const [requests, setRequests] = useState<RequestWithUser[]>([])
  const [modal, setModal] = useState<{ date: Date; period: number } | null>(null)
  const [editing, setEditing] = useState<RequestWithUser | null>(null)
  const [selected, setSelected] = useState<RequestWithUser | null>(null)

  const weekDates = getWeekDates(currentDate)
  const today = toDateString(new Date())
  const accentColor = subjectConfig?.accentColor ?? '#475569'
  const absenceDays = subjectConfig?.absenceDays ?? []

  const load = useCallback(async () => {
    const dates = getWeekDates(currentDate)
    const params = new URLSearchParams({ weekStart: toDateString(dates[0]) })
    if (subject) params.set('subject', subject)
    const res = await fetch(`/api/requests?${params}`)
    if (res.ok) setRequests(await res.json())
  }, [currentDate, subject])

  useEffect(() => { load() }, [load])

  /** Returns requests that span `period` on `date`, plus whether this is the first period */
  function getCellRequests(date: Date, period: number): { request: RequestWithUser; isFirst: boolean }[] {
    const ds = toDateString(date)
    return requests
      .filter(r => {
        if (!r.date.startsWith(ds)) return false
        const end = r.periodEnd ?? r.period
        return r.period <= period && period <= end
      })
      .map(r => ({ request: r, isFirst: r.period === period }))
  }

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-slate-200">{getWeekLabel(weekDates)}</span>
        <div className="flex gap-1">
          <button onClick={() => setCurrentDate(getWeekDates(new Date())[0])}
            className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors">
            Vandaag
          </button>
          <button onClick={() => setCurrentDate(d => getWeekDates(prevWeek(d))[0])}
            className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors">
            ‹
          </button>
          <button onClick={() => setCurrentDate(d => getWeekDates(nextWeek(d))[0])}
            className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors">
            ›
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border border-slate-700 rounded-lg overflow-hidden text-xs">
        {/* Day headers */}
        <div
          className="grid border-b-2 border-slate-600"
          style={{ gridTemplateColumns: GRID_COLS, backgroundColor: accentColor + '22' }}
        >
          <div />
          {weekDates.map((d, i) => {
            const isToday = toDateString(d) === today
            const isAbsent = absenceDays.includes(i)
            return (
              <div
                key={i}
                className={`p-2 text-center font-semibold text-slate-300 relative ${
                  isToday ? 'ring-2 ring-inset rounded' : ''
                } ${isAbsent ? 'opacity-60' : ''}`}
                style={isToday ? { '--tw-ring-color': accentColor } as React.CSSProperties : undefined}
                title={isAbsent ? 'TOA niet aanwezig' : undefined}
              >
                {isAbsent && (
                  <span className="absolute top-0.5 right-0.5 text-[0.6rem] text-amber-400" title="TOA niet aanwezig">
                    ✕
                  </span>
                )}
                {DAYS_SHORT[i]}{' '}
                <span
                  className={`rounded-full px-1 ${isToday ? 'text-white' : 'text-slate-200'}`}
                  style={isToday ? { backgroundColor: accentColor } : undefined}
                >
                  {d.getDate()}
                </span>
              </div>
            )
          })}
        </div>

        {/* Hele Dag row */}
        <div className="grid border-b border-slate-800" style={{ gridTemplateColumns: GRID_COLS }}>
          <div className="flex items-center justify-center text-slate-500 font-semibold bg-slate-900/50 border-r border-slate-700 text-[0.6rem] px-0.5 text-center leading-tight py-1">
            Dag
          </div>
          {weekDates.map((date, di) => {
            const cells = getCellRequests(date, 0)
            const isAbsent = absenceDays.includes(di)
            return (
              <div
                key={di}
                className={`relative p-1 min-h-[2rem] border-r border-slate-800/50 last:border-r-0 group ${isAbsent ? 'bg-slate-900/40' : ''}`}
                title={isAbsent ? 'TOA niet aanwezig op deze dag' : undefined}
              >
                {cells.map(({ request: r }) => (
                  <RequestBlock key={r.id} request={r} isFirst onClick={setSelected} />
                ))}
                <button
                  onClick={() => setModal({ date, period: 0 })}
                  className="absolute bottom-1 right-1 w-5 h-5 text-white rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  style={{ backgroundColor: accentColor }}
                  title="Hele dag aanvraag toevoegen"
                >
                  +
                </button>
              </div>
            )
          })}
        </div>

        {/* Period rows */}
        {PERIODS.map(period => (
          <div key={period} className="grid border-b border-slate-800/50 last:border-b-0" style={{ gridTemplateColumns: GRID_COLS }}>
            <div className="flex items-center justify-center text-slate-600 font-semibold bg-slate-900/50 border-r border-slate-700 text-[0.7rem]">
              {period}
            </div>
            {weekDates.map((date, di) => {
              const cells = getCellRequests(date, period)
              const isAbsent = absenceDays.includes(di)
              return (
                <div
                  key={di}
                  className={`relative p-1 min-h-[3.5rem] border-r border-slate-800/50 last:border-r-0 group ${
                    isAbsent ? 'bg-slate-900/40' : ''
                  }`}
                  title={isAbsent ? 'TOA niet aanwezig op deze dag' : undefined}
                >
                  {isAbsent && cells.length === 0 && (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-[0.04]"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)',
                        backgroundSize: '8px 8px',
                      }}
                    />
                  )}
                  {cells.map(({ request: r, isFirst }) => (
                    <RequestBlock key={r.id} request={r} isFirst={isFirst} onClick={setSelected} />
                  ))}
                  {/* Add button only shown when no continuations fill this cell */}
                  {!cells.some(c => !c.isFirst) && (
                    <button
                      onClick={() => setModal({ date, period })}
                      className="absolute bottom-1 right-1 w-5 h-5 text-white rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      style={{ backgroundColor: accentColor }}
                      title="Aanvraag toevoegen"
                    >
                      +
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2 flex-wrap items-center">
        {[
          { color: 'bg-slate-400', label: 'Aangevraagd' },
          { color: 'bg-green-500', label: 'Met TOA' },
          { color: 'bg-amber-500', label: 'Zonder TOA' },
          { color: 'bg-red-500', label: 'Afgekeurd' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1 text-xs text-slate-500">
            <div className={`w-2 h-2 rounded-sm ${color}`} />
            {label}
          </div>
        ))}
        {absenceDays.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span className="text-amber-400 text-[0.65rem]">✕</span>
            TOA afwezig
          </div>
        )}
      </div>

      {/* Modals */}
      {modal && (
        <RequestModal
          date={modal.date}
          period={modal.period}
          subject={subject}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
      {editing && (
        <RequestModal
          request={editing}
          date={new Date(editing.date)}
          period={editing.period}
          subject={editing.subject}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setSelected(null); load() }}
        />
      )}
      {selected && (
        <RequestDetailPanel
          request={selected}
          session={session}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null) }}
          onDeleted={() => { setSelected(null); load() }}
          onStatusChanged={() => { load(); setSelected(null) }}
        />
      )}
    </div>
  )
}
