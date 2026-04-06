import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'

const INCLUDE_USER = {
  createdBy: { select: { id: true, name: true, abbreviation: true } },
}

function canModify(userId: string, isTOA: boolean, isAdmin: boolean, request: { createdById: string | null }) {
  return isTOA || isAdmin || request.createdById === userId
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getPrisma(slug)
  const existing = await db.request.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { isTOA, isAdmin, id: userId } = session.user
  if (!canModify(userId, isTOA, isAdmin, existing)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, klas, classroom, date, period, periodEnd, subject, status } = body

  const updateData: Record<string, unknown> = {}
  if (title !== undefined) updateData.title = title
  if (klas !== undefined) updateData.klas = klas
  if (classroom !== undefined) updateData.classroom = classroom
  if (date !== undefined) updateData.date = new Date(date + 'T00:00:00.000Z')
  if (period !== undefined) updateData.period = Number(period)
  if (periodEnd !== undefined) {
    updateData.periodEnd = periodEnd != null && Number(periodEnd) !== Number(period ?? existing.period)
      ? Number(periodEnd)
      : null
  }
  if (subject !== undefined) updateData.subject = subject
  if (status !== undefined && (isTOA || isAdmin)) updateData.status = status

  const updated = await db.request.update({
    where: { id: params.id },
    data: updateData,
    include: INCLUDE_USER,
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getPrisma(slug)
  const existing = await db.request.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { isTOA, isAdmin, id: userId } = session.user
  if (!canModify(userId, isTOA, isAdmin, existing)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.request.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
