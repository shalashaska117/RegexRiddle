# E2E tests

Running the suite wipes the local dev database (global setup runs `npm run db:reset` in `backend/`); reseed with `npx prisma db seed` in `backend/` afterwards. Set `SKIP_DB_RESET=1` to keep the current data when running a single file.
