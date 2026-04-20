# Design: Volledige weergave bij side-by-side overlappende aanvragen

## Probleem

Bij side-by-side modus (`overlapLayout === 'side-by-side'`) kregen `isFirst`-blokken
`compact=true`, waardoor de titel werd afgekapt op 1 regel en de meta-info (uren, lokaal,
afkorting) verborgen bleef. Dit is ongewenst: het eerste blok van een aanvraag moet altijd
volledig zichtbaar zijn.

## Oplossing

De `compact` prop in `RequestBlock` wordt verwijderd. `isFirst=true` blokken tonen altijd
2-regelige titel en meta-info, ongeacht de lay-outinstelling. `isFirst=false` (vervolg-)blokken
hebben al hun eigen compacte rendering die ongewijzigd blijft.

## Wijzigingen

### `src/components/RequestBlock.tsx`
- Verwijder `compact?: boolean` uit de `Props` interface
- Verwijder `compact` uit de destructuring
- Verander `${compact ? 'truncate' : 'line-clamp-2'}` naar `line-clamp-2`
- Verander `{!compact && (<meta>)}` naar altijd de meta renderen

### `src/components/WeekCalendar.tsx`
- Verwijder `compact={sideBySide && cells.length > 1}` van de `RequestBlock` aanroep
