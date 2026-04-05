import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, accentColor, absenceDays } = await req.json()
  const subject = await prisma.subjectConfig.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(accentColor !== undefined ? { accentColor } : {}),
      ...(absenceDays !== undefined ? { absenceDays } : {}),
    },
  })
  return NextResponse.json(subject)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.subjectConfig.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
