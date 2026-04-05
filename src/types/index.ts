import { Status } from '@prisma/client'

export type { Status }

export interface SubjectConfig {
  id: string
  name: string
  accentColor: string
  absenceDays: number[]
  sortOrder: number
}

export interface RequestWithUser {
  id: string
  title: string
  klas: string
  classroom: string
  date: string
  period: number
  periodEnd: number | null   // null = same as period
  recurringGroupId: string | null
  subject: string
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
  defaultPage: string | null
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
      defaultPage?: string | null
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
    defaultPage?: string | null
  }
}
