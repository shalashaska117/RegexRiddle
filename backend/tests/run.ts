// Boots the app on an ephemeral port, then runs every tests/*.test.ts in
// order. A test file throws to fail. Run via: npm run test:api
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
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
    await import(path.join(here, file));
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
