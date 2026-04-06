/**
 * Multi-tenant school support.
 *
 * Schools are configured in schools.json at the project root (gitignored).
 * Each school gets its own subdomain (e.g. schoola.toaplanner.nl) which maps
 * to a dedicated PostgreSQL database.
 *
 * Falls back to .env variables for single-school / legacy setups.
 */

import fs from 'fs'
import path from 'path'
import { headers } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

export interface SchoolConfig {
  name: string
  databaseUrl: string
  allowedDomain: string
  googleClientId?: string
  googleClientSecret?: string
  azureClientId?: string
  azureClientSecret?: string
  azureTenantId?: string
}

// Load schools.json once at startup
let _schools: Record<string, SchoolConfig> | null = null

function loadSchools(): Record<string, SchoolConfig> {
  if (_schools) return _schools
  try {
    const p = path.join(process.cwd(), 'schools.json')
    _schools = JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    _schools = {}
  }
  return _schools!
}

/** Extract school slug from the current request's Host header. */
export function getSchoolSlug(): string {
  const headersList = headers()
  const host = (
    headersList.get('x-forwarded-host') ?? headersList.get('host') ?? ''
  ).split(':')[0] // strip port

  // schoola.toaplanner.nl → "schoola"
  const parts = host.split('.')
  if (parts.length >= 3) return parts[0]

  // localhost or bare domain → DEFAULT_SCHOOL env var or first entry in schools.json
  const schools = loadSchools()
  return process.env.DEFAULT_SCHOOL ?? Object.keys(schools)[0] ?? '_env'
}

/** Get config for a school slug. Falls back to .env for legacy setups. */
export function getSchoolConfig(slug: string): SchoolConfig {
  const schools = loadSchools()
  if (schools[slug]) return schools[slug]

  // Fallback: single-school .env setup
  return {
    name: process.env.SCHOOL_NAME ?? 'School',
    databaseUrl: process.env.DATABASE_URL ?? '',
    allowedDomain: process.env.ALLOWED_DOMAIN ?? '',
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    azureClientId: process.env.AZURE_AD_CLIENT_ID,
    azureClientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    azureTenantId: process.env.AZURE_AD_TENANT_ID,
  }
}

// Cache one PrismaClient per database URL
const prismaClients = new Map<string, PrismaClient>()

/** Get (or create) the Prisma client for a school. */
export function getPrisma(slug: string): PrismaClient {
  const config = getSchoolConfig(slug)
  const key = config.databaseUrl

  if (!prismaClients.has(key)) {
    const adapter = new PrismaPg({ connectionString: config.databaseUrl })
    prismaClients.set(key, new PrismaClient({ adapter }))
  }
  return prismaClients.get(key)!
}
