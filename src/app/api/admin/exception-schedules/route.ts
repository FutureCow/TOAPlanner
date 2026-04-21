import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'

export async function GET() {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getPrisma(slug)
  const schedules = await db.exceptionSchedule.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(schedules)
}

export async function POST(req: NextRequest) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })

  const db = getPrisma(slug)
  const schedule = await db.exceptionSchedule.create({
    data: {
      name: body.name.trim(),
      periodStartTime: body.periodStartTime ?? '08:30',
      periodDuration: Number(body.periodDuration ?? 50),
      breaks: body.breaks ?? [],
      weeks: Array.isArray(body.weeks) ? body.weeks : [],
    },
  })
  return NextResponse.json(schedule, { status: 201 })
}
