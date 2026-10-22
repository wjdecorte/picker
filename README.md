# Picker · NFL Picks Dashboard

A personal NFL against-the-spread dashboard for weekly picks, immutable initial/final cards, actual wagers, score imports, and performance analysis. The existing interface and historical records are preserved.

## Start with Docker

Requires Docker Desktop with Compose. Node.js 24 is needed only for local development and the environment setup helper.

```sh
cd /Users/jason/Projects/picker
node scripts/setup-env.mjs
docker compose up -d --build
```

Open **http://localhost:3000**. Containers restart automatically after Docker restarts. The app listens only on this Mac. PostgreSQL has a persistent named volume and is not exposed to the network. Migrations run before the app starts; Compose waits for the database health check.

The local `.env` has already been generated with random credentials. `setup-env.mjs` never overwrites it. `.env.example` documents each setting. If `APP_PORT` changes, update `APP_ORIGIN` to the matching browser URL. Passwords used in the connection URL must be URL-safe; the setup helper generates hex values.

```sh
docker compose ps                 # status and health
docker compose logs --tail=100 app
docker compose stop              # stop without removing saved data
docker compose up -d             # start again
```

The database lives in the `picker_postgres_data` Docker volume. `docker compose down` preserves it. `docker compose down -v` deletes it; do not use that command when retaining picks.

## Data migrated from the previous dashboard

The existing SQLite database was backed up, then imported into PostgreSQL and checked field by field: **41 games, 5 cards, 41 saved pick versions, 39 graded version results, and 0 actual wagers** at migration time. Week 5 records, Week 6 initial and Sunday snapshots, actual-bet separation, notes, scores, and metadata are retained. Migration did not retrieve new scores or invent Week 7 picks.

Private recovery files are in ignored `backups/`: `legacy-dashboard.sqlite`, `legacy-export.json`, and PostgreSQL dumps. These are intentionally excluded from Git and Docker images. A separate original-source/database backup also remains in the former Codex workspace. A fresh clone does not contain the private database backup.

A fresh empty database initializes from the bundled historical workbook/schedule seed on first data access. To restore the **exact migrated state**, import the legacy backup into a fresh migrated database **before opening the dashboard**:

```sh
node scripts/setup-env.mjs
docker compose up -d --build db
docker compose build app
docker compose run --rm -v "$PWD/backups:/import:ro" app \
  node scripts/import-legacy.mjs /import/legacy-export.json
docker compose up -d app
```

Import refuses to overwrite a nonempty dashboard. It verifies every original field and JSON payload before committing. Historical SQL migrations are not reused: PostgreSQL has its own migration history in `db/migrations/`.

## Local development

```sh
npm ci
npm run setup
# Expose PostgreSQL on this Mac only at port 5433:
docker compose -f compose.yaml -f compose.dev.yaml up -d db
npm run db:migrate
docker compose stop app           # free port 3000 if the container app is running
npm run dev
```

Open http://localhost:3000. `DATABASE_URL` in `.env` points to the optional host database port; Compose overrides it with the internal `db:5432` address for the app container. The development override is not required for normal Docker use.

```sh
npm test                         # grading, historical integrity, provider validation, access rules
npm run test:db                   # real PostgreSQL migrations, transactions, triggers, and API writes
TEST_LEGACY_EXPORT=backups/legacy-export.json npm run test:db
npm run typecheck
npm run build
```

Database tests create and remove a uniquely named test schema in the configured database; they do not modify application tables. They need a database user with CREATE SCHEMA rights. A test with `TEST_LEGACY_EXPORT` additionally imports and checks a private backup in that isolated schema. `test:db` skips when DATABASE_URL is absent; run it against PostgreSQL for full verification.

## Database and application structure

```text
app/                         Existing dashboard UI, grading, and feed logic
app/api/data/route.ts        Data retrieval, scores, pick entry, revision card actions
app/api/results/route.ts     Server-side ESPN final-score refresh
app/api/health/route.ts      App/database readiness
app/repository.ts            PostgreSQL persistence and official-pick projections
db/client.ts                Connection pool
db/migrations/              Ordered SQL migrations with recorded checksums
scripts/migrate.mjs         Transactional migration runner with advisory locking
scripts/import-legacy.mjs   Verified, non-overwriting SQLite-export importer
scripts/backup-db.sh         PostgreSQL custom-format backups
tests/                      Domain, access, and PostgreSQL integration tests
Dockerfile                   Multi-stage Next.js standalone image, non-root runtime
compose.yaml                 Local app + persistent PostgreSQL
compose.dev.yaml             Optional local database port for npm development
TODO.md                      Prioritized next steps
```

The six main tables are `dashboard` (metadata and optimistic version), `games`, `pick_cards`, `pick_versions`, `pick_results`, and `actual_bets`. Game scores are stored once; predictions reference games. Original lines remain on each immutable version. PostgreSQL triggers reject updates/deletes of saved prediction rows and sealed cards. Foreign keys enforce official-version and actual-wager/game relationships. A transactional compare-and-swap write prevents stale sessions from partially overwriting newer work; reads use a consistent snapshot.

All Picks, Recommended Plays, Best Bets, and Actual Bets are distinct populations. ATS outcome = picked team’s score margin + that version’s saved spread. Pushes are excluded from win percentage. Recommended model P/L risks 1u at -110 (win +0.9091u, loss -1u). Actual P/L uses the wager’s team, line, odds, and stake.

## Scores and access

**Refresh results** calls ESPN from the server. Pending games are not graded from placeholder 0–0 scores. Verified finals are not repeatedly rewritten; conflicting scores require review. Page-open polling runs every 90 seconds. The status bar displays the latest successful check in ET. There is no background worker yet; closed-browser updates are on the to-do list. Odds, injury, weather, and closing-line feeds remain manual.

This setup is a **single-user local app**. The Compose port binds to `127.0.0.1`; no service was published. Writes enforce the configured origin and local request address. The optional `RESULTS_SERVICE_KEY` permits authenticated non-browser service calls; legacy Sites identity headers are no longer trusted. There is no remote browser sign-in yet. Add authentication and read authorization before deploying to a shared/public host; see `TODO.md`. Keep service/database secrets server-side, outside Git.

## Back up and recover

```sh
npm run db:backup
# Or: sh scripts/backup-db.sh
```

This creates a dated private `backups/*.dump` with PostgreSQL’s `pg_dump`. Keep copies outside the project/Docker disk. Restore into a fresh database with PostgreSQL 17’s `pg_restore`, then compare counts and records before switching the application to it. Never overwrite the only working database while testing a restore.

## License and references

Application code is licensed under [MIT](LICENSE). Third-party libraries and remotely loaded fonts retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). NFL and team names are descriptive; no affiliation is claimed.

Implementation references: [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), [node-postgres transactions](https://node-postgres.com/features/transactions), and the [official PostgreSQL image](https://hub.docker.com/_/postgres).
