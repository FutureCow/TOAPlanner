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

  const { registrationOpen } = await req.json()
  const settings = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: { registrationOpen },
    create: { id: 1, registrationOpen },
  })
  return NextResponse.json(settings)
}
