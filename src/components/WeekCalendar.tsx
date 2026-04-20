'use client'
import React, { useState, useEffect, useCallback } from 'react'
import type { Session } from 'next-auth'
import { RequestWithUser, SubjectConfig } from '@/types'
import { getWeekDates, getWeekLabel, prevWeek, nextWeek, toDateString } from '@/lib/week'
import RequestBlock, { DEFAULT_STATUS_COLORS, DEFAULT_STATUS_LABELS } from './RequestBlock'
import RequestModal from './RequestModal'
import RequestDetailPanel from './RequestDetailPanel'
import { getPeriodStartTime, getBreakStartTime, type Break } from '@/lib/periodTimes'

const DAYS_SHORT = ['Maa', 'Din', 'Woe', 'Don', 'Vri']
const GRID_COLS = '2.5rem repeat(5, 1fr)'
const STATUS_KEYS = ['PENDING', 'APPROVED_WITH_TOA', 'APPROVED_WITHOUT_TOA', 'REJECTED'] as const

interface Props {
  subject: string | null
  session: Session
  subjectConfig?: SubjectConfig | null
  periodsPerDay?: number
}

export default function WeekCalendar({ subject, session, subjectConfig, periodsPerDay = 10 }: Props) {
  const PERIODS = Array.from({ length: periodsPerDay }, (_, i) => i + 1)
  const [currentDate, setCurrentDate] = useState(() => getWeekDates(new Date())[0])
  const [requests, setRequests] = useState([] as RequestWithUser[])
  const [modal, setModal] = useState(null as { date: Date; period: number } | null)
  const [editing, setEditing] = useState(null as RequestWithUser | null)
  const [selected, setSelected] = useState(null as RequestWithUser | null)
  const [subjectColorMap, setSubjectColorMap] = useState({} as Record<string, string>)
  const [statusColors, setStatusColors] = useState(DEFAULT_STATUS_COLORS)
  const [statusLabels, setStatusLabels] = useState(DEFAULT_STATUS_LABELS)
  const [periodStartTime, setPeriodStartTime] = useState('')
  const [periodDuration, setPeriodDuration]   = useState(50)
  const [calBreaks, setCalBreaks]             = useState<Break[]>([])

  const weekDates = getWeekDates(currentDate)
  const today = toDateString(new Date())
  const accentColor = subjectConfig?.accentColor ?? '#4f7cff'
  const absenceDays = subjectConfig?.absenceDays ?? []

  const load = useCallback(async () => {
    const dates = getWeekDates(currentDate)
    const params = new URLSearchParams({ weekStart: toDateString(dates[0]) })
    if (subject) params.set('subject', subject)
    const res = await fetch(`/api/requests?${params}`)
    if (res.ok) setRequests(await res.json())
  }, [currentDate, subject])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : {})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((d: any) => {
        if (d.statusColors) {
          setStatusColors({
            PENDING:              d.statusColors.PENDING              || DEFAULT_STATUS_COLORS.PENDING,
            APPROVED_WITH_TOA:    d.statusColors.APPROVED_WITH_TOA    || DEFAULT_STATUS_COLORS.APPROVED_WITH_TOA,
            APPROVED_WITHOUT_TOA: d.statusColors.APPROVED_WITHOUT_TOA || DEFAULT_STATUS_COLORS.APPROVED_WITHOUT_TOA,
            REJECTED:             d.statusColors.REJECTED             || DEFAULT_STATUS_COLORS.REJECTED,
          })
        }
        if (d.statusLabels) {
          setStatusLabels({
            PENDING:              d.statusLabels.PENDING              || DEFAULT_STATUS_LABELS.PENDING,
            APPROVED_WITH_TOA:    d.statusLabels.APPROVED_WITH_TOA    || DEFAULT_STATUS_LABELS.APPROVED_WITH_TOA,
            APPROVED_WITHOUT_TOA: d.statusLabels.APPROVED_WITHOUT_TOA || DEFAULT_STATUS_LABELS.APPROVED_WITHOUT_TOA,
            REJECTED:             d.statusLabels.REJECTED             || DEFAULT_STATUS_LABELS.REJECTED,
          })
        }
        if (d.periodStartTime) setPeriodStartTime(d.periodStartTime)
        if (d.periodDuration)  setPeriodDuration(d.periodDuration)
        if (Array.isArray(d.breaks)) setCalBreaks(d.breaks)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (subject !== null) return
    fetch('/api/subjects')
      .then(r => r.ok ? r.json() : [])
      .then((data: SubjectConfig[]) => {
        const map: Record<string, string> = {}
        data.forEach(s => { map[s.id] = s.accentColor })
        setSubjectColorMap(map)
      })
      .catch(() => {})
  }, [subject])

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
        <span className="font-bold text-slate-200 text-sm">{getWeekLabel(weekDates)}</span>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentDate(getWeekDates(new Date())[0])}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-600 text-slate-300 transition-colors"
          >
            Vandaag
          </button>
          <button
            onClick={() => setCurrentDate(d => getWeekDates(prevWeek(d))[0])}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-600 text-slate-300 transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrentDate(d => getWeekDates(nextWeek(d))[0])}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-600 text-slate-300 transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border border-slate-600 rounded-xl overflow-x-auto text-xs bg-slate-900">
        <div className="min-w-[560px]">

          {/* Day headers */}
          <div
            className="grid border-b-2 border-slate-600"
            style={{ gridTemplateColumns: GRID_COLS, backgroundColor: accentColor + '18' }}
          >
            {/* Corner */}
            <div className="border-r border-slate-600" />
            {weekDates.map((d, i) => {
              const isToday = toDateString(d) === today
              const isAbsent = absenceDays.includes(i)
              return (
                <div
                  key={i}
                  className={`py-2 px-1 text-center font-semibold text-slate-300 relative border-r border-slate-700 last:border-r-0 ${isAbsent ? 'opacity-60' : ''}`}
                  title={isAbsent ? 'TOA niet aanwezig' : undefined}
                >
                  {isAbsent && (
                    <span className="absolute top-1 right-1 text-[0.6rem] text-amber-400 font-bold" title="TOA niet aanwezig">
                      ✕
                    </span>
                  )}
                  <span className="text-slate-400">{DAYS_SHORT[i]}</span>{' '}
                  <span
                    className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full font-bold text-xs ${isToday ? '' : 'text-slate-200'}`}
                    style={isToday ? { backgroundColor: accentColor, color: '#fff' } : undefined}
                  >
                    {d.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Hele Dag row */}
          <div className="grid border-b-2 border-slate-600" style={{ gridTemplateColumns: GRID_COLS }}>
            <div className="flex items-center justify-center border-r border-slate-600 bg-slate-900/60 text-slate-500 font-bold text-[0.6rem] leading-tight text-center px-0.5 py-1">
              Hele<br />dag
            </div>
            {weekDates.map((date, di) => {
              const cells = getCellRequests(date, 0)
              const isAbsent = absenceDays.includes(di)
              return (
                <div
                  key={di}
                  className={`relative p-1 min-h-[2rem] border-r border-slate-700 last:border-r-0 group ${isAbsent ? 'bg-slate-900/30' : ''}`}
                  title={isAbsent ? 'TOA niet aanwezig op deze dag' : undefined}
                >
                  {cells.map(({ request: r }) => (
                    <RequestBlock
                      key={r.id}
                      request={r}
                      isFirst
                      onClick={setSelected}
                      accentColor={subjectColorMap[r.subject]}
                      statusColors={statusColors}
                    />
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
          {PERIODS.map(period => {
            const breakBefore = calBreaks.find(b => b.afterPeriod === period - 1)
            return (
              <React.Fragment key={period}>
                {breakBefore && (
                  <div
                    className="grid border-b border-slate-700"
                    style={{ gridTemplateColumns: GRID_COLS }}
                  >
                    <div className="flex items-center justify-center border-r border-slate-600 bg-slate-900/40 text-[0.5rem] text-slate-600 font-normal leading-tight text-center" style={{ minHeight: '1.5rem' }}>
                      {periodStartTime
                        ? getBreakStartTime(breakBefore.afterPeriod, periodStartTime, periodDuration, calBreaks)
                        : 'P'}
                    </div>
                    <div
                      className="col-span-5 flex items-center px-2"
                      style={{ minHeight: '1.5rem' }}
                    >
                      <span className="text-[0.6rem] text-slate-600 italic">
                        {breakBefore.label || 'Pauze'}
                      </span>
                    </div>
                  </div>
                )}
                <div
                  className="grid border-b border-slate-600 last:border-b-0"
                  style={{ gridTemplateColumns: GRID_COLS }}
                >
                  {/* Period number */}
                  <div className="flex flex-col items-center justify-center border-r border-slate-600 bg-slate-900/60 font-bold text-[0.7rem] min-h-[3.5rem]">
                    <span className="text-slate-400">{period}</span>
                    {periodStartTime && (
                      <span className="text-[0.55rem] text-slate-600 font-normal leading-tight">
                        {getPeriodStartTime(period, periodStartTime, periodDuration, calBreaks)}
                      </span>
                    )}
                  </div>

                  {weekDates.map((date, di) => {
                    const cells = getCellRequests(date, period)
                    const isAbsent = absenceDays.includes(di)
                    const sideBySide = subjectConfig?.overlapLayout === 'side-by-side'
                    return (
                      <div
                        key={di}
                        className={`relative p-1 min-h-[3.5rem] border-r border-slate-700 last:border-r-0 group ${
                          period % 2 === 0 ? 'bg-slate-900/20' : ''
                        } ${isAbsent ? 'bg-slate-900/40' : ''}`}
                        title={isAbsent ? 'TOA niet aanwezig op deze dag' : undefined}
                      >
                        {isAbsent && cells.length === 0 && (
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.025) 6px, rgba(255,255,255,0.025) 7px)',
                            }}
                          />
                        )}
                        <div className={`flex ${sideBySide && cells.length > 1 ? 'flex-row gap-0.5' : 'flex-col'}`}>
                          {cells.map(({ request: r, isFirst }) => (
                            <div key={r.id} className={sideBySide && cells.length > 1 ? 'flex-1 min-w-0' : undefined}>
                              <RequestBlock
                                request={r}
                                isFirst={isFirst}
                                onClick={setSelected}
                                accentColor={subjectColorMap[r.subject]}
                                statusColors={statusColors}
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setModal({ date, period })}
                          className="absolute bottom-1 right-1 w-5 h-5 text-white rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          style={{ backgroundColor: accentColor }}
                          title="Aanvraag toevoegen"
                        >
                          +
                        </button>
                      </div>
                    )
                  })}
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2.5 flex-wrap items-center">
        {STATUS_KEYS.map(s => (
          <div key={s} className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: statusColors[s] }} />
            {statusLabels[s]}
          </div>
        ))}
        {absenceDays.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-amber-400 text-[0.65rem] font-bold">✕</span>
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
          statusColors={statusColors}
          statusLabels={statusLabels}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null) }}
          onDeleted={() => { setSelected(null); load() }}
          onStatusChanged={() => { load(); setSelected(null) }}
        />
      )}
    </div>
  )
}
