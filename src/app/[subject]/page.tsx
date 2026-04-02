import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'
import WeekCalendar from '@/components/WeekCalendar'
import { Subject } from '@prisma/client'

const SUBJECT_MAP: Record<string, Subject> = {
  natuurkunde: 'NATUURKUNDE',
  scheikunde: 'SCHEIKUNDE',
  biologie: 'BIOLOGIE',
  project: 'PROJECT',
}

export default async function SubjectPage({ params }: { params: { subject: string } }) {
  const session = await getAuth()
  if (!session) redirect('/login')

  const subject = SUBJECT_MAP[params.subject]
  if (!subject) redirect('/natuurkunde')

  return <WeekCalendar subject={subject} session={session} />
}
