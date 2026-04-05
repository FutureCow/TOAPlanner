import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const INCLUDE_USER = {
  createdBy: { select: { id: true, name: true, abbreviation: true } },
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('weekStart')
  const subject = searchParams.get('subject')

  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })

  const start = new Date(weekStart + 'T00:00:00.000Z')
  const end = new Date(start)
  end.setDate(end.getDate() + 5)

  const requests = await prisma.request.findMany({
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
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, klas, classroom, date, period, periodEnd, subject, recurringGroupId } = body

  if (!title || !classroom || !date || period === undefined || !subject) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const request = await prisma.request.create({
    data: {
      title,
      klas: klas ?? '',
      classroom,
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

// Delete an entire recurring series by recurringGroupId
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recurringGroupId } = await req.json()
  if (!recurringGroupId) return NextResponse.json({ error: 'recurringGroupId required' }, { status: 400 })

  const where = session.user.isTOA || session.user.isAdmin
    ? { recurringGroupId }
    : { recurringGroupId, createdById: session.user.id }

  const result = await prisma.request.deleteMany({ where })
  return NextResponse.json({ deleted: result.count })
}
