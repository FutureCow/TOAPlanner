export interface Break {
  afterPeriod: number
  duration: number
  label?: string
}

export function getPeriodStartTime(
  period: number,
  startTime: string,
  duration: number,
  breaks: Break[]
): string {
  const [h, m] = startTime.split(':').map(Number)
  let total = h * 60 + m + (period - 1) * duration
  for (const b of breaks) {
    if (b.afterPeriod < period) total += b.duration
  }
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function getBreakStartTime(
  afterPeriod: number,
  startTime: string,
  duration: number,
  breaks: Break[]
): string {
  const periodStart = getPeriodStartTime(afterPeriod, startTime, duration, breaks)
  const [h, m] = periodStart.split(':').map(Number)
  const total = h * 60 + m + duration
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export interface TimeSlot {
  key: string        // "period-1" | "break-2"
  startMin: number   // minutes since midnight
  endMin: number
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function buildTimeSlots(
  periods: number[],
  startTime: string,
  duration: number,
  breaks: Break[]
): TimeSlot[] {
  const slots: TimeSlot[] = []
  for (const p of periods) {
    const breakBefore = breaks.find(b => b.afterPeriod === p - 1)
    if (breakBefore) {
      const breakStartMin = timeToMinutes(getBreakStartTime(breakBefore.afterPeriod, startTime, duration, breaks))
      slots.push({
        key: `break-${breakBefore.afterPeriod}`,
        startMin: breakStartMin,
        endMin: breakStartMin + breakBefore.duration,
      })
    }
    const periodStartMin = timeToMinutes(getPeriodStartTime(p, startTime, duration, breaks))
    slots.push({
      key: `period-${p}`,
      startMin: periodStartMin,
      endMin: periodStartMin + duration,
    })
  }
  return slots
}
