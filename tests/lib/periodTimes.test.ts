import { getPeriodStartTime } from '@/lib/periodTimes'

describe('getPeriodStartTime', () => {
  it('berekent de starttijd van het eerste uur', () => {
    expect(getPeriodStartTime(1, '08:30', 50, [])).toBe('08:30')
  })

  it('telt de duur op voor elk volgend uur', () => {
    expect(getPeriodStartTime(2, '08:30', 50, [])).toBe('09:20')
    expect(getPeriodStartTime(3, '08:30', 50, [])).toBe('10:10')
  })

  it('telt pauzes mee die vóór het gevraagde uur vallen', () => {
    const breaks = [{ afterPeriod: 3, duration: 15 }]
    expect(getPeriodStartTime(4, '08:30', 50, breaks)).toBe('11:15')
  })

  it('telt pauzes NA het gevraagde uur niet mee', () => {
    const breaks = [{ afterPeriod: 3, duration: 15 }]
    expect(getPeriodStartTime(3, '08:30', 50, breaks)).toBe('10:10')
  })

  it('telt meerdere pauzes correct op', () => {
    const breaks = [
      { afterPeriod: 3, duration: 15 },
      { afterPeriod: 6, duration: 30 },
    ]
    expect(getPeriodStartTime(7, '08:30', 50, breaks)).toBe('14:15')
  })

  it('werkt correct over de klokovergang (uur >12)', () => {
    expect(getPeriodStartTime(5, '08:30', 50, [])).toBe('11:50')
  })
})
