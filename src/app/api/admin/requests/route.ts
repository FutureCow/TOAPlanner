import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Subject, Status } from '@prisma/client'

const INCLUDE_USER = { createdBy: { select: { id: true, name: true, abbreviation: true } } }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const subject = searchParams.get('subject') as Subject | null
  const status = searchParams.get('status') as Status | null
  const search = searchParams.get('search') ?? ''

  const requests = await prisma.request.findMany({
    where: {
      ...(subject ? { subject } : {}),
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { createdBy: { abbreviation: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    },
    include: INCLUDE_USER,
    orderBy: [{ date: 'desc' }, { period: 'asc' }],
  })

  return NextResponse.json(requests)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  const result = await prisma.request.deleteMany({ where: { id: { in: ids } } })
  return NextResponse.json({ deleted: result.count })
}
