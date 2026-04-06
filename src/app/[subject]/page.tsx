import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getSchoolSlug, getPrisma } from '@/lib/school'
import WeekCalendar from '@/components/WeekCalendar'

export default async function SubjectPage({ params }: { params: { subject: string } }) {
  const slug = getSchoolSlug()
  const session = await getAuth(slug)
  if (!session) redirect('/login')

  const db = getPrisma(slug)
  const [subjectConfig, appSettings] = await Promise.all([
    db.subjectConfig.findUnique({ where: { id: params.subject } }),
    db.appSettings.findUnique({ where: { id: 1 } }),
  ])
  if (!subjectConfig) redirect('/overzicht')

  return (
    <WeekCalendar
      subject={subjectConfig.id}
      session={session}
      subjectConfig={subjectConfig}
      periodsPerDay={appSettings?.periodsPerDay ?? 10}
    />
  )
}
