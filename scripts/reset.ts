/**
 * Clears every record and reinstalls the seeded bank, staff and portfolio.
 * Operates on the application's own data; it does not alter the schema.
 */
import { resetDatabase } from "../src/server/seedDatabase";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

resetDatabase()
  .then((r) => console.log(`Reset complete. Seeded ${r.businesses ?? 0} businesses, ${r.applications ?? 0} applications, ${r.auditEvents ?? 0} audit events.`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
