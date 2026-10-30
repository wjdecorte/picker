# Picker next steps

## Completed foundation

- [x] Move the application to `/Users/jason/Projects/picker`.
- [x] Replace the Sites/Cloudflare runtime with standalone Next.js on Node.js.
- [x] Import existing picks, cards, scores, results, wagers and metadata into PostgreSQL.
- [x] Preserve immutable historical versions, official totals and concurrent-write protection.
- [x] Add PostgreSQL migrations, a verified legacy importer and database backups.
- [x] Add a multi-stage Dockerfile and persistent Compose services.
- [x] Add README, configuration examples, Git exclusions and an MIT license.
- [x] Initialize a local Git repository; keep credentials/backups out of version control.

## Next: daily use

- [ ] Review migrated records and the Week 7 Initial/Final entry workflow.
- [ ] Refresh any outstanding game results; review provider conflicts before accepting corrections.
- [ ] Enter Week 7 handicapping picks manually; do not auto-generate selections.
- [ ] Add a score/schedule worker with retries, rate limits, final-only updates and job history.
- [ ] Generalize schedule creation beyond the bundled Week 7 workspace.
- [ ] Add a first-run state that can start empty instead of using the bundled historical seed.
- [ ] Add a PostgreSQL export/restore command and an automated restore drill.
- [ ] Set up encrypted/off-device backups and a retention policy.

## Before remote deployment

- [ ] Add single-owner sign-in, authenticated reads/writes and secure sessions.
- [ ] Add record-level authorization before considering multiple users.
- [ ] Add request validation/rate limiting and structured server error reporting.
- [ ] Choose hosting, configure TLS/reverse proxy and restrict PostgreSQL access.
- [ ] Use a least-privilege runtime database role separate from the migration owner.
- [x] Add CI for unit tests, real PostgreSQL integration tests, type checking and multi-platform Docker publishing.
- [ ] Add dependency/container scanning and review unused starter components/dependencies.
- [x] Connect the GitHub repository and push the application source.
- [ ] Publish only after explicit approval.

## Analytics and data quality

- [x] Add ESPN pregame sportsbook quotes without changing saved pick lines.
- [ ] Add a licensed multi-book consensus adapter if needed.
- [ ] Add closing-line snapshots and test CLV with side changes.
- [ ] Add injury/weather adapters with source and observation timestamps.
- [ ] Compare initial/final performance across multiple weeks and seasons.
- [ ] Expand automated browser coverage for mobile forms, keyboard use and accessible tables.
- [ ] Self-host fonts for fully offline/local rendering.
- [x] Immutable Sunday recheck comparison with server-time eligibility, excluded-proposal audit and independent ATS/Best Bet metrics.
- [ ] Add optional trusted historical odds archives with bookmaker update timestamps; retain unknown provenance for user-proposed historical lines.
- [x] Import the user-supplied Week 8 October 28 INITIAL card atomically on NAS app update, with separate source and entry timestamps.
- [x] In-app weekly schedule loading, OpenAI generation, preserved manual overrides and three-view workspace.
- [x] Deduplicated model requests, per-week generation lock, second kickoff check, immutable model provenance and independent grading.
- [ ] Add the user's OpenAI key to the NAS environment and update Compose mappings; pull/recreate the app, then verify a live generation.
- [ ] Integrate verified injury, weather and team-performance evidence before treating model confidence as richer than a line-only assessment.
