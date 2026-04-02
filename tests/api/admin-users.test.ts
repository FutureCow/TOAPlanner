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
