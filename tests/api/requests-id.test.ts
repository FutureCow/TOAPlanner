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
