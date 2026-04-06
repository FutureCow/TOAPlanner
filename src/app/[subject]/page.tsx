import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'
import WeekCalendar from '@/components/WeekCalendar'
import prisma from '@/lib/prisma'

export default async function SubjectPage({ params }: { params: { subject: string } }) {
  const session = await getAuth()
  if (!session) redirect('/login')

  const [subjectConfig, appSettings] = await Promise.all([
    prisma.subjectConfig.findUnique({ where: { id: params.subject } }),
    prisma.appSettings.findUnique({ where: { id: 1 } }),
  ])
  if (!subjectConfig) redirect('/natuurkunde')

  return (
    <WeekCalendar
      subject={subjectConfig.id}
      session={session}
      subjectConfig={subjectConfig}
      periodsPerDay={appSettings?.periodsPerDay ?? 10}
    />
  )
}
