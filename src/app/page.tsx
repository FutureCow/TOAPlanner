import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'

export default async function Home() {
  const slug = getSchoolSlug()
  const session = await getAuth(slug)
  if (!session) redirect('/login')

  if (session.user.defaultPage) redirect(`/${session.user.defaultPage}`)

  // Redirect to first subject, or overzicht if none exist
  const db = getPrisma(slug)
  const first = await db.subjectConfig.findFirst({ orderBy: { sortOrder: 'asc' } })
  redirect(first ? `/${first.id}` : '/overzicht')
}
