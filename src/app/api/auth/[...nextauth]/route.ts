import NextAuth from 'next-auth'
import { NextRequest } from 'next/server'
import { getSchoolSlug } from '@/lib/school'
import { getAuthOptions } from '@/lib/auth'

function makeHandler(req: NextRequest) {
  const slug = getSchoolSlug()
  return NextAuth(getAuthOptions(slug))
}

export async function GET(req: NextRequest, ctx: object) {
  return makeHandler(req)(req, ctx)
}

export async function POST(req: NextRequest, ctx: object) {
  return makeHandler(req)(req, ctx)
}
