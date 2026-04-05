# TOA Practicum Planner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted Next.js web app where teachers plan practicums on a weekly calendar, with TOA approval workflow and an admin panel for user/request management.

**Architecture:** Next.js 14 App Router (full-stack), PostgreSQL + Prisma ORM, NextAuth.js v4 with Google OAuth (JWT sessions, school domain restriction). Deployed with PM2 and Nginx reverse proxy. Dark theme throughout with Tailwind CSS.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Prisma, PostgreSQL 16, NextAuth.js v4, date-fns, Jest, React Testing Library

---

## File Structure

```
prisma/
  schema.prisma                        # All models: User, Request, AppSettings, enums
  seed.ts                              # Seeds AppSettings singleton (id=1)

src/
  types/
    index.ts                           # Shared TS types + next-auth module augmentation
  lib/
    prisma.ts                          # Prisma client singleton
    auth.ts                            # NextAuth options, getAuth() helper
    week.ts                            # Week date utils + generateAbbreviation
  app/
    layout.tsx                         # Root layout: dark bg, SessionProvider, NavBar
    page.tsx                           # Redirects to /natuurkunde
    login/
      page.tsx                         # Login page with Google sign-in button + error display
    [subject]/
      page.tsx                         # Calendar page (handles: natuurkunde, scheikunde, biologie, project)
    overzicht/
      page.tsx                         # Overview: all subjects combined
    admin/
      page.tsx                         # Admin page (isAdmin guard)
    api/
      auth/[...nextauth]/route.ts      # NextAuth handler (GET + POST)
      requests/
        route.ts                       # GET (week+subject), POST (create)
        [id]/route.ts                  # PATCH (edit/status), DELETE
      admin/
        requests/route.ts              # GET all (filtered), DELETE bulk
        users/route.ts                 # GET all users
        users/[id]/route.ts            # PATCH (roles/allowed), DELETE
        settings/route.ts              # GET/PATCH registrationOpen
  components/
    SessionProvider.tsx                # Wraps children in next-auth SessionProvider
    NavBar.tsx                         # Top bar: subject tabs, week nav, user menu
    WeekCalendar.tsx                   # Main calendar grid (client component)
    RequestBlock.tsx                   # Single request card inside a cell
    RequestModal.tsx                   # Create/edit request modal (client)
    RequestDetailPanel.tsx             # Slide-in detail panel on request click (client)
    admin/
      RequestsTab.tsx                  # Admin requests table with filters + bulk delete
      UsersTab.tsx                     # Admin users table with roles/access controls
      RegistrationToggle.tsx           # Global toggle for new registrations

tests/
  lib/
    week.test.ts
  api/
    requests.test.ts
    requests-id.test.ts
    admin-requests.test.ts
    admin-users.test.ts
    admin-settings.test.ts
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json` (via next CLI)
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create Next.js project**

```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Expected: project files created, `npm run dev` works.

- [ ] **Step 2: Install dependencies**

```bash
npm install next-auth@4 @prisma/client prisma date-fns
npm install --save-dev jest jest-environment-jsdom @types/jest ts-jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configure Jest**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathPattern: 'tests/',
}

export default createJestConfig(config)
```

Create `jest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Create `.env.example`**

```bash
# .env.example
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/toa_planner"
NEXTAUTH_URL="https://yourdomain.nl"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
GOOGLE_CLIENT_ID="from-google-cloud-console"
GOOGLE_CLIENT_SECRET="from-google-cloud-console"
ALLOWED_DOMAIN="yourschool.nl"
```

Copy to `.env` and fill in real values. Add `.env` to `.gitignore`.

- [ ] **Step 5: Run tests to verify setup**

```bash
npx jest --passWithNoTests
```

Expected: `Test Suites: 0 passed`

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: initial Next.js project scaffold with Jest"
```

---

## Task 2: Prisma Schema + Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Modify: `package.json` (add prisma seed script)

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init
```

Expected: `prisma/schema.prisma` and `.env` created (merge DATABASE_URL into your `.env`).

- [ ] **Step 2: Write the schema**

Replace `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id
  email        String    @unique
  name         String
  image        String?
  abbreviation String
  isTeacher    Boolean   @default(true)
  isTOA        Boolean   @default(false)
  isAdmin      Boolean   @default(false)
  allowed      Boolean   @default(true)
  createdAt    DateTime  @default(now())
  requests     Request[]
}

model Request {
  id          String   @id @default(cuid())
  title       String
  classroom   String
  date        DateTime
  period      Int
  subject     Subject
  status      Status   @default(PENDING)
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id], onDelete: SetNull)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model AppSettings {
  id               Int     @id @default(1)
  registrationOpen Boolean @default(true)
}

enum Subject {
  NATUURKUNDE
  SCHEIKUNDE
  BIOLOGIE
  PROJECT
}

enum Status {
  PENDING
  APPROVED_WITH_TOA
  APPROVED_WITHOUT_TOA
  REJECTED
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: migration file created, tables created in PostgreSQL.

- [ ] **Step 4: Write seed**

Create `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, registrationOpen: true },
  })
  console.log('Seeded AppSettings')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

- [ ] **Step 5: Run seed**

```bash
npm install --save-dev ts-node
npx prisma db seed
```

Expected: `Seeded AppSettings`

- [ ] **Step 6: Commit**

```bash
git add prisma/ package.json
git commit -m "feat: prisma schema with User, Request, AppSettings"
```

---

## Task 3: Shared Types + Week Utilities

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/prisma.ts`
- Create: `src/lib/week.ts`
- Create: `tests/lib/week.test.ts`

- [ ] **Step 1: Write failing tests for week utilities**

Create `tests/lib/week.test.ts`:
```typescript
import {
  getWeekDates,
  getWeekLabel,
  prevWeek,
  nextWeek,
  toDateString,
  generateAbbreviation,
} from '@/lib/week'

describe('getWeekDates', () => {
  it('returns 5 dates starting on Monday', () => {
    const wednesday = new Date(2026, 2, 4) // Wed 4 March 2026
    const dates = getWeekDates(wednesday)
    expect(dates).toHaveLength(5)
    expect(dates[0].getDay()).toBe(1) // Monday
    expect(dates[4].getDay()).toBe(5) // Friday
  })

  it('returns correct Monday when given a Monday', () => {
    const monday = new Date(2026, 2, 2) // Mon 2 March 2026
    const dates = getWeekDates(monday)
    expect(toDateString(dates[0])).toBe('2026-03-02')
  })
})

describe('getWeekLabel', () => {
  it('formats week label in Dutch uppercase', () => {
    const dates = getWeekDates(new Date(2026, 2, 30)) // week of 30 March
    const label = getWeekLabel(dates)
    expect(label).toMatch(/30 MAART/)
    expect(label).toMatch(/2026/)
  })
})

