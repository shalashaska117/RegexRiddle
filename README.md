# RegexRiddle

Web platform for regex riddles, built by Pietro Pellegrino (matricola
N86004722) for the Web Technologies course (a.y. 2025/26, track 4.D). Registered users publish challenges built around a
secret regular expression: players see one example string that matches it and
one that does not, and try to write a regex with the same behaviour. The server
scores every attempt against a set of secret control strings and reports how
many positive and negative controls the attempt handled correctly.

## Layout

- `backend/`: REST API. Node.js, Express 5, TypeScript, Prisma, PostgreSQL.
- `frontend/`: single-page application. Vue 3, Vite, Pinia, Vue Router, TypeScript.
- `e2e/`: Playwright end-to-end tests.
- `docs/`: requirements, architecture, API contract, data model, security notes.

## Prerequisites

- Node.js 22 or newer
- Docker (runs PostgreSQL)

## Run

Database:

    docker compose up -d db

Backend, on http://localhost:3000:

    cd backend
    npm install
    cp .env.example .env
    npx prisma migrate dev
    npm run dev

Frontend, on http://localhost:5173 (proxies `/api` to the backend):

    cd frontend
    npm install
    npm run dev

End-to-end tests, with backend and frontend running:

    cd e2e
    npm install
    npx playwright install
    npm test

## Status

Scaffold: layout, tooling and documentation are in place; the game features are
being implemented. `docs/requirements.md` tracks the binding spec rules.
