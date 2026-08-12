import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";

// Wipes every app table plus the express-session table and restarts the id
// sequences, so the next seed gets ids from 1. TRUNCATE ... CASCADE covers
// the foreign keys, so the table order here does not matter.
export async function truncateAll(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Attempt", "ControlString", "Challenge", "User" RESTART IDENTITY CASCADE',
  );
  // connect-pg-simple owns this table, so it is missing until the backend
  // has run once; skip it then instead of failing
  await prisma.$executeRawUnsafe(
    "DO $$ BEGIN IF to_regclass('session') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE session'; END IF; END $$",
  );
}

const runAsScript =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (runAsScript) {
  const prisma = new PrismaClient();
  truncateAll(prisma)
    .then(() => console.log("database wiped"))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
