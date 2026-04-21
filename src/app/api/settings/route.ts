import { NextResponse } from 'next/server'
import { getSchoolSlug, getPrisma } from '@/lib/school'

// Publicly accessible — only exposes non-sensitive fields
export async function GET() {
  const slug = getSchoolSlug()
  const db = getPrisma(slug)
  const [settings, exceptionSchedules] = await Promise.all([
    db.appSettings.findUnique({ where: { id: 1 } }),
    db.exceptionSchedule.findMany({ orderBy: { name: 'asc' } }),
  ])
  return NextResponse.json({
    schoolLogo:         settings?.schoolLogo         ?? null,
    statusLabels:       settings?.statusLabels       ?? null,
    statusColors:       settings?.statusColors       ?? null,
    periodStartTime:    settings?.periodStartTime    ?? '08:30',
    periodDuration:     settings?.periodDuration     ?? 50,
    breaks:             settings?.breaks             ?? [],
    exceptionSchedules: exceptionSchedules,
  })
}