describe('prevWeek / nextWeek', () => {
  it('moves 7 days back', () => {
    const d = new Date(2026, 2, 9)
    expect(toDateString(prevWeek(d))).toBe('2026-03-02')
  })
  it('moves 7 days forward', () => {
    const d = new Date(2026, 2, 2)
    expect(toDateString(nextWeek(d))).toBe('2026-03-09')
  })
})

describe('generateAbbreviation', () => {
  it('returns first 4 chars of email prefix lowercase', () => {
    expect(generateAbbreviation('BEEM@school.nl')).toBe('beem')
    expect(generateAbbreviation('jo@school.nl')).toBe('jo')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/lib/week.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/week'`

- [ ] **Step 3: Implement week utilities**

Create `src/lib/week.ts`:
```typescript
import { addDays, startOfWeek, format } from 'date-fns'
import { nl } from 'date-fns/locale'

export function getWeekDates(date: Date): Date[] {
  const monday = startOfWeek(date, { weekStartsOn: 1 })
  return Array.from({ length: 5 }, (_, i) => addDays(monday, i))
}

export function getWeekLabel(dates: Date[]): string {
  const start = dates[0]
  const end = dates[4]
  // If same month: "30 MAART – 03 APRIL, 2026"
  const startStr = format(start, 'd MMMM', { locale: nl }).toUpperCase()
  const endStr = format(end, 'd MMMM, yyyy', { locale: nl }).toUpperCase()
  return `${startStr} \u2013 ${endStr}`
}

export function prevWeek(date: Date): Date {
  return addDays(date, -7)
}

export function nextWeek(date: Date): Date {
  return addDays(date, 7)
}

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function generateAbbreviation(email: string): string {
  return email.split('@')[0].slice(0, 4).toLowerCase()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/lib/week.test.ts
```

Expected: PASS (all 6 tests)

- [ ] **Step 5: Create Prisma singleton**

Create `src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

- [ ] **Step 6: Create shared types**

Create `src/types/index.ts`:
```typescript
import { Subject, Status } from '@prisma/client'

export type { Subject, Status }

export interface RequestWithUser {
  id: string
  title: string
  classroom: string
  date: string
  period: number
  subject: Subject
  status: Status
  createdById: string | null
  createdBy: {
    id: string
    name: string
    abbreviation: string
  } | null
  createdAt: string
  updatedAt: string
}

export interface UserRow {
  id: string
  email: string
  name: string
  image: string | null
  abbreviation: string
  isTeacher: boolean
  isTOA: boolean
  isAdmin: boolean
  allowed: boolean
  createdAt: string
}

// Augment next-auth types
import 'next-auth'
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      image?: string | null
      abbreviation: string
      isTeacher: boolean
      isTOA: boolean
      isAdmin: boolean
    }
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    abbreviation: string
    isTeacher: boolean
    isTOA: boolean
    isAdmin: boolean
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add src/ tests/
git commit -m "feat: shared types, Prisma singleton, week utilities"
```

---

## Task 4: NextAuth Configuration

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/components/SessionProvider.tsx`
- Create: `tests/lib/auth.test.ts`

- [ ] **Step 1: Write failing tests for auth helpers**

Create `tests/lib/auth.test.ts`:
```typescript
import { buildSignInResult } from '@/lib/auth'
import prisma from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  appSettings: { findUnique: jest.fn() },
}))

describe('buildSignInResult', () => {
  const validEmail = `test@${process.env.ALLOWED_DOMAIN ?? 'school.nl'}`

  beforeEach(() => jest.clearAllMocks())

  it('rejects wrong domain', async () => {
    const result = await buildSignInResult('test@gmail.com', 'uid1', 'Test', null)
    expect(result).toBe(false)
  })

  it('rejects blocked existing user', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ allowed: false })
    const result = await buildSignInResult(validEmail, 'uid1', 'Test', null)
    expect(result).toBe('/login?error=AccessDenied')
  })

  it('rejects new user when registration is closed', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.appSettings.findUnique as jest.Mock).mockResolvedValue({ registrationOpen: false })
    const result = await buildSignInResult(validEmail, 'uid1', 'Test', null)
    expect(result).toBe('/login?error=RegistrationClosed')
  })

  it('allows existing allowed user', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ allowed: true, name: 'Test', image: null })
    const result = await buildSignInResult(validEmail, 'uid1', 'Test', null)
    expect(result).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/lib/auth.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/auth'`

- [ ] **Step 3: Implement auth configuration**

Create `src/lib/auth.ts`:
```typescript
import { NextAuthOptions, getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
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

    await prisma.user.create({
      data: {
        id,
        email,
        name: name ?? email,
        image,
        abbreviation: generateAbbreviation(email),
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
          },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.abbreviation = dbUser.abbreviation
          token.isTeacher = dbUser.isTeacher
          token.isTOA = dbUser.isTOA
          token.isAdmin = dbUser.isAdmin
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
      return session
    },
  },
  pages: { signIn: '/login', error: '/login' },
}

export const getAuth = () => getServerSession(authOptions)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/lib/auth.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Create NextAuth route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Step 6: Create SessionProvider wrapper**

Create `src/components/SessionProvider.tsx`:
```typescript
'use client'
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
```

- [ ] **Step 7: Create login page**

Create `src/app/login/page.tsx`:
```typescript
'use client'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: 'Jouw account heeft geen toegang. Neem contact op met de beheerder.',
  RegistrationClosed: 'Nieuwe aanmeldingen zijn momenteel gesloten.',
  Default: 'Er is iets misgegaan. Probeer opnieuw.',
}

export default function LoginPage() {
  const params = useSearchParams()
  const error = params.get('error')
  const message = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default) : null

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 w-full max-w-sm text-center">
        <h1 className="text-xl font-bold text-white mb-2">TOA Planner</h1>
        <p className="text-slate-400 text-sm mb-6">De Amersfoortse Berg</p>
        {message && (
          <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded p-3 mb-4">
            {message}
          </p>
        )}
        <button
          onClick={() => signIn('google', { callbackUrl: '/natuurkunde' })}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          Inloggen met Google
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add src/ tests/
git commit -m "feat: NextAuth Google SSO with domain + registration checks"
```

---

## Task 5: Root Layout + NavBar

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/components/NavBar.tsx`
- Modify: `tailwind.config.ts` (enable dark mode)

- [ ] **Step 1: Configure Tailwind dark mode**

Edit `tailwind.config.ts`, add `darkMode: 'class'` inside the config object:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: {} },
  plugins: [],
}
export default config
```

- [ ] **Step 2: Update root layout**

Replace `src/app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'
import NavBar from '@/components/NavBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TOA Planner — De Amersfoortse Berg',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen`}>
        <SessionProvider>
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 py-4">{children}</main>
        </SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create redirect page**

Create `src/app/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/natuurkunde')
}
```

- [ ] **Step 4: Create NavBar component**

Create `src/components/NavBar.tsx`:
```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

