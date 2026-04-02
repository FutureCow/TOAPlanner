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

interface Props {
  request: RequestWithUser
  onClick: (request: RequestWithUser) => void
}

export default function RequestBlock({ request, onClick }: Props) {
  return (
    <div
      onClick={() => onClick(request)}
      className={`border-l-[3px] rounded px-1.5 py-1 cursor-pointer hover:brightness-125 transition-all mb-1 ${STATUS_STYLES[request.status]}`}
    >
      <div className="font-semibold text-xs leading-tight line-clamp-2">{request.title}</div>
      <div className={`text-[0.65rem] mt-0.5 ${ABBR_STYLES[request.status]}`}>
        {request.classroom} · <strong>{request.createdBy?.abbreviation.toUpperCase() ?? '—'}</strong>
      </div>
    </div>
  )
}
