import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Wipes the local dev database before the run. Writers verifying a single
// file concurrently set SKIP_DB_RESET so only the full run resets.
/**
 * Reset the development database before the suite unless SKIP_DB_RESET is set.
 * Parameters: none.
 * @returns Nothing; runs the reset script or skips it.
 */
export default function globalSetup(): void {
  if (process.env.SKIP_DB_RESET) return;
  const backendDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "backend",
  );
  execSync("npm run db:reset", { cwd: backendDir, stdio: "inherit" });
}
