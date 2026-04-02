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
