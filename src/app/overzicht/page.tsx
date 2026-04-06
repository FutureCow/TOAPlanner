import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'
import WeekCalendar from '@/components/WeekCalendar'

export default async function OverviewPage() {
  const slug = getSchoolSlug()
  const session = await getAuth(slug)
  if (!session) redirect('/login')

  const db = getPrisma(slug)
  const appSettings = await db.appSettings.findUnique({ where: { id: 1 } })

  return (
    <WeekCalendar
      subject={null}
      session={session}
      periodsPerDay={appSettings?.periodsPerDay ?? 10}
    />
  )
}
