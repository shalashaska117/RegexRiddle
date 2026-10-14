import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port,
  /**
   * Logs the API address once the server is listening.
   * Parameters: none.
   * @returns No value; writes the address to the console.
   */
  () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
