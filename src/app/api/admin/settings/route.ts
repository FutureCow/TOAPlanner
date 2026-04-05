import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } })
  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (body.registrationOpen !== undefined) update.registrationOpen = body.registrationOpen
  if (body.schoolLogo !== undefined) update.schoolLogo = body.schoolLogo || null
  const settings = await prisma.appSettings.upsert({
    where: { id: 1 },
    update,
    create: { id: 1, registrationOpen: true, ...update },
  })
  return NextResponse.json(settings)
}
