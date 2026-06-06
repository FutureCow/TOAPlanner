import { NextAuthOptions, getServerSession } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getSchoolConfig, getPrisma } from './school'
import { generateAbbreviation, type AbbreviationFormat } from './week'

export async function buildSignInResult(
  email: string,
  id: string,
  name: string,
  image: string | null,
  allowedDomain: string,
  slug: string
): Promise<true | string | false> {
  const domain = email.split('@')[1]
  const allowed = allowedDomain.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
  if (!allowed.includes(domain.toLowerCase())) return false

  const db = getPrisma(slug)
  const existing = await db.user.findUnique({ where: { email } })

  if (!existing) {
    const settings = await db.appSettings.findUnique({ where: { id: 1 } })
    // Treat missing settings (new school, empty DB) as registration open
    if (settings !== null && !settings.registrationOpen) return '/login?error=RegistrationClosed'

    const userCount = await db.user.count()
    const isFirst = userCount === 0
    const abbr = generateAbbreviation(
      email,
      name,
      (settings?.abbreviationFormat ?? 'email') as AbbreviationFormat,
      settings?.abbreviationLength ?? 4,
    )
    await db.user.create({
      data: {
        id,
        email,
        name: name ?? email,
        image,
        abbreviation: abbr,
        isAdmin: isFirst,
        isTOA: isFirst,
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
      // Credentials alleen als er geen OAuth geconfigureerd is
      ...(!config.googleClientId && !config.azureClientId
        ? [CredentialsProvider({
            credentials: {
              email:    { label: 'E-mailadres', type: 'email' },
              password: { label: 'Wachtwoord',  type: 'password' },
            },
            async authorize(credentials) {
              if (!credentials?.email || !credentials?.password) return null

              const domain = credentials.email.split('@')[1] ?? ''
              const allowed = config.allowedDomain.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
              if (!allowed.includes(domain.toLowerCase())) return null

              const db = getPrisma(slug)
              const user = await db.user.findUnique({ where: { email: credentials.email } })

              if (user) {
                if (!user.allowed) return null
                if (!user.passwordHash) {
                  // Eerste keer inloggen: wachtwoord instellen
                  const hash = await bcrypt.hash(credentials.password, 10)
                  await db.user.update({ where: { id: user.id }, data: { passwordHash: hash } })
                } else {
                  const valid = await bcrypt.compare(credentials.password, user.passwordHash)
                  if (!valid) return null
                }
                return { id: user.id, email: user.email, name: user.name, image: user.image }
              }

              // Nieuwe gebruiker — alleen als registratie open is
              const settings = await db.appSettings.findUnique({ where: { id: 1 } })
              if (settings !== null && !settings.registrationOpen) return null

              const userCount = await db.user.count()
              const isFirst = userCount === 0
              const abbr = generateAbbreviation(
                credentials.email,
                credentials.email.split('@')[0],
                (settings?.abbreviationFormat ?? 'email') as AbbreviationFormat,
                settings?.abbreviationLength ?? 4,
              )
              const hash = await bcrypt.hash(credentials.password, 10)
              const newUser = await db.user.create({
                data: {
                  id: crypto.randomUUID(),
                  email: credentials.email,
                  name: credentials.email.split('@')[0],
                  image: null,
                  abbreviation: abbr,
                  passwordHash: hash,
                  isAdmin: isFirst,
                  isTOA: isFirst,
                },
              })
              return { id: newUser.id, email: newUser.email, name: newUser.name, image: null }
            },
          })]
        : []),
    ],
    callbacks: {
      async signIn({ user, account }) {
        // Credentials-login is volledig afgehandeld in authorize()
        if (account?.provider === 'credentials') return true
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
