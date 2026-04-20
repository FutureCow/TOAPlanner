# Current Time Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable horizontal red line to the week calendar that shows the current time, accounting for configured period times, durations, and breaks.

**Architecture:** The toggle lives in NavBar (localStorage + custom window event). WeekCalendar listens for that event, builds a slot list from existing period-time utilities, measures row positions with a DOM ref, and renders a single absolute-positioned div as the line overlay.

**Tech Stack:** React (useState, useEffect, useRef), TypeScript, Tailwind CSS, localStorage, window CustomEvent

---

## File Map

| File | Change |
|------|--------|
| `src/lib/periodTimes.ts` | Add `timeToMinutes` and `buildTimeSlots` exports |
| `tests/lib/periodTimes.test.ts` | Add tests for the two new functions |
| `src/components/NavBar.tsx` | Add `showTimeLine` state + toggle button |
| `src/components/WeekCalendar.tsx` | Add timeline overlay (ref, listener, calculation, render) |

---

## Task 1: Add `timeToMinutes` and `buildTimeSlots` to `periodTimes.ts`

**Files:**
- Modify: `src/lib/periodTimes.ts`

These are pure functions with no side effects — test them before touching any UI.

- [ ] **Step 1: Add the two functions to `src/lib/periodTimes.ts`**

Append to the end of the file (after `getBreakStartTime`):

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/periodTimes.ts
git commit -m "feat: add timeToMinutes and buildTimeSlots to periodTimes"
```

---

## Task 2: Test `timeToMinutes` and `buildTimeSlots`

**Files:**
- Modify: `tests/lib/periodTimes.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/periodTimes.test.ts`:

```typescript
import { timeToMinutes, buildTimeSlots } from '@/lib/periodTimes'

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/lib/periodTimes.test.ts --passWithNoTests
```

Expected: FAIL — `timeToMinutes` and `buildTimeSlots` not found (if not yet added) or test errors.

If Task 1 is already done, expected: PASS. Skip to Step 4.

- [ ] **Step 3: Verify the new tests pass after Task 1**

```bash
npx jest tests/lib/periodTimes.test.ts
```

Expected: all tests PASS (including existing `getPeriodStartTime` tests).

- [ ] **Step 4: Commit**

```bash
git add tests/lib/periodTimes.test.ts
git commit -m "test: add tests for timeToMinutes and buildTimeSlots"
```

---

## Task 3: Add toggle button to NavBar

**Files:**
- Modify: `src/components/NavBar.tsx`

- [ ] **Step 1: Add `showTimeLine` state and toggle function**

In `src/components/NavBar.tsx`, after the `const [schoolLogo, ...]` line (line 27), add:

```typescript
const [showTimeLine, setShowTimeLine] = useState(false)
```

In the `useEffect` that reads localStorage (starting line 29), add inside it:

```typescript
const savedTimeLine = localStorage.getItem('show-timeline') === 'true'
setShowTimeLine(savedTimeLine)
```

After the `changeFont` function (after line 57), add:

```typescript
function toggleTimeLine() {
  const next = !showTimeLine
  setShowTimeLine(next)
  localStorage.setItem('show-timeline', String(next))
  window.dispatchEvent(new CustomEvent('timeline-changed', { detail: next }))
}
```

- [ ] **Step 2: Add the toggle button to the JSX**

In the right-side controls `<div className="flex items-center gap-2">`, add the following button directly after the theme toggle button (after the closing `</button>` of the theme toggle, before the user/logout button):

```tsx
{/* Timeline toggle */}
<button
  onClick={toggleTimeLine}
  title={showTimeLine ? 'Tijdlijn verbergen' : 'Tijdlijn tonen'}
  className={`w-7 h-7 flex items-center justify-center rounded bg-slate-800 transition-colors text-sm ${
    showTimeLine ? 'text-white' : 'text-slate-500 hover:text-white'
  }`}
>
  ◔
</button>
```

- [ ] **Step 3: Run existing tests to confirm nothing broke**

```bash
npx jest --passWithNoTests
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/NavBar.tsx
git commit -m "feat: add current time indicator toggle to NavBar"
```

---

## Task 4: Add time line overlay to WeekCalendar

**Files:**
- Modify: `src/components/WeekCalendar.tsx`

- [ ] **Step 1: Add imports and state**

In `src/components/WeekCalendar.tsx`, change the React import line (line 2) from:

```typescript
import React, { useState, useEffect, useCallback } from 'react'
```

to:

```typescript
import React, { useState, useEffect, useCallback, useRef } from 'react'
```

Replace the existing `periodTimes` import (line 9) with:

```typescript
import { getPeriodStartTime, getBreakStartTime, buildTimeSlots, timeToMinutes, type Break } from '@/lib/periodTimes'
```

Inside the component function, after the existing state declarations (after line 34), add:

```typescript
const [showTimeLine, setShowTimeLine] = useState(() => localStorage.getItem('show-timeline') === 'true')
const [lineY, setLineY] = useState<number | null>(null)
const periodGridRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 2: Add event listener and cleanup**

