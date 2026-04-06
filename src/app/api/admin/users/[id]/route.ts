import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { isTeacher, isTOA, isAdmin, allowed, defaultPage } = body

  const updateData: Record<string, unknown> = {}
  if (isTeacher !== undefined) updateData.isTeacher = isTeacher
  if (isTOA !== undefined) updateData.isTOA = isTOA
  if (isAdmin !== undefined) updateData.isAdmin = isAdmin
  if (allowed !== undefined) updateData.allowed = allowed
  if (defaultPage !== undefined) updateData.defaultPage = defaultPage || null

  const db = getPrisma(slug)
  const user = await db.user.update({ where: { id: params.id }, data: updateData })
  return NextResponse.json(user)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getPrisma(slug)
  await db.user.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
