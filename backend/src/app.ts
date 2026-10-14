// Configures HTTP middleware, database-backed sessions and API routes.
import express from "express";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const PgSessionStore = connectPgSimple(session);

export const app = express();

app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(
  session({
    store: new PgSessionStore({
      conString: env.databaseUrl,
      createTableIfMissing: true,
    }),
    name: "rr.sid",
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: false, // the demo runs over plain http
    },
  }),
);
app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
