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

it('PATCH slaat periodStartTime en periodDuration op', async () => {
  ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(admin)
  ;(prisma.appSettings.upsert as jest.Mock).mockResolvedValue({
    id: 1, periodStartTime: '08:30', periodDuration: 50,
  })
  const res = await PATCH(new NextRequest('http://x', {
    method: 'PATCH',
    body: JSON.stringify({ periodStartTime: '08:30', periodDuration: 50 }),
  }))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(prisma.appSettings.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      update: expect.objectContaining({ periodStartTime: '08:30', periodDuration: 50 }),
    })
  )
})

it('PATCH slaat breaks op als JSON array', async () => {
  ;(nextAuth.getServerSession as jest.Mock).mockResolvedValue(admin)
  ;(prisma.appSettings.upsert as jest.Mock).mockResolvedValue({ id: 1 })
  const breaks = [{ afterPeriod: 3, duration: 15, label: 'Kleine pauze' }]
  const res = await PATCH(new NextRequest('http://x', {
    method: 'PATCH',
    body: JSON.stringify({ breaks }),
  }))
  expect(res.status).toBe(200)
  expect(prisma.appSettings.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      update: expect.objectContaining({ breaks }),
    })
  )
})
