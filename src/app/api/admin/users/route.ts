import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'

export async function GET() {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getPrisma(slug)
  const users = await db.user.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(users)
}
