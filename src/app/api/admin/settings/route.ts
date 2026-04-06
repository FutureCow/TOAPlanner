import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'

export async function GET() {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getPrisma(slug)
  const settings = await db.appSettings.findUnique({ where: { id: 1 } })
  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (body.registrationOpen !== undefined) update.registrationOpen = body.registrationOpen
  if (body.schoolLogo !== undefined) update.schoolLogo = body.schoolLogo || null
  if (body.periodsPerDay !== undefined) update.periodsPerDay = Number(body.periodsPerDay)
  if (body.statusLabels !== undefined) update.statusLabels = body.statusLabels
  if (body.statusColors !== undefined) update.statusColors = body.statusColors

  const db = getPrisma(slug)
  const settings = await db.appSettings.upsert({
    where: { id: 1 },
    update,
    create: { id: 1, registrationOpen: true, periodsPerDay: 10, ...update },
  })
  return NextResponse.json(settings)
}
