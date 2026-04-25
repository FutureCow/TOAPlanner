import NextAuth from 'next-auth'
import { headers } from 'next/headers'
import { getSchoolSlug } from '@/lib/school'
import { getAuthOptions } from '@/lib/auth'

function makeHandler() {
  const h = headers()
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(':')[0]
  const proto = h.get('x-forwarded-proto') ?? 'https'
  if (host) process.env.NEXTAUTH_URL = `${proto}://${host}`

  const slug = getSchoolSlug()
  return NextAuth(getAuthOptions(slug))
}

export async function GET(req: Request, ctx: object) {
  return makeHandler()(req as never, ctx)
}

export async function POST(req: Request, ctx: object) {
  return makeHandler()(req as never, ctx)
}
