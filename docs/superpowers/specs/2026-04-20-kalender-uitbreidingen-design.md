# Kalender uitbreidingen — Ontwerp

**Datum:** 2026-04-20

## Samenvatting

Drie nieuwe features voor de WeekCalendar en admin-instellingen:

1. **Overlap layout per agenda** — meerdere aanvragen op hetzelfde uur naast elkaar of onder elkaar
2. **Uurstarttijden** — automatisch berekende starttijden zichtbaar onder elk urnummer
3. **Pauzes** — configureerbare onderbrekingen tussen uren, zichtbaar als dunne rij in de kalender

---

## 1. Datamodel

### AppSettings (uitbreiding)

Nieuwe velden via Prisma-migratie:

| Veld | Type | Default | Omschrijving |
|------|------|---------|--------------|
| `periodStartTime` | `String` | `"08:30"` | Begintijd van het eerste uur |
| `periodDuration` | `Int` | `50` | Duur van elk uur in minuten |
| `breaks` | `Json?` | `null` | Array van pauze-objecten (zie hieronder) |

**Pauze-object:**
```ts
{ afterPeriod: number; duration: number; label?: string }
```
Voorbeeld: `[{ afterPeriod: 3, duration: 15, label: "Kleine pauze" }, { afterPeriod: 6, duration: 30, label: "Middagpauze" }]`

### SubjectConfig (uitbreiding)

| Veld | Type | Default | Omschrijving |
|------|------|---------|--------------|
| `overlapLayout` | `String` | `"stacked"` | `"stacked"` of `"side-by-side"` |

---

## 2. API

### `/api/admin/settings` PATCH

Breidt de bestaande handler uit met drie nieuwe velden:

```ts
if (body.periodStartTime !== undefined) update.periodStartTime = body.periodStartTime
if (body.periodDuration  !== undefined) update.periodDuration  = Number(body.periodDuration)
if (body.breaks          !== undefined) update.breaks          = body.breaks
```

### `/api/admin/subjects/:id` PATCH

Breidt de bestaande handler uit:

```ts
if (body.overlapLayout !== undefined) update.overlapLayout = body.overlapLayout
```

### `/api/settings` GET (publiek, gebruikt door WeekCalendar)

Stuurt de nieuwe velden mee in de bestaande response zodat WeekCalendar ze kan laden.

---

## 3. Admin UI — SettingsTab

### Sectie "Uurindeling"

Geplaatst naast/onder de bestaande "Uren per dag" instelling.

**Invoervelden:**
- Starttijd eerste uur (tekst `HH:MM`, gevalideerd)
- Duur per uur in minuten (getal, min 10)

**Pauzes:**
- Lijst van ingestelde pauzes: "Na uur X — Y min — [label]" met verwijderknop
- Knop "Pauze toevoegen" toont een inline formulier: na welk uur (select 1–periodsPerDay-1), duur in minuten, optioneel label
- Pauzes worden opgeslagen als JSON-array in `AppSettings.breaks`

**Live preview:**
- Onder de invoervelden staat een compacte lijst: "Uur 1 → 08:30 | Uur 2 → 09:20 | …" die live meebeweegt bij elke wijziging (berekend in de browser, niet opgeslagen)

### SubjectCard

Nieuwe toggle per agenda (onder de bestaande kleurkiezer):

> **Lay-out bij meerdere aanvragen**
> ○ Onder elkaar (standaard) ● Naast elkaar

Sla op via de bestaande "Opslaan"-knop van de SubjectCard.

---

## 4. WeekCalendar — rendering

### Hulpfunctie `getPeriodStartTime`

```ts
function getPeriodStartTime(
  period: number,
  startTime: string,   // "HH:MM"
  duration: number,    // minuten
  breaks: { afterPeriod: number; duration: number }[]
): string {
  const [h, m] = startTime.split(':').map(Number)
  let total = h * 60 + m + (period - 1) * duration
  for (const b of breaks) {
    if (b.afterPeriod < period) total += b.duration
  }
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
```

### Urnummer-kolom

De linkercel van elke perioderij toont:
```
  3
08:30  ← klein, grijs
```
Alleen zichtbaar als `periodStartTime` geconfigureerd is (niet leeg/null).

### Pauzerijen

Bij het renderen van `PERIODS.map(period => ...)` wordt vóór elke rij gecontroleerd of `breaks` een pauze heeft met `afterPeriod === period - 1`. Zo ja, wordt een extra rij ingevoegd:

- Hoogte: `~1.5rem`
- Linkercel: subtiel "P" of pauze-icoon
- Resterende cellen: label (bijv. "Pauze — 15 min") in `text-slate-500 italic text-xs`
- Geen klikbare interactie, `pointer-events-none`
- Rand: `border-b border-slate-700`

### Naast-elkaar layout

In de cel van een perioderij:

```tsx
// huidig (stacked)
<div className="flex flex-col gap-0.5">
  {cells.map(...)}
</div>

// nieuw (side-by-side)
<div className={`flex ${isSideBySide ? 'flex-row' : 'flex-col'} gap-0.5`}>
  {cells.map(...)}  {/* elke RequestBlock krijgt flex:1 bij side-by-side */}
</div>
```

`isSideBySide` = `subjectConfig?.overlapLayout === 'side-by-side'` óf (bij de algemene kalender zonder subject) altijd `"stacked"`.

Bij side-by-side wordt de tekst in `RequestBlock` ingekort met `truncate` omdat de breedte beperkt is.

---

## 5. RequestBlock aanpassing

`RequestBlock` krijgt een optionele prop `compact?: boolean`. Als `true`:
- Naam wordt afgekapt met `truncate`
- Secundaire informatie (klas, lokaal) wordt weggelaten of ook afgekapt

---

## 6. Volgorde van implementatie

1. Prisma-migratie (nieuwe velden)
2. API-uitbreidingen (`/api/admin/settings` + `/api/admin/subjects/:id` + `/api/settings`)
3. Admin UI — uurindeling sectie in SettingsTab
4. Admin UI — overlap toggle in SubjectCard
5. WeekCalendar — `getPeriodStartTime` hulpfunctie + starttijden in uurkolom
6. WeekCalendar — pauzerijen
7. WeekCalendar + RequestBlock — naast-elkaar layout
