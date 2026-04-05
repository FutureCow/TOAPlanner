import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const subjects = await prisma.subjectConfig.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(subjects)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, accentColor, absenceDays } = await req.json()
  if (!id || !name) return NextResponse.json({ error: 'id and name required' }, { status: 400 })

  const slug = id.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
  const existing = await prisma.subjectConfig.findUnique({ where: { id: slug } })
  if (existing) return NextResponse.json({ error: 'Agenda met deze naam bestaat al' }, { status: 409 })

  const maxOrder = await prisma.subjectConfig.aggregate({ _max: { sortOrder: true } })
  const subject = await prisma.subjectConfig.create({
    data: {
      id: slug,
      name: name.trim(),
      accentColor: accentColor ?? '#2563eb',
      absenceDays: absenceDays ?? [],
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  })
  return NextResponse.json(subject, { status: 201 })
}
