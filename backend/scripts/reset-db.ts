import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";

// TRUNCATE ... CASCADE handles the foreign keys, so table order does not matter.
/**
 * Clears game data and sessions and restarts game ID sequences.
 * @param prisma - Database client used to clear the tables.
 * @returns A promise that resolves when the tables have been emptied.
 */
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
    .then(
      /**
       * Reports that the database reset finished.
       * Parameters: none.
       * @returns Nothing; writes the reset confirmation.
       */
      () => console.log("database wiped")
    )
    .catch(
      /**
       * Reports a reset failure and marks the process unsuccessful.
       * @param e - Error raised while clearing the database.
       * @returns Nothing; logs the error and sets the exit code.
       */
      (e) => {
        console.error(e);
        process.exitCode = 1;
      }
    )
    .finally(
      /**
       * Closes the reset database connection after completion or failure.
       * Parameters: none.
       * @returns A promise that resolves when Prisma disconnects.
       */
      () => prisma.$disconnect()
    );
}
