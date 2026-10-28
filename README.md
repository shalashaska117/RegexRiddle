# RegexRiddle

A web game about regular expressions. Each riddle gives you one string that matches
a secret regex and one that does not. Write a pattern that accepts the hidden
positive controls and rejects the negative ones; the server scores each attempt
without revealing those strings.

Built by Pietro Pellegrino (N86004722) for the Web Technologies course,
a.y. 2025/26, track 4.D.

## Playing

Register an account to solve riddles or publish your own. Each attempt shows how
many positive and negative controls it handled correctly, and stays in your
attempt history. A riddle is solved when every control passes. Your regex does
not have to be identical to the author's pattern.

Authors cannot attempt their own riddles. The leaderboard ranks players by
riddles solved, then by the lowest average number of attempts per solved riddle.
Profiles support avatars and password changes.

The app includes a regex tutorial and a tester that uses the same server-side
engine as the game. Accessibility settings include adjustable text size, a
high-contrast theme and OpenDyslexic fonts.

All user patterns run through RE2 and match the whole string. Backreferences and
lookaround are unsupported. Enter patterns without surrounding `/` delimiters;
for example, `[a-z]+` matches `hello` but not `hello123`.

## Stack and layout

- `backend/`: Express 5 REST API in TypeScript, Prisma and PostgreSQL 17.
  Passwords use Argon2; cookie sessions are stored in PostgreSQL.
- `frontend/`: Vue 3 application with TypeScript, Vite, Pinia and Vue Router.
- `e2e/`: Playwright tests for the browser flows.
- `docs/`: project PDFs in English and Italian, with LaTeX sources.

## Requirements

- Node.js 22 or newer and npm (`.nvmrc` selects Node.js 22).
- Docker with Compose v2; on Windows, start Docker Desktop first.
- Bash for the commands below. On Windows, use Git Bash, or WSL with Node.js
  and Docker access configured inside WSL.

The local setup uses ports 5173 (frontend), 3000 (API) and 5432 (PostgreSQL).
The first installation needs an internet connection to download dependencies
and the database image.

## Run locally

Run the following commands in Bash (Git Bash on Windows). Start the database
from the project root:

```bash
docker compose up -d --wait --wait-timeout 90 db
```

Prepare the backend:

```bash
cd backend
npm ci
cp -n .env.example .env
```

In `backend/.env`, set `SESSION_SECRET` to a long random value. You can generate
one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
The example `DATABASE_URL` matches the local Docker database. Then, from
`backend/`:

```bash
npx prisma generate
npx prisma migrate deploy
npm run dev
```

In another terminal, from the project root:

```bash
cd frontend
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). Vite proxies `/api` requests to
[localhost:3000](http://localhost:3000), so the browser uses one origin.
These commands start the local development setup.

### Demo data

Setup does not load demo data. Once the migrations are applied, run these
commands in another terminal from the project root:

```bash
cd backend
npx prisma db seed
```

The seed deletes all existing game data and sessions before creating the demo
accounts, riddles and attempts. Use it only when you want to reset the demo.
Log in with username `demo` and password `Demo-password`. All seeded accounts
use that password.

### Stop the app

Press Ctrl+C in each application terminal. To stop PostgreSQL and remove its
container, run this from the project root:

```bash
docker compose down
```

The database volume is kept, so accounts and game progress survive the next
startup. `docker compose down --volumes` also deletes the database volume and
all its data.

## Checks

Compile the backend and type-check and build the frontend, from the project root:

```bash
(cd backend && npm run build)
(cd frontend && npm run build)
```

Run the API suite with PostgreSQL running and the backend configuration and
migrations in place:

```bash
cd backend
npm run test:api
```

The API suite starts its own HTTP server on an available port and writes test
data to the configured database.

For the browser suite, keep both application servers running. From the project
root:

```bash
cd e2e
npm ci
npx playwright install chromium
npm test
```

The browser suite resets the configured database before running, including game
data and sessions. Use a disposable local database for tests. To restore the
demo afterwards, run `npx prisma db seed` from `backend/`.

## Project documentation

- [English PDF](docs/documentation-en.pdf)
- [LaTeX sources](docs/latex/)
