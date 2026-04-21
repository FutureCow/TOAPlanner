import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name.trim()
  if (body.periodStartTime !== undefined) update.periodStartTime = String(body.periodStartTime)
  if (body.periodDuration !== undefined) update.periodDuration = Number(body.periodDuration)
  if (body.breaks !== undefined) update.breaks = body.breaks
  if (Array.isArray(body.weeks)) update.weeks = body.weeks

  const db = getPrisma(slug)
  const schedule = await db.exceptionSchedule.update({ where: { id: params.id }, data: update })
  return NextResponse.json(schedule)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getPrisma(slug)
  await db.exceptionSchedule.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
