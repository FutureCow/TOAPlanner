import { buildSignInResult } from '@/lib/auth'
import prisma from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  user: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
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
