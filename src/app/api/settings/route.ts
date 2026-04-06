import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Publicly accessible — only exposes non-sensitive fields (schoolLogo)
export async function GET() {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } })
  return NextResponse.json({ schoolLogo: settings?.schoolLogo ?? null })
}
