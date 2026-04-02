import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { isTeacher, isTOA, isAdmin, allowed } = body

  const updateData: Record<string, boolean> = {}
  if (isTeacher !== undefined) updateData.isTeacher = isTeacher
  if (isTOA !== undefined) updateData.isTOA = isTOA
  if (isAdmin !== undefined) updateData.isAdmin = isAdmin
  if (allowed !== undefined) updateData.allowed = allowed

  const user = await prisma.user.update({ where: { id: params.id }, data: updateData })
  return NextResponse.json(user)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.user.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
