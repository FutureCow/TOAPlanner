import { RequestWithUser } from '@/types'

// Default colors per status (hex) — Wong colorblind-safe palette.
// Kleuren verschillen in tint, helderheid én verzadiging zodat ze
// onderscheidbaar zijn voor mensen met rood-groen kleurenblindheid.
export const DEFAULT_STATUS_COLORS = {
  PENDING:              '#56B4E9',  // hemelsblauw  — wachten/neutraal
  APPROVED_WITH_TOA:    '#009E73',  // blauwgroen   — goedgekeurd
  APPROVED_WITHOUT_TOA: '#E69F00',  // oranje       — gedeeltelijk
  REJECTED:             '#D55E00',  // vermiljoen   — afgekeurd
}

export const DEFAULT_STATUS_LABELS = {
  PENDING:              'Aangevraagd',
  APPROVED_WITH_TOA:    'Goedgekeurd met TOA',
  APPROVED_WITHOUT_TOA: 'Zonder TOA',
  REJECTED:             'Afgekeurd',
}

interface Props {
  request: RequestWithUser
  isFirst: boolean
  onClick: (request: RequestWithUser) => void
  accentColor?: string   // vak-accentkleur (linker streep); valt terug op statuskleur
  statusColors?: typeof DEFAULT_STATUS_COLORS
}

export default function RequestBlock({ request, isFirst, onClick, accentColor, statusColors }: Props) {
  const colors = statusColors ?? DEFAULT_STATUS_COLORS
  const statusColor = colors[request.status]
  // De linker streep toont de vak-accentkleur zodat je per blok direct ziet
  // bij welk vak de aanvraag hoort. De achtergrond en meta-tekst gebruiken
  // de statuskleur zodat de status duidelijk leesbaar blijft.
  const borderColor = accentColor ?? statusColor

  // ── Vervolg-blok (periode >1 van een multi-periode aanvraag) ──────────
  if (!isFirst) {
    return (
      <div
        onClick={() => onClick(request)}
        className="border-l-[3px] rounded-sm px-1.5 py-0.5 cursor-pointer hover:brightness-125 transition-all mb-1 flex items-center gap-1.5"
        style={{
          backgroundColor: statusColor + '28',
          borderLeftColor: borderColor,
        }}
        title={`${request.klas ? request.klas + ' – ' : ''}${request.title} (vervolg)`}
      >
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor, opacity: 0.6 }} />
        <span className="text-[0.65rem] truncate text-slate-300 opacity-75">
          {request.klas ? `${request.klas} – ` : ''}{request.title}
        </span>
      </div>
    )
  }

  // ── Eerste blok ───────────────────────────────────────────────────────
  return (
    <div
      onClick={() => onClick(request)}
      className="border-l-[3px] rounded-[5px] px-1.5 py-1 cursor-pointer hover:brightness-125 transition-all mb-1"
      style={{
        backgroundColor: statusColor + '28',
        borderLeftColor: borderColor,
      }}
    >
      {/* Titel */}
      <div className="font-semibold text-xs leading-tight line-clamp-2 text-slate-100">
        {request.klas && !request.title.startsWith(request.klas) ? (
          <><span className="opacity-60">{request.klas}</span>{' – '}{request.title}</>
        ) : request.title}
      </div>

      {/* Meta: uren · lokaal · afkorting */}
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
    </div>
  )
}
