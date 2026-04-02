import {
  getWeekDates,
  getWeekLabel,
  prevWeek,
  nextWeek,
  toDateString,
  generateAbbreviation,
} from '@/lib/week'

describe('getWeekDates', () => {
  it('returns 5 dates starting on Monday', () => {
    const wednesday = new Date(2026, 2, 4) // Wed 4 March 2026
    const dates = getWeekDates(wednesday)
    expect(dates).toHaveLength(5)
    expect(dates[0].getDay()).toBe(1) // Monday
    expect(dates[4].getDay()).toBe(5) // Friday
  })

  it('returns correct Monday when given a Monday', () => {
    const monday = new Date(2026, 2, 2) // Mon 2 March 2026
    const dates = getWeekDates(monday)
    expect(toDateString(dates[0])).toBe('2026-03-02')
  })
})

describe('getWeekLabel', () => {
  it('formats week label in Dutch uppercase', () => {
    const dates = getWeekDates(new Date(2026, 2, 30)) // week of 30 March
    const label = getWeekLabel(dates)
    expect(label).toMatch(/30 MAART/)
    expect(label).toMatch(/2026/)
  })
})

describe('prevWeek / nextWeek', () => {
  it('moves 7 days back', () => {
    const d = new Date(2026, 2, 9)
    expect(toDateString(prevWeek(d))).toBe('2026-03-02')
  })
  it('moves 7 days forward', () => {
    const d = new Date(2026, 2, 2)
    expect(toDateString(nextWeek(d))).toBe('2026-03-09')
  })
})

describe('generateAbbreviation', () => {
  it('returns first 4 chars of email prefix lowercase', () => {
    expect(generateAbbreviation('BEEM@school.nl')).toBe('beem')
    expect(generateAbbreviation('jo@school.nl')).toBe('jo')
  })
})
