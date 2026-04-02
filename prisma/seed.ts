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
