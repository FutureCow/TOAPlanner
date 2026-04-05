import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const DEFAULT_SUBJECTS = [
  { id: 'natuurkunde', name: 'Natuurkunde', accentColor: '#2563eb', absenceDays: [], sortOrder: 0 },
  { id: 'scheikunde',  name: 'Scheikunde',  accentColor: '#16a34a', absenceDays: [], sortOrder: 1 },
  { id: 'biologie',   name: 'Biologie',    accentColor: '#9333ea', absenceDays: [], sortOrder: 2 },
  { id: 'project',    name: 'Project/NLT', accentColor: '#ea580c', absenceDays: [], sortOrder: 3 },
]

async function main() {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, registrationOpen: true },
  })
  console.log('Seeded AppSettings')

  for (const s of DEFAULT_SUBJECTS) {
    await prisma.subjectConfig.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    })
  }
  console.log('Seeded SubjectConfig (4 subjects)')
}

main().catch(console.error).finally(() => prisma.$disconnect())
