import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'
import WeekCalendar from '@/components/WeekCalendar'
import prisma from '@/lib/prisma'

export default async function OverviewPage() {
  const session = await getAuth()
  if (!session) redirect('/login')
  const appSettings = await prisma.appSettings.findUnique({ where: { id: 1 } })
  return <WeekCalendar subject={null} session={session} periodsPerDay={appSettings?.periodsPerDay ?? 10} />
}
