# Current Time Indicator — Design Spec

## Summary

A per-user toggleable horizontal line across the week calendar grid that shows the current time. The toggle is stored in `localStorage` and lives in the NavBar next to the theme/font controls. The line is a `position: absolute` overlay that updates every 30 seconds and accounts for the configured period times, durations, and breaks.

---

## Toggle (NavBar)

**File:** `src/components/NavBar.tsx`

- Add `showTimeLine: boolean` state, initialized from `localStorage.getItem('show-timeline') === 'true'`
- Add a clock icon button in the right controls bar, after the theme toggle button, matching the existing button style (`w-7 h-7`, `bg-slate-800`, `rounded`)
- Active state: full brightness; inactive: dimmed (`text-slate-500`)
- On click: toggle state, `localStorage.setItem('show-timeline', ...)`, dispatch `new CustomEvent('timeline-changed', { detail: nextValue })` on `window`
- The `storage` event does not fire in the same tab, so the custom event is required for immediate reactivity in WeekCalendar

---

## Time Line Overlay (WeekCalendar)

**File:** `src/components/WeekCalendar.tsx`

### State & sync

- Add `showTimeLine: boolean` state, initialized from `localStorage.getItem('show-timeline') === 'true'`
- On mount: `window.addEventListener('timeline-changed', handler)` — handler sets `showTimeLine` from `event.detail`
- Cleanup: remove event listener on unmount

### Row identification

Add a `data-row` attribute to each rendered row in the period grid:
- Period rows: `data-row="period-{n}"` (e.g. `data-row="period-1"`)
- Break rows: `data-row="break-{afterPeriod}"` (e.g. `data-row="break-2"`)

### Position calculation

Runs on mount and every 30 seconds via `setInterval`. Also re-runs when `showTimeLine` becomes true.

1. Get current time as minutes since midnight: `now = h * 60 + m`
2. Build a slot list using existing `getPeriodStartTime` and `getBreakStartTime` from `src/lib/periodTimes.ts`:
   ```
   slots = [
     { type: 'break', key: 'break-0', startMin, endMin },   // if break afterPeriod=0 exists
     { type: 'period', key: 'period-1', startMin, endMin },
     { type: 'break', key: 'break-1', startMin, endMin },   // if break afterPeriod=1 exists
     { type: 'period', key: 'period-2', startMin, endMin },
     ...
   ]
   ```
3. Find which slot `now` falls in. If none:
   - Before first slot: clamp to top of period grid (Y = 0)
   - After last slot: clamp to bottom of period grid (Y = containerHeight)
4. For the matched slot:
   - Query `containerRef.current.querySelector('[data-row="{key}"]')`
   - Use `element.offsetTop` (relative to the `position: relative` container) + fractional offset within the slot:
     ```
     fraction = (now - slot.startMin) / (slot.endMin - slot.startMin)
     y = element.offsetTop + fraction * element.offsetHeight
     ```
5. Store `lineY: number | null` in state

### Container setup

Wrap the period rows section (everything after the "Hele dag" row, inside `min-w-[560px]`) in a `position: relative` div with `ref={periodGridRef}`.

### Line element

Rendered inside the `position: relative` container when `showTimeLine && lineY !== null`:

```tsx
<div
  style={{ top: lineY, left: '2.5rem', right: 0 }}
  className="absolute h-0.5 bg-red-500 z-20 pointer-events-none"
>
  <div className="absolute -left-1.5 -top-1 w-2.5 h-2.5 rounded-full bg-red-500" />
</div>
```

- `left: 2.5rem` aligns with GRID_COLS (`'2.5rem repeat(5, 1fr)'`), skipping the time-label column
- `pointer-events: none` ensures the line does not intercept clicks on period cells

---

## localStorage Keys

| Key | Values | Purpose |
|-----|--------|---------|
| `show-timeline` | `'true'` / `'false'` | Per-user timeline toggle |

Existing keys (`theme`, `fontsize`) are unchanged.

---

## Edge Cases

| Situation | Behaviour |
|-----------|-----------|
| Current time before first period | Line at top of period grid (Y = 0) |
| Current time after last period | Line at bottom of period grid (Y = containerHeight) |
| Weekend / no period data loaded | `lineY = null`, line hidden |
| `periodStartTime` not yet loaded | `lineY = null`, line hidden until settings resolve |
| Component unmounts | `clearInterval` + `removeEventListener` |
