'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Session } from 'next-auth'
import { Subject } from '@prisma/client'
import { RequestWithUser } from '@/types'
import { getWeekDates, getWeekLabel, prevWeek, nextWeek, toDateString } from '@/lib/week'
import RequestBlock from './RequestBlock'
import RequestModal from './RequestModal'
import RequestDetailPanel from './RequestDetailPanel'

const DAYS = ['Maa', 'Din', 'Woe', 'Don', 'Vri']
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

interface Props {
  subject: Subject | null
  session: Session
}

export default function WeekCalendar({ subject, session }: Props) {
  const [currentDate, setCurrentDate] = useState(() => getWeekDates(new Date())[0])
  const [requests, setRequests] = useState<RequestWithUser[]>([])
  const [modal, setModal] = useState<{ date: Date; period: number } | null>(null)
  const [editing, setEditing] = useState<RequestWithUser | null>(null)
  const [selected, setSelected] = useState<RequestWithUser | null>(null)

  const weekDates = getWeekDates(currentDate)
  const today = toDateString(new Date())

  const load = useCallback(async () => {
    const dates = getWeekDates(currentDate)
    const params = new URLSearchParams({ weekStart: toDateString(dates[0]) })
    if (subject) params.set('subject', subject)
    const res = await fetch(`/api/requests?${params}`)
    if (res.ok) setRequests(await res.json())
  }, [currentDate, subject])

  useEffect(() => { load() }, [load])

  function getCell(date: Date, period: number): RequestWithUser[] {
    const ds = toDateString(date)
    return requests.filter(r => r.date.startsWith(ds) && r.period === period)
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
        <div className="grid border-b-2 border-slate-600 bg-slate-900" style={{ gridTemplateColumns: '2rem repeat(5, 1fr)' }}>
          <div />
          {weekDates.map((d, i) => (
            <div key={i} className={`p-2 text-center font-semibold text-slate-400 ${toDateString(d) === today ? 'ring-2 ring-blue-500 ring-inset rounded' : ''}`}>
              {DAYS[i]} <span className={toDateString(d) === today ? 'bg-blue-600 text-white rounded-full px-1' : 'text-slate-200'}>{d.getDate()}</span>
            </div>
          ))}
        </div>

        {/* Period rows */}
        {PERIODS.map(period => (
          <div key={period} className="grid border-b border-slate-800/50 last:border-b-0" style={{ gridTemplateColumns: '2rem repeat(5, 1fr)' }}>
            <div className="flex items-center justify-center text-slate-600 font-semibold bg-slate-900/50 border-r border-slate-700 text-[0.7rem]">
              {period}
            </div>
            {weekDates.map((date, di) => {
              const cell = getCell(date, period)
              return (
                <div
                  key={di}
                  className="relative p-1 min-h-[3.5rem] border-r border-slate-800/50 last:border-r-0 group"
                >
                  {cell.map(r => (
                    <RequestBlock key={r.id} request={r} onClick={setSelected} />
                  ))}
                  {/* Add button */}
                  <button
                    onClick={() => setModal({ date, period })}
                    className="absolute bottom-1 right-1 w-5 h-5 bg-blue-800 hover:bg-blue-600 text-white rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Aanvraag toevoegen"
                  >
                    +
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2 flex-wrap">
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
