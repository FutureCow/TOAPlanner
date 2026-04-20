import { getPeriodStartTime, timeToMinutes, buildTimeSlots } from '@/lib/periodTimes'

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

  it('berekent tijden na het middaguur correct', () => {
    expect(getPeriodStartTime(5, '08:30', 50, [])).toBe('11:50')
    expect(getPeriodStartTime(20, '08:30', 50, [])).toBe('00:20')
  })
})

describe('timeToMinutes', () => {
  it('converteert "08:30" naar 510', () => {
    expect(timeToMinutes('08:30')).toBe(510)
  })

  it('converteert "00:00" naar 0', () => {
    expect(timeToMinutes('00:00')).toBe(0)
  })

  it('converteert "13:05" naar 785', () => {
    expect(timeToMinutes('13:05')).toBe(785)
  })
})

describe('buildTimeSlots', () => {
  it('bouwt slots voor 3 periodes zonder pauzes', () => {
    const slots = buildTimeSlots([1, 2, 3], '08:30', 50, [])
    expect(slots).toEqual([
      { key: 'period-1', startMin: 510, endMin: 560 },
      { key: 'period-2', startMin: 560, endMin: 610 },
      { key: 'period-3', startMin: 610, endMin: 660 },
    ])
  })

  it('voegt een pauze-slot in na periode 2', () => {
    const breaks = [{ afterPeriod: 2, duration: 15 }]
    const slots = buildTimeSlots([1, 2, 3], '08:30', 50, breaks)
    expect(slots).toEqual([
      { key: 'period-1', startMin: 510, endMin: 560 },
      { key: 'period-2', startMin: 560, endMin: 610 },
      { key: 'break-2',  startMin: 610, endMin: 625 },
      { key: 'period-3', startMin: 625, endMin: 675 },
    ])
  })

  it('voegt een pauze-slot in vóór periode 1 (afterPeriod=0)', () => {
    const breaks = [{ afterPeriod: 0, duration: 10 }]
    const slots = buildTimeSlots([1, 2], '08:30', 50, breaks)
    expect(slots).toEqual([
      { key: 'break-0',  startMin: 510, endMin: 520 },
      { key: 'period-1', startMin: 520, endMin: 570 },
      { key: 'period-2', startMin: 570, endMin: 620 },
    ])
  })
})
