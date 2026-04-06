import { RequestWithUser } from '@/types'
import { Status } from '@prisma/client'

const STATUS_STYLES: Record<Status, string> = {
  PENDING:              'bg-slate-700 border-slate-400 text-slate-200',
  APPROVED_WITH_TOA:    'bg-green-950 border-green-500 text-green-100',
  APPROVED_WITHOUT_TOA: 'bg-amber-950 border-amber-500 text-amber-100',
  REJECTED:             'bg-red-950 border-red-500 text-red-100',
}

const ABBR_STYLES: Record<Status, string> = {
  PENDING:              'text-slate-400',
  APPROVED_WITH_TOA:    'text-green-400',
  APPROVED_WITHOUT_TOA: 'text-amber-400',
  REJECTED:             'text-red-400',
}

// Thin continuation bar colors for multi-period blocks
const CONT_STYLES: Record<Status, string> = {
  PENDING:              'bg-slate-600 border-slate-400',
  APPROVED_WITH_TOA:    'bg-green-900 border-green-500',
  APPROVED_WITHOUT_TOA: 'bg-amber-900 border-amber-500',
  REJECTED:             'bg-red-900 border-red-500',
}

interface Props {
  request: RequestWithUser
  isFirst: boolean
  onClick: (request: RequestWithUser) => void
  accentColor?: string
}

export default function RequestBlock({ request, isFirst, onClick, accentColor }: Props) {
  if (!isFirst) {
    return (
      <div
        onClick={() => onClick(request)}
        className={`border-l-[3px] rounded-sm px-1 py-0.5 cursor-pointer hover:brightness-125 transition-all mb-1 flex items-center gap-1 ${CONT_STYLES[request.status]}`}
        style={accentColor ? { borderLeftColor: accentColor } : undefined}
        title={`${request.klas ? request.klas + ' – ' : ''}${request.title} (vervolg)`}
      >
        <div className="w-1 h-1 rounded-full bg-current opacity-50" />
        <span className="text-[0.6rem] opacity-60 truncate">
          {request.klas ? `${request.klas} – ` : ''}{request.title}
        </span>
      </div>
    )
  }

  return (
    <div
      onClick={() => onClick(request)}
      className={`border-l-[3px] rounded px-1.5 py-1 cursor-pointer hover:brightness-125 transition-all mb-1 ${STATUS_STYLES[request.status]}`}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      <div className="font-semibold text-xs leading-tight line-clamp-2">
        {request.klas && !request.title.startsWith(request.klas) ? (
          <><span className="opacity-70">{request.klas}</span> – {request.title}</>
        ) : request.title}
      </div>
      <div className={`text-[0.65rem] mt-0.5 flex items-center gap-1 ${ABBR_STYLES[request.status]}`}>
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
