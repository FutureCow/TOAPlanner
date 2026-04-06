import NextAuth from 'next-auth'
import { getSchoolSlug } from '@/lib/school'
import { getAuthOptions } from '@/lib/auth'

function makeHandler() {
  const slug = getSchoolSlug()
  return NextAuth(getAuthOptions(slug))
}

export async function GET(req: Request, ctx: object) {
  return makeHandler()(req as never, ctx)
}

export async function POST(req: Request, ctx: object) {
  return makeHandler()(req as never, ctx)
}
