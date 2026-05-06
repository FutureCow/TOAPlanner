import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'
import { randomBytes } from 'crypto'

export async function GET() {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getPrisma(slug)
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { calendarToken: true },
  })

  return NextResponse.json({ token: user?.calendarToken ?? null })
}

export async function POST() {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = randomBytes(24).toString('hex')
  const db = getPrisma(slug)
  await db.user.update({
    where: { id: session.user.id },
    data: { calendarToken: token },
  })

  return NextResponse.json({ token })
}
