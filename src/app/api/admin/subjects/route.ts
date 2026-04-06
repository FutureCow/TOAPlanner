import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'

export async function GET() {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getPrisma(slug)
  const subjects = await db.subjectConfig.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(subjects)
}

export async function POST(req: NextRequest) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, accentColor, absenceDays } = await req.json()
  if (!id || !name) return NextResponse.json({ error: 'id and name required' }, { status: 400 })

  const s = id.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
  const db = getPrisma(slug)
  const existing = await db.subjectConfig.findUnique({ where: { id: s } })
  if (existing) return NextResponse.json({ error: 'Agenda met deze naam bestaat al' }, { status: 409 })

  const maxOrder = await db.subjectConfig.aggregate({ _max: { sortOrder: true } })
  const subject = await db.subjectConfig.create({
    data: {
      id: s,
      name: name.trim(),
      accentColor: accentColor ?? '#2563eb',
      absenceDays: absenceDays ?? [],
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  })
  return NextResponse.json(subject, { status: 201 })
}
