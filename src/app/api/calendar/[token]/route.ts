import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getPrisma } from '@/lib/school'
import { getPeriodStartTime } from '@/lib/periodTimes'
import type { Break } from '@/lib/periodTimes'

// Utility: format a Date + HH:MM time string to iCal DTSTART/DTEND (local time, no timezone)
function toICalDateTime(date: Date, timeHHMM: string): string {
  const y = date.getUTCFullYear()
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const [h, m] = timeHHMM.split(':')
  return `${y}${mo}${d}T${h.padStart(2, '0')}${m.padStart(2, '0')}00`
}

function toICalDate(date: Date): string {
  const y = date.getUTCFullYear()
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}${mo}${d}`
}

// iCal text folding: lines > 75 chars must be wrapped at 75 chars with CRLF + single space
function foldLine(line: string): string {
  const encoded = line
  if (encoded.length <= 75) return encoded
  let result = ''
  let remaining = encoded
  result += remaining.slice(0, 75)
  remaining = remaining.slice(75)
  while (remaining.length > 0) {
    result += '\r\n ' + remaining.slice(0, 74)
    remaining = remaining.slice(74)
  }
  return result
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

// Determine which schedule applies for a given date
function getScheduleForDate(
  date: Date,
  defaultStart: string,
  defaultDuration: number,
  defaultBreaks: Break[],
  exceptions: { periodStartTime: string; periodDuration: number; breaks: Break[]; weeks: string[] }[]
): { startTime: string; duration: number; breaks: Break[] } {
  const year = date.getUTCFullYear()
  // ISO week number
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfYear = Math.floor((date.getTime() - Date.UTC(year, 0, 1)) / 86400000) + 1
  const weekNum = Math.floor((dayOfYear - 1 + ((jan4.getUTCDay() || 7) - 1)) / 7) + 1
  const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`

  const match = exceptions.find(e => e.weeks.includes(weekKey))
  if (match) {
    return { startTime: match.periodStartTime, duration: match.periodDuration, breaks: match.breaks }
  }
  return { startTime: defaultStart, duration: defaultDuration, breaks: defaultBreaks }
}

function getAllSlugs(): string[] {
  try {
    const p = path.join(process.cwd(), 'schools.json')
    const schools = JSON.parse(fs.readFileSync(p, 'utf8'))
    return Object.keys(schools)
  } catch {
    return [process.env.DEFAULT_SCHOOL ?? '_env']
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params

  // Find which school this token belongs to
  let slug: string | null = null
  let userId: string | null = null
  let userIsTOA = false

  for (const s of getAllSlugs()) {
    const db = getPrisma(s)
    const user = await db.user.findFirst({
      where: { calendarToken: token },
      select: { id: true, isTOA: true, isAdmin: true },
    })
    if (user) {
      slug = s
      userId = user.id
      userIsTOA = user.isTOA || user.isAdmin
      break
    }
  }

  if (!slug || !userId) {
    return new NextResponse('Not found', { status: 404 })
  }

  const db = getPrisma(slug)
  const [settings, exceptions] = await Promise.all([
    db.appSettings.findUnique({ where: { id: 1 } }),
    db.exceptionSchedule.findMany(),
  ])

  const defaultStart = settings?.periodStartTime ?? '08:30'
  const defaultDuration = settings?.periodDuration ?? 50
  const defaultBreaks = (settings?.breaks as Break[] | null) ?? []

  const exceptionList = exceptions.map(e => ({
    periodStartTime: e.periodStartTime,
    periodDuration: e.periodDuration,
    breaks: (e.breaks as Break[] | null) ?? [],
    weeks: e.weeks,
  }))

  // Fetch requests: TOA sees all APPROVED_WITH_TOA, teachers see their own (non-rejected)
  const requests = await db.request.findMany({
    where: userIsTOA
      ? { status: 'APPROVED_WITH_TOA' }
      : { createdById: userId, status: { not: 'REJECTED' } },
    include: {
      createdBy: { select: { name: true, abbreviation: true } },
    },
    orderBy: [{ date: 'asc' }, { period: 'asc' }],
  })

  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const calName = userIsTOA ? 'TOA Planning' : 'Mijn Planning'

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TOA Planner//NL',
    `X-WR-CALNAME:${escapeText(calName)}`,
    'X-WR-TIMEZONE:Europe/Amsterdam',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const req of requests) {
    const date = new Date(req.date)
    const schedule = getScheduleForDate(date, defaultStart, defaultDuration, defaultBreaks, exceptionList)

    let dtStart: string
    let dtEnd: string

    if (req.period === 0) {
      // All-day entry
      dtStart = `${toICalDate(date)}`
      const nextDay = new Date(date)
      nextDay.setUTCDate(nextDay.getUTCDate() + 1)
      dtEnd = `${toICalDate(nextDay)}`

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${req.id}@toaplanner`)
      lines.push(`DTSTAMP:${now}`)
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`)
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`)
    } else {
      const startTime = getPeriodStartTime(req.period, schedule.startTime, schedule.duration, schedule.breaks)
      const endPeriod = req.periodEnd ?? req.period
      const endTimeRaw = getPeriodStartTime(endPeriod, schedule.startTime, schedule.duration, schedule.breaks)
      // End = start of last period + duration
      const [eh, em] = endTimeRaw.split(':').map(Number)
      const endMin = eh * 60 + em + schedule.duration
      const endTime = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`

      dtStart = toICalDateTime(date, startTime)
      dtEnd = toICalDateTime(date, endTime)

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${req.id}@toaplanner`)
      lines.push(`DTSTAMP:${now}`)
      lines.push(`DTSTART;TZID=Europe/Amsterdam:${dtStart}`)
      lines.push(`DTEND;TZID=Europe/Amsterdam:${dtEnd}`)
    }

    const summary = req.klas ? `${req.title} – ${req.klas}` : req.title
    lines.push(foldLine(`SUMMARY:${escapeText(summary)}`))

    if (req.classroom) {
      lines.push(foldLine(`LOCATION:${escapeText(req.classroom)}`))
    }

    const descParts: string[] = [`Vak: ${req.subject}`]
    if (req.createdBy) descParts.push(`Docent: ${req.createdBy.name}`)
    lines.push(foldLine(`DESCRIPTION:${escapeText(descParts.join('\\n'))}`))

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  const body = lines.join('\r\n') + '\r\n'

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="planning.ics"',
      'Cache-Control': 'no-cache',
    },
  })
}
