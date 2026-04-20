import { NextResponse } from 'next/server'
import { getSchoolSlug, getPrisma } from '@/lib/school'

// Publicly accessible — only exposes non-sensitive fields (schoolLogo)
export async function GET() {
  const slug = getSchoolSlug()
  const db = getPrisma(slug)
  const settings = await db.appSettings.findUnique({ where: { id: 1 } })
  return NextResponse.json({
    schoolLogo:      settings?.schoolLogo      ?? null,
    statusLabels:    settings?.statusLabels    ?? null,
    statusColors:    settings?.statusColors    ?? null,
    periodStartTime: settings?.periodStartTime ?? '08:30',
    periodDuration:  settings?.periodDuration  ?? 50,
    breaks:          settings?.breaks          ?? [],
  })
}
