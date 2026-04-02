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

export function generateAbbreviation(email: string): string {
  return email.split('@')[0].slice(0, 4).toLowerCase()
}
