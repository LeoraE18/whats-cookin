# What's Cookin'?

What's Cookin'? is a responsive recipe discovery and cooking app built with React, TypeScript, Vite, Express, PostgreSQL and OpenAI's server-side API. The current seed contains 15 original demonstration recipes across breakfast, lunch, dinner, snacks and drinks. They have community ratings only after users submit them; the seed contains no claimed ratings, professional testing or nutrition facts.

Food artwork in `client/public/images/` is original vector illustration created for this app. It is not photography. The app does not request or hotlink third-party food photos. Do not describe the illustrations as photographs.

## Requirements and startup

- Node.js 20+ and npm 10+
- Docker Compose with PostgreSQL 17, or PostgreSQL 14+

1. Copy `.env.example` to `.env`. Set a unique `JWT_SECRET` with at least 32 random characters, choose a local `POSTGRES_PASSWORD`, and set `DATABASE_URL` to `postgresql://cookin:<your-password>@localhost:5432/whats_cookin` using that same password.
2. Start the bundled database: `docker compose up -d db`.
3. Install packages: `npm install`.
4. Initialize and seed PostgreSQL: `npm run db:migrate` then `npm run db:seed`.
5. Start the frontend and API: `npm run dev`.

The client runs at http://localhost:5173, API at http://localhost:4000, and health check at `/api/health`.

## Configuration

| Variable | Use |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string; set locally in `.env`, supplied by Render in deployment |
| `POSTGRES_PASSWORD` | Local Compose database password; set locally in `.env` |
| `JWT_SECRET` | Seven-day bearer token signing key; production requires 32+ characters |
| `CLIENT_ORIGIN` | Exact allowed browser origin for CORS |
| `API_PORT` | API port; defaults to 4000 |
| `OPENAI_API_KEY` | Optional server-only key for ingredient suggestions |
| `OPENAI_MODEL` | Optional model override; defaults to `gpt-4o-mini` |

Without an OpenAI key, the rest of the app remains available and the substitution assistant explains how to configure itself. The key is never sent to the browser. AI suggestions are checked for required response fields, include uncertainty, and are presented as advice rather than allergy guarantees.

## Commands

```sh
npm run dev
npm run build
npm test
npm audit
npm run db:migrate
npm run db:seed
```

## Render deployment

The repository includes a `render.yaml` Blueprint for a free static site, free Node web service, and free PostgreSQL database. The API runs the idempotent schema migration before each start; recipe seed data is never run automatically. After the first successful deploy, run `npm run db:seed` once from the API service's Render Shell if you want the included recipe collection. The seed uses upserts, so rerunning it does not create duplicate seed records, but it refreshes the seeded recipes and their ingredient/category/diet links.

In the Render Blueprint, `VITE_API_URL`, `CLIENT_ORIGIN`, and `DATABASE_URL` are wired from the sibling service/database URLs, and Render generates `JWT_SECRET`. Add `OPENAI_API_KEY` manually to the API service only if you want AI substitutions; it is optional. If connecting to PostgreSQL from outside Render, use the external URL with `sslmode=require`; Render services use the database's internal URL.

Render's free PostgreSQL plan is available but expires after 30 days, has 1 GB of storage, and does not include backups. Free web services can sleep when idle. Treat this setup as a preview/hobby deployment, not durable storage for real user data. The Blueprint has automatic deploys disabled so pushes do not deploy until you enable them.

Server tests run the schema and seed against embedded PGlite, then exercise the Express API over HTTP. This lets the migration and API tests run without a developer's local PostgreSQL password. For app usage, the PostgreSQL credentials in `.env` still need to point to a running server.

## Features

- Search and combined database filters for category, ingredient, cuisine, difficulty, time, servings, community rating and reviewed dietary labels.
- Recipe detail with original source attribution, yield scaling, interactive ingredient help, ratings and mobile cooking mode with an in-page timer.
- Accounts, password hashing, database-checked roles and account suspension, saved recipes and per-user pantry.
- Pantry matching groups results by all ingredients available, one or two missing, or more missing; ingredient word boundaries prevent substring false matches.
- Seven-day meal plans persist by user, support serving changes and moving entries, and can build a shopping list. Reconciled name/unit duplicates combine; pantry items are omitted.
- Admin page for recipe create/edit/delete/approval, source/category/diet/ingredient records, user role/status management, complaint triage and live quality summaries.
- AI substitutions use the full recipe and saved preferences, validate that the requested ingredient is in the recipe, enforce a structured response and keep the original recipe unchanged.

## API outline

- `GET /api/health`, `/api/categories`, `/api/dietary-labels`, `/api/cuisines`, `/api/recipes`
- `POST /api/auth/register`, `/api/auth/login`; `GET /api/auth/me`; `PUT /api/auth/preferences`
- `GET /api/recipes/:id`; `POST /api/recipes/:id/favorite`, `/rating`, `/report`; `GET /api/favorites`
- `GET/PUT /api/pantry`; `POST /api/match`
- `GET/POST /api/meal-plan`; `PUT/DELETE /api/meal-plan/:entryId`
- `GET /api/shopping-list`; `POST /api/shopping-list/from-plan`; item add/update/delete routes
- `POST /api/ai/substitute`
- Admin-only `/api/admin/*` routes cover overview, recipe CRUD and approval, sources, categories, dietary labels, ingredients, users and complaint review.

Private endpoints use `Authorization: Bearer <token>`. Admin access is checked against the current database role on every request; changing a user's role takes effect immediately. To grant the first admin, update the trusted account's `users.role` in PostgreSQL. There is no public role assignment endpoint.

## Dietary data and source policy

Seed recipe labels are manually reviewed against their complete ingredient lists; the recipe page says cross-contamination is not assessed. Admins must verify ingredient records before assigning labels to a recipe. Allergen arrays describe known listed allergens, not production-site exposure. No nutrition facts are generated. Seed recipes are original and have an original source record. Admin image selection is limited to the included local illustrations.

## Remaining limits

- The assets are original vector illustrations rather than food photography. No image upload or commercial photo-licensing workflow is included.
- Admin CRUD APIs support the source/category/diet/ingredient records; the dashboard has create/delete or verification controls for those records, but not a rich editor for every field.
- The recipe entry form uses JSON for ingredient rows. User comments are stored but the public detail page does not yet show a review feed.
- OAuth, email verification/password reset, search suggestions/history, recipe imports, and analytics beyond live aggregate counts are not included.
- Integration tests use embedded PostgreSQL, not the developer's external PostgreSQL service; provide working local credentials to run the CLI migration/seed against that server.