const SUBJECTS = [
  { label: 'Natuurkunde', href: '/natuurkunde' },
  { label: 'Scheikunde',  href: '/scheikunde' },
  { label: 'Biologie',   href: '/biologie' },
  { label: 'Project/NLT', href: '/project' },
  { label: 'Overzicht',  href: '/overzicht' },
]

export default function NavBar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  if (!session) return null

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-1 flex-wrap">
        {SUBJECTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              pathname.startsWith(s.href)
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {s.label}
          </Link>
        ))}
        {session.user.isAdmin && (
          <Link
            href="/admin"
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              pathname === '/admin'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Admin
          </Link>
        )}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors whitespace-nowrap"
      >
        {session.user.abbreviation.toUpperCase()} · Uitloggen
      </button>
    </nav>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: root layout, NavBar with subject tabs, login page"
```

---

## Task 6: Requests API Routes

**Files:**
- Create: `src/app/api/requests/route.ts`
- Create: `src/app/api/requests/[id]/route.ts`
- Create: `tests/api/requests.test.ts`
- Create: `tests/api/requests-id.test.ts`

- [ ] **Step 1: Write failing tests for GET + POST /api/requests**

Create `tests/api/requests.test.ts`:
```typescript
import { GET, POST } from '@/app/api/requests/route'
import { NextRequest } from 'next/server'
import * as nextAuth from 'next-auth'
import prisma from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  request: { findMany: jest.fn(), create: jest.fn() },
}))

const session = {
  user: { id: 'u1', abbreviation: 'beem', isTeacher: true, isTOA: false, isAdmin: false },
}

beforeEach(() => jest.clearAllMocks())

describe('GET /api/requests', () => {
  it('returns 401 when not logged in', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://x/api/requests?weekStart=2026-03-30'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when weekStart is missing', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(session)
    const res = await GET(new NextRequest('http://x/api/requests'))
    expect(res.status).toBe(400)
  })

  it('returns requests for week', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.request.findMany as jest.Mock).mockResolvedValue([{ id: 'r1' }])
    const res = await GET(new NextRequest('http://x/api/requests?weekStart=2026-03-30'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
  })
})

