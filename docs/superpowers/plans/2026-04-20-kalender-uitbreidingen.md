# Kalender uitbreidingen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg drie nieuwe features toe aan de WeekCalendar: meerdere aanvragen naast elkaar (per agenda instelbaar), automatisch berekende starttijden per uur, en configureerbare pauzes als dunne scheidingsrijen.

**Architecture:** Nieuwe velden in AppSettings (periodStartTime, periodDuration, breaks) en SubjectConfig (overlapLayout) opgeslagen via Prisma. De admin UI in SettingsTab en SubjectCard krijgt nieuwe invoervelden. WeekCalendar berekent tijden client-side met een pure hulpfunctie en rendert pauzerijen en naast-elkaar layout op basis van de instellingen.

**Tech Stack:** Next.js 14, Prisma (PostgreSQL), React, Tailwind CSS, Jest (tests)

---

## Bestandsoverzicht

| Bestand | Wijziging |
|---------|-----------|
| `prisma/schema.prisma` | Nieuwe velden AppSettings + SubjectConfig |
| `src/app/api/admin/settings/route.ts` | PATCH: nieuwe velden doorzetten |
| `src/app/api/settings/route.ts` | GET: nieuwe velden meesturen |
| `src/app/api/admin/subjects/[id]/route.ts` | PATCH: overlapLayout doorzetten |
| `src/lib/periodTimes.ts` | Nieuw: pure hulpfunctie getPeriodStartTime |
| `src/components/RequestBlock.tsx` | Nieuwe `compact` prop |
| `src/components/WeekCalendar.tsx` | Tijden, pauzerijen, naast-elkaar layout |
| `src/components/admin/SettingsTab.tsx` | Uurindeling-sectie + overlap toggle in SubjectCard |
| `tests/api/admin-settings.test.ts` | Tests voor nieuwe velden |
| `tests/lib/periodTimes.test.ts` | Nieuw: unit tests hulpfunctie |

---

## Task 1: Prisma schema uitbreiden

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Stap 1: Voeg velden toe aan AppSettings en SubjectConfig**

Vervang het `AppSettings` model en het `SubjectConfig` model in `prisma/schema.prisma`:

```prisma
model SubjectConfig {
  id           String  @id
  name         String
  accentColor  String  @default("#2563eb")
  absenceDays  Int[]   @default([])
  sortOrder    Int     @default(0)
  overlapLayout String @default("stacked")
}

model AppSettings {
  id               Int     @id @default(1)
  registrationOpen Boolean @default(true)
  schoolLogo       String?
  periodsPerDay    Int     @default(10)
  statusLabels     Json?
  statusColors     Json?
  periodStartTime  String  @default("08:30")
  periodDuration   Int     @default(50)
  breaks           Json?
}
```

- [ ] **Stap 2: Maak de migratie aan**

```bash
npx prisma migrate dev --name add_period_times_and_overlap_layout
```

Verwacht: migratie bestand aangemaakt in `prisma/migrations/`, Prisma client opnieuw gegenereerd.

- [ ] **Stap 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: voeg periodStartTime, periodDuration, breaks en overlapLayout toe aan schema"
```

---

## Task 2: Hulpfunctie getPeriodStartTime

**Files:**
- Create: `src/lib/periodTimes.ts`
- Create: `tests/lib/periodTimes.test.ts`

- [ ] **Stap 1: Schrijf de falende test**

Maak `tests/lib/periodTimes.test.ts`:

```ts
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
    expect(getPeriodStartTime(7, '08:30', 50, breaks)).toBe('13:05')
  })

  it('werkt correct over de klokovergang (uur >12)', () => {
    expect(getPeriodStartTime(5, '08:30', 50, [])).toBe('11:50')
  })
})
```

- [ ] **Stap 2: Draai de test om te controleren dat hij faalt**

```bash
npx jest tests/lib/periodTimes.test.ts --no-coverage
```

Verwacht: FAIL — `Cannot find module '@/lib/periodTimes'`

- [ ] **Stap 3: Implementeer de hulpfunctie**

Maak `src/lib/periodTimes.ts`:

```ts
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
```

- [ ] **Stap 4: Draai de tests en controleer dat ze slagen**

```bash
npx jest tests/lib/periodTimes.test.ts --no-coverage
```

Verwacht: PASS — 6 tests geslaagd.

- [ ] **Stap 5: Commit**

```bash
git add src/lib/periodTimes.ts tests/lib/periodTimes.test.ts
git commit -m "feat: hulpfunctie getPeriodStartTime met pauze-ondersteuning"
```

---

## Task 3: API admin/settings uitbreiden

**Files:**
- Modify: `src/app/api/admin/settings/route.ts`
- Modify: `src/app/api/settings/route.ts`
- Modify: `tests/api/admin-settings.test.ts`

- [ ] **Stap 1: Voeg tests toe voor nieuwe velden**

Voeg onderaan `tests/api/admin-settings.test.ts` toe:

```ts
it('PATCH slaat periodStartTime en periodDuration op', async () => {
  ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(admin)
  ;(prisma.appSettings.upsert as jest.Mock).mockResolvedValue({
    id: 1, periodStartTime: '08:30', periodDuration: 50,
  })
  const res = await PATCH(new NextRequest('http://x', {
    method: 'PATCH',
    body: JSON.stringify({ periodStartTime: '08:30', periodDuration: 50 }),
  }))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(prisma.appSettings.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      update: expect.objectContaining({ periodStartTime: '08:30', periodDuration: 50 }),
    })
  )
})

