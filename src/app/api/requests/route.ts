import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'

const INCLUDE_USER = {
  createdBy: { select: { id: true, name: true, abbreviation: true } },
}

export async function GET(req: NextRequest) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('weekStart')
  const subject = searchParams.get('subject')

  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })

  const start = new Date(weekStart + 'T00:00:00.000Z')
  const end = new Date(start)
  end.setDate(end.getDate() + 5)

  const db = getPrisma(slug)
  const requests = await db.request.findMany({
    where: {
      date: { gte: start, lt: end },
      ...(subject ? { subject } : {}),
    },
    include: INCLUDE_USER,
    orderBy: [{ date: 'asc' }, { period: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(requests)
}

export async function POST(req: NextRequest) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, klas, classroom, date, period, periodEnd, subject, recurringGroupId } = body

  if (!title || (Number(period) !== 0 && !classroom) || !date || period === undefined || !subject) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = getPrisma(slug)
  const request = await db.request.create({
    data: {
      title,
      klas: klas ?? '',
      classroom: classroom ?? '',
      date: new Date(date + 'T00:00:00.000Z'),
      period: Number(period),
      periodEnd: periodEnd != null && Number(periodEnd) !== Number(period) ? Number(periodEnd) : null,
      recurringGroupId: recurringGroupId ?? null,
      subject,
      createdById: session.user.id,
    },
    include: INCLUDE_USER,
  })

  return NextResponse.json(request, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { recurringGroupId, title, klas, classroom, period, periodEnd, subject, status } = body
  if (!recurringGroupId) return NextResponse.json({ error: 'recurringGroupId required' }, { status: 400 })

  const isTOAOrAdmin = session.user.isTOA || session.user.isAdmin
  const where = isTOAOrAdmin
    ? { recurringGroupId }
    : { recurringGroupId, createdById: session.user.id }

  const db = getPrisma(slug)
  const result = await db.request.updateMany({
    where,
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(klas !== undefined ? { klas } : {}),
      ...(classroom !== undefined ? { classroom } : {}),
      ...(period !== undefined ? { period: Number(period) } : {}),
      ...(periodEnd !== undefined ? { periodEnd: periodEnd != null ? Number(periodEnd) : null } : {}),
      ...(subject !== undefined ? { subject } : {}),
      ...(status !== undefined && isTOAOrAdmin ? { status } : {}),
    },
  })
  return NextResponse.json({ updated: result.count })
}

export async function DELETE(req: NextRequest) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recurringGroupId } = await req.json()
  if (!recurringGroupId) return NextResponse.json({ error: 'recurringGroupId required' }, { status: 400 })

  const where = session.user.isTOA || session.user.isAdmin
    ? { recurringGroupId }
    : { recurringGroupId, createdById: session.user.id }

  const db = getPrisma(slug)
  const result = await db.request.deleteMany({ where })
  return NextResponse.json({ deleted: result.count })
}