After the existing `useEffect` blocks, add a new one:

```typescript
useEffect(() => {
  function onTimelineChanged(e: Event) {
    setShowTimeLine((e as CustomEvent<boolean>).detail)
  }
  window.addEventListener('timeline-changed', onTimelineChanged)
  return () => window.removeEventListener('timeline-changed', onTimelineChanged)
}, [])
```

- [ ] **Step 3: Add position calculation effect**

Add this effect after the one from Step 2:

```typescript
useEffect(() => {
  if (!showTimeLine || !periodStartTime) {
    setLineY(null)
    return
  }

  function calculateLineY() {
    if (!periodGridRef.current || !periodStartTime) return

    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()

    const periods = Array.from({ length: periodsPerDay }, (_, i) => i + 1)
    const slots = buildTimeSlots(periods, periodStartTime, periodDuration, calBreaks)

    const containerHeight = periodGridRef.current.scrollHeight

    if (slots.length === 0) {
      setLineY(null)
      return
    }

    if (nowMin <= slots[0].startMin) {
      setLineY(0)
      return
    }

    if (nowMin >= slots[slots.length - 1].endMin) {
      setLineY(containerHeight)
      return
    }

    const slot = slots.find(s => nowMin >= s.startMin && nowMin < s.endMin)
    if (!slot) {
      setLineY(null)
      return
    }

    const el = periodGridRef.current.querySelector<HTMLElement>(`[data-row="${slot.key}"]`)
    if (!el) {
      setLineY(null)
      return
    }

    const fraction = (nowMin - slot.startMin) / (slot.endMin - slot.startMin)
    setLineY(el.offsetTop + fraction * el.offsetHeight)
  }

  calculateLineY()
  const interval = setInterval(calculateLineY, 30_000)
  return () => clearInterval(interval)
}, [showTimeLine, periodStartTime, periodDuration, calBreaks, periodsPerDay])
```

- [ ] **Step 4: Add `data-row` attributes to period and break rows**

In the `{PERIODS.map(period => ...)}` block, find the break row `<div>` (line 209) and add `data-row`:

```tsx
<div
  data-row={`break-${breakBefore.afterPeriod}`}
  className="grid border-b border-slate-700"
  style={{ gridTemplateColumns: GRID_COLS }}
>
```

Find the period row outer `<div>` (line 229) and add `data-row`:

```tsx
<div
  data-row={`period-${period}`}
  className="grid border-b border-slate-600 last:border-b-0"
  style={{ gridTemplateColumns: GRID_COLS }}
>
```

- [ ] **Step 5: Wrap period rows in a `position: relative` container with ref**

Find the comment `{/* Period rows */}` (line 203). Wrap the entire `{PERIODS.map(...)}` expression in a new div:

```tsx
{/* Period rows */}
<div ref={periodGridRef} className="relative">
  {PERIODS.map(period => {
    // ... existing content unchanged ...
  })}
</div>
```

- [ ] **Step 6: Render the line overlay**

Inside the `<div ref={periodGridRef} className="relative">` wrapper, after the `{PERIODS.map(...)}` expression, add:

```tsx
{showTimeLine && lineY !== null && (
  <div
    className="absolute pointer-events-none z-20"
    style={{ top: lineY, left: '2.5rem', right: 0 }}
  >
    <div className="h-0.5 bg-red-500 w-full" />
    <div className="absolute -left-1.5 -top-[3px] w-2.5 h-2.5 rounded-full bg-red-500" />
  </div>
)}
```

- [ ] **Step 7: Run tests**

```bash
npx jest --passWithNoTests
```

Expected: all tests PASS.

- [ ] **Step 8: Start dev server and verify visually**

```bash
npm run dev
```

Open the app and verify:
1. The clock toggle button (◔) appears in NavBar next to the theme toggle
2. Clicking it shows a red horizontal line across all 5 day columns at the correct time
3. The line is correctly positioned within the current period/break row (accounts for fractional position)
4. Clicking again hides the line
5. Refreshing the page restores the toggle state from localStorage
6. If current time is before the first period, line appears at the top
7. If current time is after the last period, line appears at the bottom

- [ ] **Step 9: Commit**

```bash
git add src/components/WeekCalendar.tsx
git commit -m "feat: add current time indicator overlay to week calendar"
```
