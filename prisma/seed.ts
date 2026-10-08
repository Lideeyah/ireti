/**
 * CLI entry point for seeding. The work itself lives in `src/server/seedDatabase.ts`
 * so the application can reseed itself without shelling out.
 */
import { seedDatabase } from "../src/server/seedDatabase";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

seedDatabase()
  .then((r) => console.log(r.portfolio ? `Seeded ${r.businesses} businesses, ${r.applications} applications, ${r.auditEvents} audit events.` : "Accounts and policy are in place; portfolio already seeded."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
