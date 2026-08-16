// Boots the app on an ephemeral port, then runs every tests/*.test.ts in
// order. A test file throws to fail. Run via: npm run test:api
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

// the suite registers and logs in more than 10 times per run, which the
// default per-route auth limit would 429; raise it unless the environment
// pins a value on purpose. Must happen before the app import reads env.
process.env.AUTH_RATE_LIMIT_MAX ??= "1000";

const { app } = await import("../src/app.js");

const server = app.listen(0);
await new Promise((resolve) => server.once("listening", resolve));
const addr = server.address();
if (addr === null || typeof addr === "string") throw new Error("no port assigned");
process.env.TEST_BASE_URL = `http://127.0.0.1:${addr.port}`;

let failed = 0;
const files = readdirSync(here).filter((f) => f.endsWith(".test.ts")).sort();
for (const file of files) {
  try {
    // as a URL, not a path: a Windows path starts with a drive letter, which
    // the ESM loader reads as an unknown protocol
    await import(pathToFileURL(path.join(here, file)).href);
    console.log(`ok   ${file}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${file}`);
    console.error(error);
  }
}

server.close();
if (failed > 0) {
  process.exit(1);
}
console.log(`all api tests passed (${files.length} files)`);
// exit explicitly: the session store keeps a pg pool and a prune timer
// alive, which would otherwise hang the runner
process.exit(0);
