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