it('PATCH slaat breaks op als JSON array', async () => {
  ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(admin)
  ;(prisma.appSettings.upsert as jest.Mock).mockResolvedValue({ id: 1 })
  const breaks = [{ afterPeriod: 3, duration: 15, label: 'Kleine pauze' }]
  const res = await PATCH(new NextRequest('http://x', {
    method: 'PATCH',
    body: JSON.stringify({ breaks }),
  }))
  expect(res.status).toBe(200)
  expect(prisma.appSettings.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      update: expect.objectContaining({ breaks }),
    })
  )
})
```

- [ ] **Stap 2: Draai om te controleren dat ze falen**

```bash
npx jest tests/api/admin-settings.test.ts --no-coverage
```

Verwacht: FAIL — nieuwe velden worden nog niet doorgezet.

- [ ] **Stap 3: Pas de PATCH handler aan**

In `src/app/api/admin/settings/route.ts`, voeg toe aan de `update`-opbouw:

```ts
if (body.periodStartTime !== undefined) update.periodStartTime = String(body.periodStartTime)
if (body.periodDuration  !== undefined) update.periodDuration  = Number(body.periodDuration)
if (body.breaks          !== undefined) update.breaks          = body.breaks
```

- [ ] **Stap 4: Pas de publieke GET aan**

In `src/app/api/settings/route.ts`, voeg de nieuwe velden toe aan de response:

```ts
return NextResponse.json({
  schoolLogo:      settings?.schoolLogo      ?? null,
  statusLabels:    settings?.statusLabels    ?? null,
  statusColors:    settings?.statusColors    ?? null,
  periodStartTime: settings?.periodStartTime ?? '08:30',
  periodDuration:  settings?.periodDuration  ?? 50,
  breaks:          settings?.breaks          ?? [],
})
```

- [ ] **Stap 5: Draai tests**

```bash
npx jest tests/api/admin-settings.test.ts --no-coverage
```

Verwacht: PASS.

- [ ] **Stap 6: Commit**

```bash
git add src/app/api/admin/settings/route.ts src/app/api/settings/route.ts tests/api/admin-settings.test.ts
git commit -m "feat: admin/settings API ondersteunt periodStartTime, periodDuration en breaks"
```

---

## Task 4: API admin/subjects uitbreiden

**Files:**
- Modify: `src/app/api/admin/subjects/[id]/route.ts`

- [ ] **Stap 1: Voeg overlapLayout toe aan de PATCH handler**

In `src/app/api/admin/subjects/[id]/route.ts`, pas de destructuring en de data-opbouw aan:

```ts
const { name, accentColor, absenceDays, overlapLayout } = await req.json()
const subject = await db.subjectConfig.update({
  where: { id: params.id },
  data: {
    ...(name         !== undefined ? { name }         : {}),
    ...(accentColor  !== undefined ? { accentColor }  : {}),
    ...(absenceDays  !== undefined ? { absenceDays }  : {}),
    ...(overlapLayout !== undefined ? { overlapLayout } : {}),
  },
})
```

- [ ] **Stap 2: Draai alle tests**

```bash
npx jest --no-coverage
```

Verwacht: alle bestaande tests PASS, geen regressies.

- [ ] **Stap 3: Commit**

```bash
git add src/app/api/admin/subjects/[id]/route.ts
git commit -m "feat: subjects PATCH ondersteunt overlapLayout"
```

---

## Task 5: Admin UI — uurindeling sectie in SettingsTab

**Files:**
- Modify: `src/components/admin/SettingsTab.tsx`

- [ ] **Stap 1: Voeg state toe**

Voeg onderaan de bestaande state-declaraties in `SettingsTab` toe (na `periodsSaved`):

```ts
const [periodStartTime, setPeriodStartTime] = useState('08:30')
const [periodDuration, setPeriodDuration]   = useState(50)
const [breaks, setBreaks]                   = useState<{ afterPeriod: number; duration: number; label: string }[]>([])
const [timingSaving, setTimingSaving]       = useState(false)
const [timingSaved, setTimingSaved]         = useState(false)
const [newBreakAfter, setNewBreakAfter]     = useState(1)
const [newBreakDuration, setNewBreakDuration] = useState(15)
const [newBreakLabel, setNewBreakLabel]     = useState('')
const [showBreakForm, setShowBreakForm]     = useState(false)
```

- [ ] **Stap 2: Laad de nieuwe velden in useEffect**

In het bestaande `fetch('/api/admin/settings')` blok, voeg toe na `setPeriodsPerDay(d.periodsPerDay ?? 10)`:

```ts
setPeriodStartTime(d.periodStartTime ?? '08:30')
setPeriodDuration(d.periodDuration ?? 50)
setBreaks(Array.isArray(d.breaks) ? d.breaks : [])
```

- [ ] **Stap 3: Voeg de saveTiming functie toe**

Voeg na `savePeriods` toe:

```ts
async function saveTiming() {
  setTimingSaving(true); setTimingSaved(false)
  await fetch('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ periodStartTime, periodDuration, breaks }),
  })
  setTimingSaving(false); setTimingSaved(true)
  setTimeout(() => setTimingSaved(false), 2000)
}

