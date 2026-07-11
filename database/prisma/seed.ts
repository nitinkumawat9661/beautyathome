import { PrismaPg } from '@prisma/adapter-pg';

import { CityStatus, PrismaClient } from '../generated/prisma/client.js';

const SIKAR_CITY_ID = '5a4cb4d4-6226-4cb0-9bcb-f0054e5b4cf8';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to seed reference data.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg(databaseUrl),
  });

  try {
    await prisma.city.upsert({
      where: { slug: 'sikar-rajasthan' },
      create: {
        id: SIKAR_CITY_ID,
        name: 'Sikar',
        normalizedName: 'sikar',
        slug: 'sikar-rajasthan',
        state: 'Rajasthan',
        countryCode: 'IN',
        timeZone: 'Asia/Kolkata',
        status: CityStatus.ACTIVE,
      },
      update: {
        name: 'Sikar',
        normalizedName: 'sikar',
        state: 'Rajasthan',
        countryCode: 'IN',
        timeZone: 'Asia/Kolkata',
        status: CityStatus.ACTIVE,
      },
    });
    console.info('Seeded the Sikar launch city.');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Reference data seeding failed.');
  process.exitCode = 1;
});
