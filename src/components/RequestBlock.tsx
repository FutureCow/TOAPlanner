import { RequestWithUser } from '@/types'

// Default colors per status (hex). Components receive these via statusColors prop.
export const DEFAULT_STATUS_COLORS = {
  PENDING:              '#64748b',
  APPROVED_WITH_TOA:    '#16a34a',
  APPROVED_WITHOUT_TOA: '#d97706',
  REJECTED:             '#dc2626',
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
  accentColor?: string
  statusColors?: typeof DEFAULT_STATUS_COLORS
}

export default function RequestBlock({ request, isFirst, onClick, accentColor, statusColors }: Props) {
  const colors = statusColors ?? DEFAULT_STATUS_COLORS
  const color = colors[request.status]
  const borderColor = accentColor ?? color

  if (!isFirst) {
    return (
      <div
        onClick={() => onClick(request)}
        className="border-l-[3px] rounded-sm px-1 py-0.5 cursor-pointer hover:brightness-125 transition-all mb-1 flex items-center gap-1"
        style={{ backgroundColor: color + '25', borderLeftColor: borderColor }}
        title={`${request.klas ? request.klas + ' – ' : ''}${request.title} (vervolg)`}
      >
        <div className="w-1 h-1 rounded-full bg-current opacity-50" />
        <span className="text-[0.6rem] opacity-60 truncate text-slate-200">
          {request.klas ? `${request.klas} – ` : ''}{request.title}
        </span>
      </div>
    )
  }

  return (
    <div
      onClick={() => onClick(request)}
      className="border-l-[3px] rounded px-1.5 py-1 cursor-pointer hover:brightness-125 transition-all mb-1"
      style={{ backgroundColor: color + '25', borderLeftColor: borderColor }}
    >
      <div className="font-semibold text-xs leading-tight line-clamp-2 text-slate-100">
        {request.klas && !request.title.startsWith(request.klas) ? (
          <><span className="opacity-70">{request.klas}</span> – {request.title}</>
        ) : request.title}
      </div>
      <div className="text-[0.65rem] mt-0.5 flex items-center gap-1" style={{ color }}>
        {request.periodEnd != null && (
          <span className="opacity-60 mr-0.5">
            {request.period}–{request.periodEnd}u
          </span>
        )}
        {request.classroom} · <strong>{request.createdBy?.abbreviation.toUpperCase() ?? '—'}</strong>
      </div>
    </div>
  )
}
