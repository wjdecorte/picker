# Product
<!-- impeccable:product-schema 1 -->
## Platform
web
## Stack
Standalone Next.js/React on Node.js 24, with PostgreSQL durable storage and Docker Compose for the local personal dashboard.
## Users
Personal NFL handicapping group reviewing weekly ATS selections on desktop, tablet and phone.
## Product Purpose
Preserve picks at selection time; grade results; evaluate Best Bets and confidence; compare closing lines.
## Capabilities and Constraints
Workbook is the initial source. Week 5 is complete; Week 6 has 13 final games with Monday pending. Immutable Wednesday and Sunday selection snapshots support parallel revision comparisons. Week 7 contains 14 scheduled games; the user’s initial card is stored as a sealed snapshot on the NAS. Missing times and lines must remain unknown. Preview before publication. Server score and pregame-odds refresh runs on dashboard load and while it is open; background scheduling is not yet configured. Manual selection entry remains available; integrations use separate adapters. All Picks includes every prediction for accuracy. Recommended Plays definitively includes Best Bet, Play, Pick and explicitly activated Conditional selections; it excludes Lean, Pass, Avoid and inactive Conditional selections. Best Bets and Actual Bets are separate performance categories. Model P/L uses Recommended Plays at flat 1u risk and -110 odds. Actual P/L includes only recorded wagers, using their own team, line, American odds and stake. Pushes are excluded from win-rate denominators. Optional wager tracking never requires a bet for a prediction. Preserve original selections and revision history; lock historical selection fields at recorded kickoff, with reasoned and audited administrator overrides. The Dashboard is an executive summary; Manage picks retains the complete editable card.
## Brand Commitments
NFL Picks Dashboard. Professional sports analytics. Navy/charcoal navigation and light content, compact cards, minimal clutter.
## Evidence on Hand
NFL_Picks_Dashboard.xlsx contains 27 selections, no kickoff times or closing lines.

## Standalone application (October 22, 2026)

Project: `/Users/jason/Projects/picker`. Runs as standalone Next.js/Node.js with PostgreSQL and Docker Compose. Original records were imported and checked field by field; SQLite backups are retained privately. Sites/Cloudflare identity and storage dependencies are removed. Current deployment is single-user on a trusted home network, with opt-in private-LAN access, exact origin/Host checks and optional server service-token access. Page-open score polling remains; background scheduling and remote sign-in are pending in TODO.md.

Current pregame spreads use ESPN sportsbook quotes (DraftKings preferred), with per-quote provenance, check time and stale labeling. Odds are matched to existing games and projected from the selected team’s side. Missing quotes retain the last value. Post-kickoff updates stop; saved picks and closing spreads are never inferred or overwritten.

Sunday snapshot comparisons preserve all original versions, record server timestamps and odds provenance, exclude underway/final games, and grade eligible snapshots independently. User-supplied historical proposed lines are explicitly unverified odds. The October 25 Week 7 NAS recheck contains four eligible pregame versions recorded at 4:24:16 PM ET, with ten excluded proposals retained as audit evidence.

## In-app weekly workflow (October 29, 2026)
The user approved OpenAI and three main views: This Week, History, Settings. All week loading, model generation, manual overrides, score entry and weekly notes now happen in the app. The old five-view interface is consolidated; detailed analytics and snapshot comparison are disclosures within History. Server-only OPENAI_API_KEY and OPENAI_MODEL configure the Responses API; the key never enters client state or exports. Generation is user-triggered, structured and validated against fetched ESPN games and lines, locked per week and deduplicated by request ID. The model sees only public schedule/line inputs, not wagers or the full personal history. Injuries, weather and current team-performance evidence are unavailable and are explicitly labeled. Each generated card and manual override is immutable. Regeneration preserves active manual overrides; picks that start during generation are excluded after a second provider check. The NAS requires a new image and updated Compose environment mappings; no actual OpenAI key was supplied during implementation.

## ChatGPT plan integration (October 31, 2026)
Settings also supports official Sign in with ChatGPT for eligible subscription inference. OpenAI requires a 127.0.0.1 browser-local callback; for NAS usage a one-time computer-to-NAS SSH tunnel forwards that callback to the app. The NAS owns the stable host ID, protected credential volume and subsequent refreshes. Account registrations and rotating tokens are stored atomically outside PostgreSQL pick data/exports. Users explicitly choose ChatGPT or separate API billing; there is no automatic fallback. Model choices come from the active subscriber's catalog. Subscription inference streams through completion before any pick is saved; existing sealed-history and kickoff locks remain. Real Plus sign-in requires the user's authentication and consent; automated tests use signed synthetic identities and mocked OpenAI responses.
