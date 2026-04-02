import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'
import WeekCalendar from '@/components/WeekCalendar'

export default async function OverviewPage() {
  const session = await getAuth()
  if (!session) redirect('/login')
  return <WeekCalendar subject={null} session={session} />
}