function addBreak() {
  setBreaks(prev => [...prev, { afterPeriod: newBreakAfter, duration: newBreakDuration, label: newBreakLabel }]
    .sort((a, b) => a.afterPeriod - b.afterPeriod))
  setShowBreakForm(false)
  setNewBreakLabel('')
}

function removeBreak(idx: number) {
  setBreaks(prev => prev.filter((_, i) => i !== idx))
}
```

- [ ] **Stap 4: Voeg de import toe bovenaan**

Voeg bovenaan het bestand toe (na bestaande imports):

```ts
import { getPeriodStartTime } from '@/lib/periodTimes'
```

- [ ] **Stap 5: Voeg de UI-sectie toe**

Voeg na de bestaande "Uren per dag" card (na het sluitende `</div>` van die card, vóór de sluitende `</div>` van de sectie "Algemeen") een nieuwe card toe:

```tsx
{/* Uurindeling */}
<div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-4">
  <div>
    <p className="font-semibold text-slate-200 text-sm mb-1">Uurindeling</p>
    <p className="text-xs text-slate-500 mb-3">
      Starttijd van het eerste uur en duur per uur. Pauzes worden automatisch meegenomen in de tijdberekening.
    </p>
    <div className="flex gap-3 items-end flex-wrap">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Starttijd eerste uur</label>
        <input
          type="time"
          value={periodStartTime}
          onChange={e => setPeriodStartTime(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Duur per uur (min)</label>
        <input
          type="number"
          min={10}
          max={120}
          value={periodDuration}
          onChange={e => setPeriodDuration(Number(e.target.value))}
          className="w-20 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        />
      </div>
      <button
        onClick={saveTiming}
        disabled={timingSaving}
        className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
          timingSaved ? 'bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white'
        }`}
      >
        {timingSaving ? 'Opslaan…' : timingSaved ? '✓ Opgeslagen' : 'Opslaan'}
      </button>
    </div>
  </div>

  {/* Live preview */}
  <div>
    <p className="text-xs text-slate-500 mb-1.5">Berekende tijden:</p>
    <div className="flex gap-2 flex-wrap">
      {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map(p => (
        <span key={p} className="text-xs text-slate-400 bg-slate-800 rounded px-2 py-0.5">
          <span className="font-semibold text-slate-300">{p}</span>
          {' → '}
          {getPeriodStartTime(p, periodStartTime, periodDuration, breaks)}
        </span>
      ))}
    </div>
  </div>

  {/* Pauzes */}
  <div>
    <p className="text-xs text-slate-400 font-semibold mb-2">Pauzes</p>
    {breaks.length === 0 && (
      <p className="text-xs text-slate-600 mb-2">Geen pauzes ingesteld.</p>
    )}
    <div className="space-y-1 mb-2">
      {breaks.map((b, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800 rounded px-2 py-1.5">
          <span>Na uur {b.afterPeriod} — {b.duration} min</span>
          {b.label && <span className="text-slate-500">({b.label})</span>}
          <button
            onClick={() => removeBreak(idx)}
            className="ml-auto text-slate-500 hover:text-red-400 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
    {showBreakForm ? (
      <div className="flex gap-2 items-end flex-wrap bg-slate-800 rounded p-2">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Na uur</label>
          <select
            value={newBreakAfter}
            onChange={e => setNewBreakAfter(Number(e.target.value))}
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none"
          >
            {Array.from({ length: periodsPerDay - 1 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Duur (min)</label>
          <input
            type="number"
            min={1}
            max={120}
            value={newBreakDuration}
            onChange={e => setNewBreakDuration(Number(e.target.value))}
            className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Label (optioneel)</label>
          <input
            value={newBreakLabel}
            onChange={e => setNewBreakLabel(e.target.value)}
            placeholder="Kleine pauze"
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none w-32"
          />
        </div>
        <button
          onClick={addBreak}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
        >
          Toevoegen
        </button>
        <button
          onClick={() => setShowBreakForm(false)}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
        >
          Annuleren
        </button>
      </div>
    ) : (
      <button
        onClick={() => setShowBreakForm(true)}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        + Pauze toevoegen
      </button>
    )}
  </div>
</div>
```

- [ ] **Stap 6: Controleer TypeScript compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 7: Commit**

```bash
git add src/components/admin/SettingsTab.tsx
git commit -m "feat: uurindeling sectie in admin — starttijd, duur en pauzes"
```

---

## Task 6: Admin UI — overlap toggle in SubjectCard

**Files:**
- Modify: `src/components/admin/SettingsTab.tsx`

- [ ] **Stap 1: Voeg overlapLayout state toe aan SubjectCard**

In `SubjectCard` component, voeg toe na de bestaande `useState` declaraties:

```ts
const [overlapLayout, setOverlapLayout] = useState<'stacked' | 'side-by-side'>(
  (subject.overlapLayout as 'stacked' | 'side-by-side') ?? 'stacked'
)
```

- [ ] **Stap 2: Stuur overlapLayout mee bij opslaan**

In de `handleSave` functie van `SubjectCard`, voeg `overlapLayout` toe aan de body:

```ts
body: JSON.stringify({ name: name.trim(), accentColor: color, absenceDays: absence, overlapLayout }),
```

- [ ] **Stap 3: Voeg de toggle toe aan de SubjectCard UI**

Voeg na de bestaande afwezigheid-dagknoppen (na de `</div>` die de afwezigheidssectie sluit, vóór de error/success-feedback) toe:

```tsx
<div>
  <label className="block text-xs text-slate-400 mb-1.5">Lay-out bij meerdere aanvragen</label>
  <div className="flex gap-2">
    {(['stacked', 'side-by-side'] as const).map(val => (
      <button
        key={val}
        onClick={() => setOverlapLayout(val)}
        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
          overlapLayout === val
            ? 'bg-blue-600 border-blue-500 text-white'
            : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200'
        }`}
      >
        {val === 'stacked' ? 'Onder elkaar' : 'Naast elkaar'}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Stap 4: Controleer TypeScript compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 5: Commit**

