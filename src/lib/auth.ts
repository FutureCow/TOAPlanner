import { NextAuthOptions, getServerSession } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { getSchoolConfig, getPrisma } from './school'
import { generateAbbreviation } from './week'

export async function buildSignInResult(
  email: string,
  id: string,
  name: string,
  image: string | null,
  allowedDomain: string,
  slug: string
): Promise<true | string | false> {
  const domain = email.split('@')[1]
  if (domain !== allowedDomain) return false

  const db = getPrisma(slug)
  const existing = await db.user.findUnique({ where: { email } })

  if (!existing) {
    const settings = await db.appSettings.findUnique({ where: { id: 1 } })
    if (!settings?.registrationOpen) return '/login?error=RegistrationClosed'

    const userCount = await db.user.count()
    await db.user.create({
      data: {
        id,
        email,
        name: name ?? email,
        image,
        abbreviation: generateAbbreviation(email),
        isAdmin: userCount === 0,
      },
    })
  } else {
    if (!existing.allowed) return '/login?error=AccessDenied'
    await db.user.update({
      where: { email },
      data: { name: name ?? existing.name, image },
    })
  }

  return true
}

/** Build NextAuth options for a specific school slug. */
export function getAuthOptions(slug: string): NextAuthOptions {
  const config = getSchoolConfig(slug)

  return {
    secret: process.env.NEXTAUTH_SECRET,
    trustHost: true,
    session: { strategy: 'jwt' },
    providers: [
      ...(config.googleClientId
        ? [GoogleProvider({
            clientId: config.googleClientId,
            clientSecret: config.googleClientSecret!,
          })]
        : []),
      ...(config.azureClientId
        ? [AzureADProvider({
            clientId: config.azureClientId,
            clientSecret: config.azureClientSecret!,
            tenantId: config.azureTenantId ?? 'common',
          })]
        : []),
    ],
    callbacks: {
      async signIn({ user }) {
        return buildSignInResult(
          user.email ?? '',
          user.id!,
          user.name ?? '',
          user.image ?? null,
          config.allowedDomain,
          slug
        )
      },
      async jwt({ token }) {
        // Bind token to the school it was created for.
        // On first issuance the slug is not yet set; set it now.
        // On subsequent requests, reject tokens issued for a different school.
        if (!token.schoolSlug) {
          token.schoolSlug = slug
        } else if (token.schoolSlug !== slug) {
          // NextAuth v4 types don't allow null, but null does invalidate the session at runtime
          return null as unknown as JWT
        }

        if (token.email) {
          const db = getPrisma(slug)
          const dbUser = await db.user.findUnique({
            where: { email: token.email },
            select: {
              id: true,
              abbreviation: true,
              isTeacher: true,
              isTOA: true,
              isAdmin: true,
              defaultPage: true,
            },
          })
          if (dbUser) {
            token.id = dbUser.id
            token.abbreviation = dbUser.abbreviation
            token.isTeacher = dbUser.isTeacher
            token.isTOA = dbUser.isTOA
            token.isAdmin = dbUser.isAdmin
            token.defaultPage = dbUser.defaultPage
          }
        }
        return token
      },
      async session({ session, token }) {
        session.user.id = token.id
        session.user.abbreviation = token.abbreviation
        session.user.isTeacher = token.isTeacher
        session.user.isTOA = token.isTOA
        session.user.isAdmin = token.isAdmin
        session.user.defaultPage = token.defaultPage
        return session
      },
    },
    pages: { signIn: '/login', error: '/login' },
  }
}

/** Shorthand: get session for a school slug. */
export const getAuth = (slug: string) => getServerSession(getAuthOptions(slug))

// Legacy single-school export — kept so existing code compiles during migration
export { getAuthOptions as authOptions }
