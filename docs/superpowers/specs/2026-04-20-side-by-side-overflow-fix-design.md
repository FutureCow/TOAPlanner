# Design: Side-by-side overflow fix

## Probleem

In side-by-side modus kunnen twee aanvragen naast elkaar de beschikbare kolomruimte overschrijden. Dit doet zich met name voor wanneer één blok een vervolg-blok (`isFirst=false`) is en het andere een nieuw volledig blok (`isFirst=true`). De flex-container heeft geen overflow-beperking, waardoor de blokken buiten de kolomgrenzen kunnen lopen.

## Oplossing

Voeg `overflow-hidden` toe aan de flex-container in de periodecel van `WeekCalendar`. Dit zorgt dat de blokken — ongeacht hun inhoud — altijd binnen de CSS-grid-kolom blijven.

## Wijziging

### `src/components/WeekCalendar.tsx` regel 262

Voor:
```tsx
<div className={`flex ${sideBySide && cells.length > 1 ? 'flex-row gap-0.5' : 'flex-col'}`}>
```

Na:
```tsx
<div className={`flex overflow-hidden ${sideBySide && cells.length > 1 ? 'flex-row gap-0.5' : 'flex-col'}`}>
```
