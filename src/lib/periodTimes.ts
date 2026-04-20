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
