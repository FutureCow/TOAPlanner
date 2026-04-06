import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, accentColor, absenceDays } = await req.json()
  const db = getPrisma(slug)
  const subject = await db.subjectConfig.update({
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
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getPrisma(slug)
  await db.subjectConfig.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
