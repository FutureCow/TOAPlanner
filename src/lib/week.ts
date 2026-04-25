import { addDays, startOfWeek, format } from 'date-fns'
import { nl } from 'date-fns/locale'

export function getWeekDates(date: Date): Date[] {
  const monday = startOfWeek(date, { weekStartsOn: 1 })
  return Array.from({ length: 5 }, (_, i) => addDays(monday, i))
}

export function getWeekLabel(dates: Date[]): string {
  const start = dates[0]
  const end = dates[4]
  const startStr = format(start, 'd MMMM', { locale: nl }).toUpperCase()
  const endStr = format(end, 'd MMMM, yyyy', { locale: nl }).toUpperCase()
  return `${startStr} \u2013 ${endStr}`
}

export function prevWeek(date: Date): Date {
  return addDays(date, -7)
}

export function nextWeek(date: Date): Date {
  return addDays(date, 7)
}

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export type AbbreviationFormat = 'email' | 'firstname' | 'lastname' | 'initials' | 'firstlast'

export function generateAbbreviation(
  email: string,
  name?: string,
  format: AbbreviationFormat = 'email',
  length = 4,
): string {
  const clean = (s: string) => s.replace(/[^a-zA-Z]/g, '').toLowerCase()
  const cap = length

  if (format === 'email') {
    return clean(email.split('@')[0]).slice(0, cap) || email.slice(0, cap).toLowerCase()
  }

  const nameParts = (name ?? email.split('@')[0])
    .trim()
    .split(/[\s.]+/)
    .filter(Boolean)

  const first = nameParts[0] ?? ''
  const last  = nameParts[nameParts.length - 1] ?? ''

  switch (format) {
    case 'firstname':
      return clean(first).slice(0, cap) || clean(email.split('@')[0]).slice(0, cap)
    case 'lastname':
      return clean(last).slice(0, cap) || clean(email.split('@')[0]).slice(0, cap)
    case 'initials':
      return nameParts.map(p => clean(p)[0] ?? '').join('').slice(0, cap) || clean(email.split('@')[0]).slice(0, cap)
    case 'firstlast':
      return (clean(first).slice(0, 1) + clean(last).slice(0, cap - 1)).slice(0, cap) || clean(email.split('@')[0]).slice(0, cap)
    default:
      return clean(email.split('@')[0]).slice(0, cap)
  }
}