```bash
git add src/components/admin/SettingsTab.tsx
git commit -m "feat: overlap layout toggle per agenda in SubjectCard"
```

---

## Task 7: RequestBlock compact prop

**Files:**
- Modify: `src/components/RequestBlock.tsx`

- [ ] **Stap 1: Voeg compact prop toe**

Pas de `Props` interface en de component aan in `src/components/RequestBlock.tsx`:

```ts
interface Props {
  request: RequestWithUser
  isFirst: boolean
  onClick: (request: RequestWithUser) => void
  accentColor?: string
  statusColors?: typeof DEFAULT_STATUS_COLORS
  compact?: boolean
}

export default function RequestBlock({ request, isFirst, onClick, accentColor, statusColors, compact }: Props) {
```

- [ ] **Stap 2: Pas de eerste-blok render aan**

Vervang in het eerste blok (`// ── Eerste blok`) de titel-div en meta-div:

```tsx
{/* Titel */}
<div className={`font-semibold text-xs leading-tight text-slate-100 ${compact ? 'truncate' : 'line-clamp-2'}`}>
  {request.klas && !request.title.startsWith(request.klas) ? (
    <><span className="opacity-60">{request.klas}</span>{' – '}{request.title}</>
  ) : request.title}
</div>

{/* Meta: uren · lokaal · afkorting */}
{!compact && (
  <div
    className="text-[0.65rem] mt-0.5 flex items-center gap-1 truncate"
    style={{ color: statusColor }}
  >
    {request.periodEnd != null && (
      <span className="opacity-70 mr-0.5 flex-shrink-0">
        {request.period}–{request.periodEnd}u
      </span>
    )}
    <span className="truncate">
      {request.classroom}
      {' · '}
      <strong>{request.createdBy?.abbreviation.toUpperCase() ?? '—'}</strong>
    </span>
  </div>
)}
```