describe('POST /api/requests', () => {
  it('returns 401 when not logged in', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await POST(new NextRequest('http://x/api/requests', {
      method: 'POST',
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(401)
  })

  it('creates request and returns it', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(session)
    const created = { id: 'r1', title: 'Proef', classroom: 'W107', date: '2026-03-31T00:00:00.000Z', period: 2, subject: 'NATUURKUNDE', status: 'PENDING', createdBy: null }
    ;(prisma.request.create as jest.Mock).mockResolvedValue(created)
    const res = await POST(new NextRequest('http://x/api/requests', {
      method: 'POST',
      body: JSON.stringify({ title: 'Proef', classroom: 'W107', date: '2026-03-31', period: 2, subject: 'NATUURKUNDE' }),
    }))
    expect(res.status).toBe(201)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/api/requests.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement GET + POST /api/requests**

Create `src/app/api/requests/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Subject } from '@prisma/client'

const INCLUDE_USER = {
  createdBy: { select: { id: true, name: true, abbreviation: true } },
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('weekStart')
  const subject = searchParams.get('subject') as Subject | null

  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })

  const start = new Date(weekStart + 'T00:00:00.000Z')
  const end = new Date(start)
  end.setDate(end.getDate() + 5)

  const requests = await prisma.request.findMany({
    where: {
      date: { gte: start, lt: end },
      ...(subject ? { subject } : {}),
    },
    include: INCLUDE_USER,
    orderBy: [{ date: 'asc' }, { period: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(requests)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, classroom, date, period, subject } = body

  if (!title || !classroom || !date || !period || !subject) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const request = await prisma.request.create({
    data: {
      title,
      classroom,
      date: new Date(date + 'T00:00:00.000Z'),
      period: Number(period),
      subject,
      createdById: session.user.id,
    },
    include: INCLUDE_USER,
  })

  return NextResponse.json(request, { status: 201 })
}
```

- [ ] **Step 4: Write failing tests for PATCH + DELETE /api/requests/[id]**

Create `tests/api/requests-id.test.ts`:
```typescript
import { PATCH, DELETE } from '@/app/api/requests/[id]/route'
import { NextRequest } from 'next/server'
import * as nextAuth from 'next-auth'
import prisma from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  request: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
}))

const teacherSession = {
  user: { id: 'u1', isTeacher: true, isTOA: false, isAdmin: false },
}
const toaSession = {
  user: { id: 'u2', isTeacher: false, isTOA: true, isAdmin: false },
}
const existingRequest = { id: 'r1', createdById: 'u1', status: 'PENDING', createdBy: null }

beforeEach(() => jest.clearAllMocks())

describe('PATCH /api/requests/[id]', () => {
  it('returns 401 when not logged in', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await PATCH(new NextRequest('http://x/api/requests/r1', { method: 'PATCH', body: '{}' }), { params: { id: 'r1' } })
    expect(res.status).toBe(401)
  })

  it('allows teacher to edit own request', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(teacherSession)
    ;(prisma.request.findUnique as jest.Mock).mockResolvedValue(existingRequest)
    ;(prisma.request.update as jest.Mock).mockResolvedValue({ ...existingRequest, title: 'New' })
    const res = await PATCH(
      new NextRequest('http://x/api/requests/r1', { method: 'PATCH', body: JSON.stringify({ title: 'New' }) }),
      { params: { id: 'r1' } }
    )
    expect(res.status).toBe(200)
  })

  it('returns 403 when teacher tries to edit another teacher request', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u99', isTeacher: true, isTOA: false, isAdmin: false } })
    ;(prisma.request.findUnique as jest.Mock).mockResolvedValue(existingRequest)
    const res = await PATCH(
      new NextRequest('http://x/api/requests/r1', { method: 'PATCH', body: '{}' }),
      { params: { id: 'r1' } }
    )
    expect(res.status).toBe(403)
  })

  it('allows TOA to change status', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(toaSession)
    ;(prisma.request.findUnique as jest.Mock).mockResolvedValue(existingRequest)
    ;(prisma.request.update as jest.Mock).mockResolvedValue({ ...existingRequest, status: 'APPROVED_WITH_TOA' })
    const res = await PATCH(
      new NextRequest('http://x/api/requests/r1', { method: 'PATCH', body: JSON.stringify({ status: 'APPROVED_WITH_TOA' }) }),
      { params: { id: 'r1' } }
    )
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/requests/[id]', () => {
  it('allows TOA to delete any request', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(toaSession)
    ;(prisma.request.findUnique as jest.Mock).mockResolvedValue(existingRequest)
    ;(prisma.request.delete as jest.Mock).mockResolvedValue({})
    const res = await DELETE(new NextRequest('http://x', { method: 'DELETE' }), { params: { id: 'r1' } })
    expect(res.status).toBe(204)
  })

  it('returns 403 when teacher tries to delete another teacher request', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u99', isTeacher: true, isTOA: false, isAdmin: false } })
    ;(prisma.request.findUnique as jest.Mock).mockResolvedValue(existingRequest)
    const res = await DELETE(new NextRequest('http://x', { method: 'DELETE' }), { params: { id: 'r1' } })
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 5: Implement PATCH + DELETE /api/requests/[id]**

Create `src/app/api/requests/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const INCLUDE_USER = {
  createdBy: { select: { id: true, name: true, abbreviation: true } },
}

function canModify(userId: string, isTOA: boolean, isAdmin: boolean, request: { createdById: string | null }) {
  return isTOA || isAdmin || request.createdById === userId
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.request.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { isTOA, isAdmin, id: userId } = session.user
  if (!canModify(userId, isTOA, isAdmin, existing)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, classroom, date, period, subject, status } = body

  // Teachers cannot change status
  const updateData: Record<string, unknown> = {}
  if (title !== undefined) updateData.title = title
  if (classroom !== undefined) updateData.classroom = classroom
  if (date !== undefined) updateData.date = new Date(date + 'T00:00:00.000Z')
  if (period !== undefined) updateData.period = Number(period)
  if (subject !== undefined) updateData.subject = subject
  if (status !== undefined && (isTOA || isAdmin)) updateData.status = status

  const updated = await prisma.request.update({
    where: { id: params.id },
    data: updateData,
    include: INCLUDE_USER,
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.request.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { isTOA, isAdmin, id: userId } = session.user
  if (!canModify(userId, isTOA, isAdmin, existing)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.request.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 6: Run all API tests**

```bash
npx jest tests/api/requests.test.ts tests/api/requests-id.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 7: Commit**

```bash
git add src/ tests/
git commit -m "feat: requests API (GET, POST, PATCH, DELETE) with auth guards"
```

---

## Task 7: Calendar Page + WeekCalendar Component

**Files:**
- Create: `src/app/[subject]/page.tsx`
- Create: `src/app/overzicht/page.tsx`
- Create: `src/components/WeekCalendar.tsx`
- Create: `src/components/RequestBlock.tsx`

- [ ] **Step 1: Create subject calendar page**

Create `src/app/[subject]/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'
import WeekCalendar from '@/components/WeekCalendar'
import { Subject } from '@prisma/client'

const SUBJECT_MAP: Record<string, Subject> = {
  natuurkunde: 'NATUURKUNDE',
  scheikunde: 'SCHEIKUNDE',
  biologie: 'BIOLOGIE',
  project: 'PROJECT',
}

export default async function SubjectPage({ params }: { params: { subject: string } }) {
  const session = await getAuth()
  if (!session) redirect('/login')

  const subject = SUBJECT_MAP[params.subject]
  if (!subject) redirect('/natuurkunde')

  return <WeekCalendar subject={subject} session={session} />
}
```

- [ ] **Step 2: Create overview page**

Create `src/app/overzicht/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'
import WeekCalendar from '@/components/WeekCalendar'

export default async function OverviewPage() {
  const session = await getAuth()
  if (!session) redirect('/login')
  return <WeekCalendar subject={null} session={session} />
}
```

- [ ] **Step 3: Create RequestBlock component**

Create `src/components/RequestBlock.tsx`:
```typescript
import { RequestWithUser } from '@/types'
import { Status } from '@prisma/client'

const STATUS_STYLES: Record<Status, string> = {
  PENDING:              'bg-slate-700 border-slate-400 text-slate-200',
  APPROVED_WITH_TOA:    'bg-green-950 border-green-500 text-green-100',
  APPROVED_WITHOUT_TOA: 'bg-amber-950 border-amber-500 text-amber-100',
  REJECTED:             'bg-red-950 border-red-500 text-red-100',
}

const ABBR_STYLES: Record<Status, string> = {
  PENDING:              'text-slate-400',
  APPROVED_WITH_TOA:    'text-green-400',
  APPROVED_WITHOUT_TOA: 'text-amber-400',
  REJECTED:             'text-red-400',
}

interface Props {
  request: RequestWithUser
  onClick: (request: RequestWithUser) => void
}

export default function RequestBlock({ request, onClick }: Props) {
  return (
    <div
      onClick={() => onClick(request)}
      className={`border-l-[3px] rounded px-1.5 py-1 cursor-pointer hover:brightness-125 transition-all mb-1 ${STATUS_STYLES[request.status]}`}
    >
      <div className="font-semibold text-xs leading-tight line-clamp-2">{request.title}</div>
      <div className={`text-[0.65rem] mt-0.5 ${ABBR_STYLES[request.status]}`}>
        {request.classroom} · <strong>{request.createdBy?.abbreviation.toUpperCase() ?? '—'}</strong>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create WeekCalendar component**

Create `src/components/WeekCalendar.tsx`:
```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { Session } from 'next-auth'
import { Subject } from '@prisma/client'
import { RequestWithUser } from '@/types'
import { getWeekDates, getWeekLabel, prevWeek, nextWeek, toDateString } from '@/lib/week'
import RequestBlock from './RequestBlock'
import RequestModal from './RequestModal'
import RequestDetailPanel from './RequestDetailPanel'

const DAYS = ['Maa', 'Din', 'Woe', 'Don', 'Vri']
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

interface Props {
  subject: Subject | null
  session: Session
}

export default function WeekCalendar({ subject, session }: Props) {
  const [currentDate, setCurrentDate] = useState(() => getWeekDates(new Date())[0])
  const [requests, setRequests] = useState<RequestWithUser[]>([])
  const [modal, setModal] = useState<{ date: Date; period: number } | null>(null)
  const [editing, setEditing] = useState<RequestWithUser | null>(null)
  const [selected, setSelected] = useState<RequestWithUser | null>(null)

  const weekDates = getWeekDates(currentDate)
  const today = toDateString(new Date())

  const load = useCallback(async () => {
    const params = new URLSearchParams({ weekStart: toDateString(weekDates[0]) })
    if (subject) params.set('subject', subject)
    const res = await fetch(`/api/requests?${params}`)
    if (res.ok) setRequests(await res.json())
  }, [currentDate, subject])

  useEffect(() => { load() }, [load])

  function getCell(date: Date, period: number): RequestWithUser[] {
    const ds = toDateString(date)
    return requests.filter(r => r.date.startsWith(ds) && r.period === period)
  }

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-slate-200">{getWeekLabel(weekDates)}</span>
        <div className="flex gap-1">
          <button onClick={() => setCurrentDate(getWeekDates(new Date())[0])}
            className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors">
            Vandaag
          </button>
          <button onClick={() => setCurrentDate(d => getWeekDates(prevWeek(d))[0])}
            className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors">
            ‹
          </button>
          <button onClick={() => setCurrentDate(d => getWeekDates(nextWeek(d))[0])}
            className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors">
            ›
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border border-slate-700 rounded-lg overflow-hidden text-xs">
        {/* Day headers */}
        <div className="grid border-b-2 border-slate-600 bg-slate-900" style={{ gridTemplateColumns: '2rem repeat(5, 1fr)' }}>
          <div />
          {weekDates.map((d, i) => (
            <div key={i} className={`p-2 text-center font-semibold text-slate-400 ${toDateString(d) === today ? 'ring-2 ring-blue-500 ring-inset rounded' : ''}`}>
              {DAYS[i]} <span className={toDateString(d) === today ? 'bg-blue-600 text-white rounded-full px-1' : 'text-slate-200'}>{d.getDate()}</span>
            </div>
          ))}
        </div>

        {/* Period rows */}
        {PERIODS.map(period => (
          <div key={period} className="grid border-b border-slate-800/50" style={{ gridTemplateColumns: '2rem repeat(5, 1fr)' }}>
            <div className="flex items-center justify-center text-slate-600 font-semibold bg-slate-900/50 border-r border-slate-700">
              {period}
            </div>
            {weekDates.map((date, di) => {
              const cell = getCell(date, period)
              return (
                <div
                  key={di}
                  className="relative p-1 min-h-[3.5rem] border-r border-slate-800/50 last:border-r-0 group"
                >
                  {cell.map(r => (
                    <RequestBlock key={r.id} request={r} onClick={setSelected} />
                  ))}
                  {/* Add button */}
                  <button
                    onClick={() => setModal({ date, period })}
                    className="absolute bottom-1 right-1 w-5 h-5 bg-blue-800 hover:bg-blue-600 text-white rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Aanvraag toevoegen"
                  >
                    +
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2 flex-wrap">
        {[
          { color: 'bg-slate-400', label: 'Aangevraagd' },
          { color: 'bg-green-500', label: 'Met TOA' },
          { color: 'bg-amber-500', label: 'Zonder TOA' },
          { color: 'bg-red-500', label: 'Afgekeurd' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1 text-xs text-slate-500">
            <div className={`w-2 h-2 rounded-sm ${color}`} />
            {label}
          </div>
        ))}
      </div>

      {/* Modals */}
      {modal && (
        <RequestModal
          date={modal.date}
          period={modal.period}
          subject={subject}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
      {editing && (
        <RequestModal
          request={editing}
          date={new Date(editing.date)}
          period={editing.period}
          subject={editing.subject}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setSelected(null); load() }}
        />
      )}
      {selected && (
        <RequestDetailPanel
          request={selected}
          session={session}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null) }}
          onDeleted={() => { setSelected(null); load() }}
          onStatusChanged={() => { load(); setSelected(null) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: calendar page with WeekCalendar grid and RequestBlock"
```

---

## Task 8: RequestModal (Create/Edit)

**Files:**
- Create: `src/components/RequestModal.tsx`

- [ ] **Step 1: Create RequestModal**

Create `src/components/RequestModal.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { RequestWithUser } from '@/types'
import { Subject } from '@prisma/client'
import { toDateString } from '@/lib/week'

const SUBJECTS: { value: Subject; label: string }[] = [
  { value: 'NATUURKUNDE', label: 'Natuurkunde' },
  { value: 'SCHEIKUNDE',  label: 'Scheikunde' },
  { value: 'BIOLOGIE',   label: 'Biologie' },
  { value: 'PROJECT',    label: 'Project/NLT' },
]

interface Props {
  date: Date
  period: number
  subject: Subject | null
  request?: RequestWithUser    // if editing
  onClose: () => void
  onSaved: () => void
}

export default function RequestModal({ date, period, subject, request, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(request?.title ?? '')
  const [classroom, setClassroom] = useState(request?.classroom ?? '')
  const [selectedDate, setSelectedDate] = useState(request ? request.date.slice(0, 10) : toDateString(date))
  const [selectedPeriod, setSelectedPeriod] = useState(request?.period ?? period)
  const [selectedSubject, setSelectedSubject] = useState<Subject>(request?.subject ?? subject ?? 'NATUURKUNDE')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !classroom.trim()) {
      setError('Vul alle velden in.')
      return
    }
    setSaving(true)
    setError('')

    const url = request ? `/api/requests/${request.id}` : '/api/requests'
    const method = request ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        classroom: classroom.trim(),
        date: selectedDate,
        period: selectedPeriod,
        subject: selectedSubject,
      }),
    })

    setSaving(false)
    if (res.ok) {
      onSaved()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Er is iets misgegaan.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">
          {request ? 'Aanvraag bewerken' : 'Nieuwe aanvraag'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Naam van de proef *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="bijv. NS1 H4 proef 3 Lampjes"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Gewenst lokaal *</label>
            <input
              value={classroom}
              onChange={e => setClassroom(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="bijv. W107"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Datum *</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Uur *</label>
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(p => (
                  <option key={p} value={p}>{p}e uur</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Vak *</label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value as Subject)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors">
              Annuleren
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium transition-colors">
              {saving ? 'Opslaan…' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/
git commit -m "feat: RequestModal for creating and editing requests"
```

---

## Task 9: RequestDetailPanel

**Files:**
- Create: `src/components/RequestDetailPanel.tsx`

- [ ] **Step 1: Create RequestDetailPanel**

Create `src/components/RequestDetailPanel.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { Session } from 'next-auth'
import { RequestWithUser } from '@/types'
import { Status } from '@prisma/client'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const STATUS_OPTIONS: { value: Status; label: string; style: string }[] = [
  { value: 'PENDING',              label: 'Aangevraagd',    style: 'bg-slate-700 text-slate-300 hover:bg-slate-600' },
  { value: 'APPROVED_WITH_TOA',    label: '✓ Met TOA',      style: 'bg-green-900 text-green-300 hover:bg-green-800 border border-green-600' },
  { value: 'APPROVED_WITHOUT_TOA', label: '◑ Zonder TOA',   style: 'bg-amber-900 text-amber-300 hover:bg-amber-800 border border-amber-600' },
  { value: 'REJECTED',             label: '✗ Afgekeurd',    style: 'bg-red-900 text-red-300 hover:bg-red-800 border border-red-600' },
]

interface Props {
  request: RequestWithUser
  session: Session
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
  onStatusChanged: () => void
}

export default function RequestDetailPanel({ request, session, onClose, onEdit, onDeleted, onStatusChanged }: Props) {
  const [deleting, setDeleting] = useState(false)
  const canModify = session.user.isTOA || session.user.isAdmin || request.createdById === session.user.id
  const canChangeStatus = session.user.isTOA || session.user.isAdmin
  const dateLabel = format(new Date(request.date), 'EEEE d MMMM yyyy', { locale: nl })

  async function handleStatus(status: Status) {
    const res = await fetch(`/api/requests/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) onStatusChanged()
  }

  async function handleDelete() {
    if (!confirm('Weet je zeker dat je deze aanvraag wilt verwijderen?')) return
    setDeleting(true)
    const res = await fetch(`/api/requests/${request.id}`, { method: 'DELETE' })
    if (res.ok) onDeleted()
    else setDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-white text-base">{request.title}</h3>
            <p className="text-slate-400 text-xs mt-0.5 capitalize">{dateLabel} · {request.period}e uur · {request.classroom}</p>
            {request.createdBy && (
              <p className="text-slate-500 text-xs mt-0.5">
                Door <strong className="text-slate-300">{request.createdBy.abbreviation.toUpperCase()}</strong> — {request.createdBy.name}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 text-lg">×</button>
        </div>

        {canChangeStatus && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleStatus(opt.value)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${opt.style} ${request.status === opt.value ? 'ring-2 ring-white/30' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {canModify && (
          <div className="flex gap-2">
            <button onClick={onEdit}
              className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium transition-colors text-blue-300">
              ✏ Bewerken
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="py-1.5 px-3 bg-red-950 hover:bg-red-900 border border-red-800 rounded text-xs font-medium transition-colors text-red-300 disabled:opacity-50">
              {deleting ? '…' : '🗑'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/
git commit -m "feat: RequestDetailPanel with status controls and delete"
```

---

## Task 10: Admin Requests API + Tab

**Files:**
- Create: `src/app/api/admin/requests/route.ts`
- Create: `src/components/admin/RequestsTab.tsx`
- Create: `tests/api/admin-requests.test.ts`

- [ ] **Step 1: Write failing tests for admin requests API**

Create `tests/api/admin-requests.test.ts`:
```typescript
import { GET, DELETE } from '@/app/api/admin/requests/route'
import { NextRequest } from 'next/server'
import * as nextAuth from 'next-auth'
import prisma from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  request: { findMany: jest.fn(), deleteMany: jest.fn() },
}))

const adminSession = { user: { id: 'a1', isAdmin: true } }
const teacherSession = { user: { id: 'u1', isAdmin: false } }

beforeEach(() => jest.clearAllMocks())

describe('GET /api/admin/requests', () => {
  it('returns 403 for non-admin', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(teacherSession)
    const res = await GET(new NextRequest('http://x/api/admin/requests'))
    expect(res.status).toBe(403)
  })

  it('returns all requests for admin', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(adminSession)
    ;(prisma.request.findMany as jest.Mock).mockResolvedValue([{ id: 'r1' }])
    const res = await GET(new NextRequest('http://x/api/admin/requests'))
    expect(res.status).toBe(200)
    expect(await res.json()).toHaveLength(1)
  })
})

describe('DELETE /api/admin/requests', () => {
  it('bulk deletes given ids', async () => {
    ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(adminSession)
    ;(prisma.request.deleteMany as jest.Mock).mockResolvedValue({ count: 2 })
    const res = await DELETE(new NextRequest('http://x', {
      method: 'DELETE',
      body: JSON.stringify({ ids: ['r1', 'r2'] }),
    }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted: 2 })
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
npx jest tests/api/admin-requests.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement admin requests API**

Create `src/app/api/admin/requests/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Subject, Status } from '@prisma/client'

const INCLUDE_USER = { createdBy: { select: { id: true, name: true, abbreviation: true } } }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const subject = searchParams.get('subject') as Subject | null
  const status = searchParams.get('status') as Status | null
  const search = searchParams.get('search') ?? ''

  const requests = await prisma.request.findMany({
    where: {
      ...(subject ? { subject } : {}),
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { createdBy: { abbreviation: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    },
    include: INCLUDE_USER,
    orderBy: [{ date: 'desc' }, { period: 'asc' }],
  })

  return NextResponse.json(requests)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  const result = await prisma.request.deleteMany({ where: { id: { in: ids } } })
  return NextResponse.json({ deleted: result.count })
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx jest tests/api/admin-requests.test.ts
```

Expected: PASS

- [ ] **Step 5: Create RequestsTab component**

Create `src/components/admin/RequestsTab.tsx`:
```typescript
'use client'
import { useState, useEffect } from 'react'
import { RequestWithUser } from '@/types'
import { Subject, Status } from '@prisma/client'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const SUBJECT_LABELS: Record<Subject, string> = {
  NATUURKUNDE: 'Natuurkunde', SCHEIKUNDE: 'Scheikunde',
  BIOLOGIE: 'Biologie', PROJECT: 'Project/NLT',
}
const STATUS_LABELS: Record<Status, string> = {
  PENDING: 'Aangevraagd', APPROVED_WITH_TOA: 'Met TOA',
  APPROVED_WITHOUT_TOA: 'Zonder TOA', REJECTED: 'Afgekeurd',
}
const STATUS_STYLES: Record<Status, string> = {
  PENDING: 'bg-slate-700 text-slate-300',
  APPROVED_WITH_TOA: 'bg-green-900 text-green-300',
  APPROVED_WITHOUT_TOA: 'bg-amber-900 text-amber-300',
  REJECTED: 'bg-red-900 text-red-300',
}

export default function RequestsTab() {
  const [requests, setRequests] = useState<RequestWithUser[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function load() {
    const params = new URLSearchParams()
    if (subject) params.set('subject', subject)
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/requests?${params}`)
    if (res.ok) setRequests(await res.json())
  }

  useEffect(() => { load() }, [subject, status, search])

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(requests.map(r => r.id)) : new Set())
  }

  async function bulkDelete() {
    if (!selected.size) return
    if (!confirm(`${selected.size} aanvragen verwijderen?`)) return
    setDeleting(true)
    await fetch('/api/admin/requests', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected] }),
    })
    setSelected(new Set())
    setDeleting(false)
    load()
  }

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <select value={subject} onChange={e => setSubject(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs">
          <option value="">Alle vakken</option>
          {Object.entries(SUBJECT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs">
          <option value="">Alle statussen</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Zoek op naam of docent…"
          className="flex-1 min-w-[150px] bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs" />
        {selected.size > 0 && (
          <button onClick={bulkDelete} disabled={deleting}
            className="px-3 py-1.5 bg-red-900 border border-red-700 text-red-300 rounded text-xs font-semibold disabled:opacity-50">
            🗑 Verwijder ({selected.size})
          </button>
        )}
      </div>

      <div className="border border-slate-700 rounded-lg overflow-hidden text-xs">
        <div className="grid bg-slate-900 border-b-2 border-slate-600 px-3 py-2 gap-2 font-semibold text-slate-500 uppercase tracking-wide text-[0.65rem]"
          style={{ gridTemplateColumns: '1.5rem 3fr 1.2fr 1fr 0.8fr 1.2fr 1.5fr' }}>
          <input type="checkbox" onChange={e => toggleAll(e.target.checked)}
            checked={selected.size === requests.length && requests.length > 0} />
          <span>Proef</span><span>Vak</span><span>Datum</span><span>Uur</span><span>Docent</span><span>Status</span>
        </div>
        {requests.length === 0 && (
          <p className="text-center text-slate-600 py-8 text-sm">Geen aanvragen gevonden</p>
        )}
        {requests.map(r => (
          <div key={r.id}
            className="grid px-3 py-2 gap-2 border-b border-slate-800 items-center hover:bg-slate-900/50"
            style={{ gridTemplateColumns: '1.5rem 3fr 1.2fr 1fr 0.8fr 1.2fr 1.5fr' }}>
            <input type="checkbox" checked={selected.has(r.id)}
              onChange={e => {
                const next = new Set(selected)
                e.target.checked ? next.add(r.id) : next.delete(r.id)
                setSelected(next)
              }} />
            <span className="text-slate-200 font-medium truncate">{r.title}</span>
            <span className="text-slate-400">{SUBJECT_LABELS[r.subject]}</span>
            <span className="text-slate-400">{format(new Date(r.date), 'd MMM', { locale: nl })}</span>
            <span className="text-slate-400">{r.period}e</span>
            <span className="text-slate-300 font-semibold">{r.createdBy?.abbreviation.toUpperCase() ?? '—'}</span>
            <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-medium inline-block ${STATUS_STYLES[r.status]}`}>
              {STATUS_LABELS[r.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/ tests/
git commit -m "feat: admin requests API and RequestsTab with bulk delete"
```

---

## Task 11: Admin Users API + Tab

**Files:**
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/api/admin/users/[id]/route.ts`
- Create: `src/app/api/admin/settings/route.ts`
- Create: `src/components/admin/UsersTab.tsx`
- Create: `src/components/admin/RegistrationToggle.tsx`
- Create: `tests/api/admin-users.test.ts`
- Create: `tests/api/admin-settings.test.ts`

- [ ] **Step 1: Write failing tests for admin users API**

Create `tests/api/admin-users.test.ts`:
```typescript
import { GET } from '@/app/api/admin/users/route'
import { PATCH, DELETE } from '@/app/api/admin/users/[id]/route'
import { NextRequest } from 'next/server'
import * as nextAuth from 'next-auth'
import prisma from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  user: { findMany: jest.fn(), update: jest.fn(), delete: jest.fn() },
}))

const adminSession = { user: { id: 'a1', isAdmin: true } }
beforeEach(() => jest.clearAllMocks())

it('GET returns 403 for non-admin', async () => {
  ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue({ user: { isAdmin: false } })
  const res = await GET(new NextRequest('http://x'))
  expect(res.status).toBe(403)
})

it('GET returns users for admin', async () => {
  ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(adminSession)
  ;(prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'u1' }])
  const res = await GET(new NextRequest('http://x'))
  expect(res.status).toBe(200)
})

it('PATCH updates user roles', async () => {
  ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(adminSession)
  ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: 'u1', isTOA: true })
  const res = await PATCH(
    new NextRequest('http://x', { method: 'PATCH', body: JSON.stringify({ isTOA: true }) }),
    { params: { id: 'u1' } }
  )
  expect(res.status).toBe(200)
})

it('DELETE removes user', async () => {
  ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(adminSession)
  ;(prisma.user.delete as jest.Mock).mockResolvedValue({})
  const res = await DELETE(new NextRequest('http://x', { method: 'DELETE' }), { params: { id: 'u1' } })
  expect(res.status).toBe(204)
})
```

- [ ] **Step 2: Run to verify fail**

```bash
npx jest tests/api/admin-users.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement admin users API**

Create `src/app/api/admin/users/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(users)
}
```

Create `src/app/api/admin/users/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { isTeacher, isTOA, isAdmin, allowed } = body

  const updateData: Record<string, boolean> = {}
  if (isTeacher !== undefined) updateData.isTeacher = isTeacher
  if (isTOA !== undefined) updateData.isTOA = isTOA
  if (isAdmin !== undefined) updateData.isAdmin = isAdmin
  if (allowed !== undefined) updateData.allowed = allowed

  const user = await prisma.user.update({ where: { id: params.id }, data: updateData })
  return NextResponse.json(user)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.user.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 4: Write + implement admin settings API**

Create `tests/api/admin-settings.test.ts`:
```typescript
import { GET, PATCH } from '@/app/api/admin/settings/route'
import { NextRequest } from 'next/server'
import * as nextAuth from 'next-auth'
import prisma from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  appSettings: { findUnique: jest.fn(), upsert: jest.fn() },
}))

const admin = { user: { isAdmin: true } }
beforeEach(() => jest.clearAllMocks())

it('GET returns settings', async () => {
  ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(admin)
  ;(prisma.appSettings.findUnique as jest.Mock).mockResolvedValue({ id: 1, registrationOpen: true })
  const res = await GET(new NextRequest('http://x'))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ id: 1, registrationOpen: true })
})

it('PATCH updates registrationOpen', async () => {
  ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(admin)
  ;(prisma.appSettings.upsert as jest.Mock).mockResolvedValue({ id: 1, registrationOpen: false })
  const res = await PATCH(new NextRequest('http://x', { method: 'PATCH', body: JSON.stringify({ registrationOpen: false }) }))
  expect(res.status).toBe(200)
})
```

Create `src/app/api/admin/settings/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } })
  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { registrationOpen } = await req.json()
  const settings = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: { registrationOpen },
    create: { id: 1, registrationOpen },
  })
  return NextResponse.json(settings)
}
```

- [ ] **Step 5: Run all admin API tests**

```bash
npx jest tests/api/admin-users.test.ts tests/api/admin-settings.test.ts
```

Expected: PASS

- [ ] **Step 6: Create RegistrationToggle component**

Create `src/components/admin/RegistrationToggle.tsx`:
```typescript
'use client'
import { useState, useEffect } from 'react'

