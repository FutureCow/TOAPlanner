import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'
import { Status } from '@prisma/client'

const INCLUDE_USER = { createdBy: { select: { id: true, name: true, abbreviation: true } } }

export async function GET(req: NextRequest) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const subject = searchParams.get('subject')
  const status = searchParams.get('status') as Status | null
  const search = searchParams.get('search') ?? ''
  const weekStart = searchParams.get('weekStart')
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 500)

  let dateFilter: { gte?: Date; lt?: Date } | undefined
  if (weekStart) {
    const start = new Date(weekStart + 'T00:00:00.000Z')
    const dow = start.getUTCDay()
    const monday = new Date(start)
    monday.setUTCDate(start.getUTCDate() - (dow === 0 ? 6 : dow - 1))
    const saturday = new Date(monday)
    saturday.setUTCDate(monday.getUTCDate() + 5)
    dateFilter = { gte: monday, lt: saturday }
  }

  const db = getPrisma(slug)
  const requests = await db.request.findMany({
    where: {
      ...(subject ? { subject } : {}),
      ...(status ? { status } : {}),
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { createdBy: { abbreviation: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    },
    include: INCLUDE_USER,
    orderBy: [{ date: 'desc' }, { period: 'asc' }],
    take: limit,
  })

  return NextResponse.json(requests)
}

export async function DELETE(req: NextRequest) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  const db = getPrisma(slug)
  const result = await db.request.deleteMany({ where: { id: { in: ids } } })
  return NextResponse.json({ deleted: result.count })
}