- [ ] **Stap 3: Controleer TypeScript compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 4: Commit**

```bash
git add src/components/RequestBlock.tsx
git commit -m "feat: RequestBlock krijgt compact prop voor naast-elkaar weergave"
```

---

## Task 8: WeekCalendar — tijden, pauzerijen en naast-elkaar layout

**Files:**
- Modify: `src/components/WeekCalendar.tsx`

- [ ] **Stap 1: Voeg imports en state toe**

Voeg bovenaan `src/components/WeekCalendar.tsx` toe na de bestaande imports:

```ts
import { getPeriodStartTime, type Break } from '@/lib/periodTimes'
```

Voeg toe in de component-body, na de bestaande `useState` declaraties:

```ts
const [periodStartTime, setPeriodStartTime] = useState('')
const [periodDuration, setPeriodDuration]   = useState(50)
const [calBreaks, setCalBreaks]             = useState<Break[]>([])
```

- [ ] **Stap 2: Laad de nieuwe velden in het bestaande settings useEffect**

In het bestaande `fetch('/api/settings')` blok, voeg toe na `setStatusLabels`:

```ts
if (d.periodStartTime) setPeriodStartTime(d.periodStartTime)
if (d.periodDuration)  setPeriodDuration(d.periodDuration)
if (Array.isArray(d.breaks)) setCalBreaks(d.breaks)
```

- [ ] **Stap 3: Pas het urnummer-cel aan**

Vervang in de period rows-sectie (regel ~207) de bestaande urnummer-cel:

```tsx
{/* Period number */}
<div className="flex flex-col items-center justify-center border-r border-slate-600 bg-slate-900/60 font-bold text-[0.7rem] min-h-[3.5rem]">
  <span className="text-slate-400">{period}</span>
  {periodStartTime && (
    <span className="text-[0.55rem] text-slate-600 font-normal leading-tight">
      {getPeriodStartTime(period, periodStartTime, periodDuration, calBreaks)}
    </span>
  )}
</div>
```

- [ ] **Stap 4: Voeg pauzerijen toe**

Vervang in de period rows-sectie het `{PERIODS.map(period => (` blok zodat pauzes worden ingevoegd. Vervang het volledige `{/* Period rows */}` blok:

```tsx
{/* Period rows */}
{PERIODS.map(period => {
  const breakBefore = calBreaks.find(b => b.afterPeriod === period - 1)
  return (
    <React.Fragment key={period}>
      {breakBefore && (
        <div
          className="grid border-b border-slate-700"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <div className="flex items-center justify-center border-r border-slate-600 bg-slate-900/40 text-[0.55rem] text-slate-600 font-bold" style={{ minHeight: '1.5rem' }}>
            P
          </div>
          <div
            className="col-span-5 flex items-center px-2"
            style={{ minHeight: '1.5rem' }}
          >
            <span className="text-[0.6rem] text-slate-600 italic">
              {breakBefore.label ? `${breakBefore.label} — ` : 'Pauze — '}{breakBefore.duration} min
            </span>
          </div>
        </div>
      )}
      <div
        className="grid border-b border-slate-600 last:border-b-0"
        style={{ gridTemplateColumns: GRID_COLS }}
      >
        {/* Period number */}
        <div className="flex flex-col items-center justify-center border-r border-slate-600 bg-slate-900/60 font-bold text-[0.7rem] min-h-[3.5rem]">
          <span className="text-slate-400">{period}</span>
          {periodStartTime && (
            <span className="text-[0.55rem] text-slate-600 font-normal leading-tight">
              {getPeriodStartTime(period, periodStartTime, periodDuration, calBreaks)}
            </span>
          )}
        </div>

        {weekDates.map((date, di) => {
          const cells = getCellRequests(date, period)
          const isAbsent = absenceDays.includes(di)
          const sideBySide = subjectConfig?.overlapLayout === 'side-by-side'
          return (
            <div
              key={di}
              className={`relative p-1 min-h-[3.5rem] border-r border-slate-700 last:border-r-0 group ${
                period % 2 === 0 ? 'bg-slate-900/20' : ''
              } ${isAbsent ? 'bg-slate-900/40' : ''}`}
              title={isAbsent ? 'TOA niet aanwezig op deze dag' : undefined}
            >
              {isAbsent && cells.length === 0 && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.025) 6px, rgba(255,255,255,0.025) 7px)',
                  }}
                />
              )}
              <div className={`flex ${sideBySide && cells.length > 1 ? 'flex-row gap-0.5' : 'flex-col'}`}>
                {cells.map(({ request: r, isFirst }) => (
                  <div key={r.id} className={sideBySide && cells.length > 1 ? 'flex-1 min-w-0' : undefined}>
                    <RequestBlock
                      request={r}
                      isFirst={isFirst}
                      onClick={setSelected}
                      accentColor={subjectColorMap[r.subject]}
                      statusColors={statusColors}
                      compact={sideBySide && cells.length > 1}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => setModal({ date, period })}
                className="absolute bottom-1 right-1 w-5 h-5 text-white rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                style={{ backgroundColor: accentColor }}
                title="Aanvraag toevoegen"
              >
                +
              </button>
            </div>
          )
        })}
      </div>
    </React.Fragment>
  )
})}
```

- [ ] **Stap 5: Voeg React import toe indien ontbreekt**

Controleer bovenaan `WeekCalendar.tsx` of `React` geïmporteerd is. Zo niet, vervang:

```ts
import React, { useState, useEffect, useCallback } from 'react'
```

(Dit staat al in het bestand op regel 1 — geen actie nodig als dat zo is.)

- [ ] **Stap 6: Controleer TypeScript compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 7: Draai alle tests**

```bash
npx jest --no-coverage
```

Verwacht: alle tests PASS.

- [ ] **Stap 8: Commit**

```bash
git add src/components/WeekCalendar.tsx
git commit -m "feat: WeekCalendar toont starttijden, pauzerijen en naast-elkaar layout"
```

---

## Task 9: Handmatige verificatie

- [ ] **Stap 1: Start de dev server**

```bash
npm run dev
```

- [ ] **Stap 2: Controleer admin uurindeling**
  - Ga naar admin → instellingen
  - Stel starttijd in op `08:30`, duur op `50`
  - Controleer dat de live preview klopt: uur 1 → 08:30, uur 2 → 09:20, uur 3 → 10:10
  - Voeg een pauze toe: na uur 3, 15 minuten
  - Controleer dat uur 4 nu → 11:15 toont
  - Sla op

- [ ] **Stap 3: Controleer kalender tijden**
  - Open de kalender
  - Controleer dat onder elk urnummer de starttijd klein wordt weergegeven
  - Controleer dat de pauzerij zichtbaar is tussen uur 3 en 4

- [ ] **Stap 4: Controleer overlap toggle**
  - Ga naar admin → een agenda → zet "Naast elkaar" aan → sla op
  - Maak twee aanvragen op hetzelfde uur en dezelfde dag
  - Controleer dat ze naast elkaar staan in de kalender
  - Zet terug op "Onder elkaar" → controleer dat ze weer gestapeld staan

- [ ] **Stap 5: Sluit af**

```bash
git log --oneline -8
```

Verwacht: alle commits van dit plan zijn zichtbaar.