export default function RegistrationToggle() {
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      setOpen(d.registrationOpen)
      setLoading(false)
    })
  }, [])

  async function toggle() {
    const next = !open
    setOpen(next)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationOpen: next }),
    })
  }

  return (
    <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4">
      <div>
        <p className="font-semibold text-slate-200 text-sm">Nieuwe aanmeldingen</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Wanneer uitgeschakeld kunnen nieuwe gebruikers niet voor het eerst inloggen
        </p>
      </div>
      {!loading && (
        <button onClick={toggle}
          className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <span className={open ? 'text-green-400' : 'text-red-400'}>
            {open ? 'Aanmeldingen open' : 'Aanmeldingen gesloten'}
          </span>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${open ? 'bg-green-600' : 'bg-slate-600'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${open ? 'left-5' : 'left-0.5'}`} />
          </div>
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Create UsersTab component**

Create `src/components/admin/UsersTab.tsx`:
```typescript
'use client'
import { useState, useEffect } from 'react'
import { UserRow } from '@/types'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import RegistrationToggle from './RegistrationToggle'

export default function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([])

  async function load() {
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
  }

  useEffect(() => { load() }, [])

  async function updateUser(id: string, data: Partial<UserRow>) {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    load()
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Gebruiker "${name}" verwijderen? Hun aanvragen blijven bestaan.`)) return
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <RegistrationToggle />
      <div className="border border-slate-700 rounded-lg overflow-hidden text-xs">
        <div className="grid bg-slate-900 border-b-2 border-slate-600 px-3 py-2 gap-2 font-semibold text-slate-500 uppercase tracking-wide text-[0.65rem]"
          style={{ gridTemplateColumns: '2rem 2.5fr 1rem 3fr 1.5fr 1.2fr 1.5rem' }}>
          <span></span>
          <span>Naam / E-mail</span>
          <span></span>
          <span>Rollen</span>
          <span>Toegang</span>
          <span>Lid sinds</span>
          <span></span>
        </div>
        {users.map(u => (
          <div key={u.id}
            className="grid px-3 py-2.5 gap-2 border-b border-slate-800 items-center hover:bg-slate-900/50"
            style={{ gridTemplateColumns: '2rem 2.5fr 1rem 3fr 1.5fr 1.2fr 1.5rem' }}>
            {/* Avatar */}
            {u.image
              ? <img src={u.image} className="w-7 h-7 rounded-full object-cover" alt="" />
              : <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                  {u.abbreviation.slice(0, 1).toUpperCase()}
                </div>
            }
            {/* Name + email */}
            <div>
              <p className="text-slate-200 font-medium">{u.name}</p>
              <p className="text-slate-500 text-[0.65rem]">{u.email}</p>
            </div>
            {/* Abbreviation */}
            <span className="text-slate-400 font-semibold text-[0.7rem]">{u.abbreviation.toUpperCase()}</span>
            {/* Roles */}
            <div className="flex gap-2 flex-wrap">
              {([ ['isTeacher', 'Docent'], ['isTOA', 'TOA'], ['isAdmin', 'Admin'] ] as const).map(([field, label]) => (
                <label key={field} className="flex items-center gap-1 cursor-pointer text-slate-400">
                  <input type="checkbox" checked={u[field as keyof UserRow] as boolean}
                    onChange={e => updateUser(u.id, { [field]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
            {/* Access toggle */}
            <button
              onClick={() => updateUser(u.id, { allowed: !u.allowed })}
              className={`px-2 py-1 rounded text-[0.65rem] font-semibold border transition-colors ${
                u.allowed
                  ? 'bg-green-950 border-green-700 text-green-400 hover:bg-green-900'
                  : 'bg-red-950 border-red-800 text-red-400 hover:bg-red-900'
              }`}
            >
              {u.allowed ? '✓ Toegestaan' : '✗ Geblokkeerd'}
            </button>
            {/* Since */}
            <span className="text-slate-500 text-[0.65rem]">
              {format(new Date(u.createdAt), 'd MMM yyyy', { locale: nl })}
            </span>
            {/* Delete */}
            <button
              onClick={() => deleteUser(u.id, u.name)}
              className="text-slate-600 hover:text-red-400 transition-colors text-base"
              title="Verwijder gebruiker"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add src/ tests/
git commit -m "feat: admin users API, UsersTab, RegistrationToggle, settings API"
```

---

## Task 12: Admin Page

**Files:**
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Create admin page**

Create `src/app/admin/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import RequestsTab from '@/components/admin/RequestsTab'
import UsersTab from '@/components/admin/UsersTab'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<'requests' | 'users'>('requests')

  if (status === 'loading') return null
  if (!session || !session.user.isAdmin) redirect('/natuurkunde')

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Admin</h1>
      <div className="flex gap-2 mb-4">
        {(['requests', 'users'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {t === 'requests' ? '📋 Aanvragen' : '👥 Gebruikers'}
          </button>
        ))}
      </div>
      {tab === 'requests' ? <RequestsTab /> : <UsersTab />}
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx jest
```

Expected: all tests PASS

- [ ] **Step 3: Build to check for TypeScript errors**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: admin page with requests and users tabs"
```

---

## Task 13: Deployment Config

**Files:**
- Create: `ecosystem.config.js` (PM2)
- Create: `nginx.conf` (example)
- Create: `DEPLOYMENT.md`

- [ ] **Step 1: Create PM2 config**

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'toa-planner',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
```

- [ ] **Step 2: Create Nginx config example**

Create `nginx.conf`:
```nginx
server {
    listen 80;
    server_name yourdomain.nl;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.nl;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.nl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.nl/privkey.pem;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header   X-Real-IP $remote_addr;
    }
}
```

- [ ] **Step 3: Create deployment instructions**

Create `DEPLOYMENT.md`:
```markdown
# Deployment

## Prerequisites
- Node.js 20+
- PostgreSQL 16
- PM2: `npm install -g pm2`
- Nginx + Certbot

## Steps

1. Clone repo and install:
   ```bash
   git clone <repo> && cd toa-planner-v2
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Fill in DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET,
   # GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_DOMAIN
   ```

3. Setup database:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

4. Build:
   ```bash
   npm run build
   ```

5. Start with PM2:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup  # follow the printed command to auto-start on boot
   ```

6. Configure Nginx:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/toa-planner
   sudo ln -s /etc/nginx/sites-available/toa-planner /etc/nginx/sites-enabled/
   sudo certbot --nginx -d yourdomain.nl
   sudo nginx -t && sudo systemctl reload nginx
   ```

## Google OAuth Setup

1. Go to console.cloud.google.com → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add Authorized redirect URI: `https://yourdomain.nl/api/auth/callback/google`
4. Copy Client ID and Secret to `.env`

## First Admin User

After first login, set yourself as admin via psql:
```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'youremail@school.nl';
```
```

- [ ] **Step 4: Final commit**

```bash
git add ecosystem.config.js nginx.conf DEPLOYMENT.md
git commit -m "feat: deployment config for PM2 and Nginx"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Weekly calendar Mon–Fri, periods 1–10 (Task 7)
- ✅ 4 subjects + overview tab (Tasks 5, 7)
- ✅ Click to create request (Tasks 7, 8)
- ✅ Google SSO restricted to school domain (Task 4)
- ✅ Auto-generated abbreviation from email (Tasks 3, 4)
- ✅ Status colors: grey/green/yellow/red (Tasks 7, 9)
- ✅ TOA can change status (Task 9)
- ✅ TOA/teacher can edit/delete (Tasks 6, 9)
- ✅ Multiple requests per slot stacked (Task 7)
- ✅ + button to add additional request to occupied slot (Task 7)
- ✅ Admin: requests table with filters + bulk delete (Tasks 10)
- ✅ Admin: users table with roles (multi-checkbox) + access toggle (Task 11)
- ✅ Admin: registration open/close toggle (Task 11)
- ✅ Admin: delete user (requests stay, createdBy → null) (Tasks 11, schema)
- ✅ Dark theme throughout (Tasks 5, 7, 8, 9, 10, 11, 12)
- ✅ PM2 + Nginx deployment (Task 13)
