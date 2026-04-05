import { NextAuthOptions, getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import prisma from './prisma'
import { generateAbbreviation } from './week'

export async function buildSignInResult(
  email: string,
  id: string,
  name: string,
  image: string | null
): Promise<true | string | false> {
  const domain = email.split('@')[1]
  const allowedDomain = process.env.ALLOWED_DOMAIN

  if (domain !== allowedDomain) return false

  const existing = await prisma.user.findUnique({ where: { email } })

  if (!existing) {
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } })
    if (!settings?.registrationOpen) return '/login?error=RegistrationClosed'

    // First user in the database becomes admin automatically
    const userCount = await prisma.user.count()

    await prisma.user.create({
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
    await prisma.user.update({
      where: { email },
      data: { name: name ?? existing.name, image },
    })
  }

  return true
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    ...(process.env.AZURE_AD_CLIENT_ID ? [
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        tenantId: process.env.AZURE_AD_TENANT_ID ?? 'common',
      }),
    ] : []),
  ],
  callbacks: {
    async signIn({ user }) {
      const result = await buildSignInResult(
        user.email ?? '',
        user.id!,
        user.name ?? '',
        user.image ?? null
      )
      return result
    },
    async jwt({ token }) {
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
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

export const getAuth = () => getServerSession(authOptions)
