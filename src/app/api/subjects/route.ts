import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'

export async function GET() {
  const slug = getSchoolSlug()
  const session = await getServerSession(getAuthOptions(slug))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getPrisma(slug)
  const subjects = await db.subjectConfig.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(subjects)
}
