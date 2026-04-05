import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Public (authenticated) settings — only exposes non-sensitive fields
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } })
  return NextResponse.json({ schoolLogo: settings?.schoolLogo ?? null })
}
