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
Workbook is the initial source. Week 5 is complete; Week 6 has 13 final games with Monday pending. Immutable Wednesday and Sunday selection snapshots support parallel revision comparisons. Week 7 contains 14 scheduled games and no selections. Missing times and lines must remain unknown. Preview before publication. Server score refresh runs only while the dashboard is open; background scheduling is not yet configured. Manual selection entry remains available; integrations use separate adapters. All Picks includes every prediction for accuracy. Recommended Plays definitively includes Best Bet, Play, Pick and explicitly activated Conditional selections; it excludes Lean, Pass, Avoid and inactive Conditional selections. Best Bets and Actual Bets are separate performance categories. Model P/L uses Recommended Plays at flat 1u risk and -110 odds. Actual P/L includes only recorded wagers, using their own team, line, American odds and stake. Pushes are excluded from win-rate denominators. Optional wager tracking never requires a bet for a prediction. Preserve original selections and revision history; lock historical selection fields at recorded kickoff, with reasoned and audited administrator overrides. The Dashboard is an executive summary; Manage picks retains the complete editable card.
## Brand Commitments
NFL Picks Dashboard. Professional sports analytics. Navy/charcoal navigation and light content, compact cards, minimal clutter.
## Evidence on Hand
NFL_Picks_Dashboard.xlsx contains 27 selections, no kickoff times or closing lines.

## Standalone application (October 22, 2026)

Project: `/Users/jason/Projects/picker`. Runs as standalone Next.js/Node.js with PostgreSQL and Docker Compose. Original records were imported and checked field by field; SQLite backups are retained privately. Sites/Cloudflare identity and storage dependencies are removed. Current deployment is single-user, bound to localhost, with same-origin writes and optional server service-token access. Page-open score polling remains; background scheduling and remote sign-in are pending in TODO.md.
