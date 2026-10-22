---
name: NFL Picks Dashboard
description: A compact scouting ledger for professional weekly ATS review.
colors:
  navy: "#122438"
  canvas: "#f4f6f8"
  surface: "#ffffff"
  ink: "#1b2a3d"
  muted: "#738092"
  functional-muted: "#667487"
  blue: "#2864b1"
  primary-button: "#245b98"
  primary-hover: "#17487e"
  border: "#e2e7ed"
  field-border: "#d8dfe7"
  nav-active: "#263c54"
  nav-hover: "#1a314b"
  nav-text: "#9cacc0"
  insight: "#eaf0f7"
  pick-surface: "#f7f9fc"
  win: "#23785b"
  win-bg: "#e7f4ed"
  loss: "#b04048"
  loss-bg: "#f9e9eb"
  push: "#99771d"
  push-bg: "#fbf1cc"
  best-bet: "#2864a0"
  best-bet-bg: "#eaf2fc"
  lean: "#826834"
  lean-bg: "#f5f0e4"
  conditional: "#8666a4"
  conditional-bg: "#f3eef9"
typography:
  headline:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "31px"
    fontWeight: 600
    letterSpacing: "-0.03em"
  title:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "12px"
    lineHeight: 1.6
  metric:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    letterSpacing: "-0.035em"
  brand:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "25px"
    fontWeight: 700
    letterSpacing: "0.035em"
rounded:
  badge: "4px"
  field: "6px"
  button: "7px"
  kpi: "10px"
  card: "12px"
  modal: "14px"
spacing:
  compact: "10px"
  kpi-gap: "12px"
  card-gap: "17px"
  panel: "20px"
  modal: "24px"
  desktop-gutter: "36px"
components:
  button-primary:
    backgroundColor: "{colors.primary-button}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  field:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.field}"
    padding: "9px 11px"
---

# Design System: NFL Picks Dashboard

## Overview

**Creative North Star: “The Scouting Ledger”**

A professional sports analytics workspace with fixed navy navigation, a light canvas and compact white cards. Measured typography keeps records, saved spreads and conviction easy to compare. This is the finished implementation of the user's navy/light, compact professional brief.

Key characteristics: dense but orderly data; restrained blue actions; explicit grade labels; expandable evidence; usable desktop, tablet and phone layouts.

## Colors

Navy anchors navigation; pale neutrals organize the workspace; blue identifies actions and Best Bets. White cards use ink for primary values and borders for separation.

Functional small labels use `functional-muted` on light surfaces: KPI footnotes, kickoff metadata, card metrics, notes, venue labels, detail text, chart annotations, footer and original-selection notes. This final contrast override supersedes the lighter values earlier in the stylesheet. Sidebar supporting copy uses #a0aec0 on navy. Retain these darker text treatments when extending the interface.

Win, Loss and Push combine named text badges with green, red and yellow backgrounds and card borders. Best Bet combines its label with a star. Classification and result never depend on color alone. Not every legacy badge or compact label has been independently certified for contrast; preserve the actual tokens and verify new combinations.

## Typography

IBM Plex Sans handles data, navigation, headings and controls. Barlow Condensed is reserved for the brand and team abbreviation blocks.

The page heading is 31px/600, section title 20px/600 and panel title 15px/600. KPI values are 28px/600; body prose is 12px with 1.6 line height. Compact metadata ranges from 8–11px, with darker functional labels where overridden. Avoid adding new tiny text for essential instructions. At tablet widths the page heading becomes 27px; phone headings are 28px and KPI values 26px. Numbers and concise labels carry hierarchy without decorative display type.

## Layout

Desktop uses a fixed 232px sidebar, 72px white header and a Dashboard container capped at 1960px including 36px horizontal gutters. Preserve the original six KPIs: All Picks, Recommended Plays, Best Bets, Actual Bets, Model P/L and Actual P/L. Weekly controls and current-week performance precede the Best Bets grid, compact Play/Pick rows, three season charts, compact Line Watch, then three supporting panels. Best Bets retain full pick cards in four desktop columns, with slightly more breathing room and a 20px saved-pick value. Manage picks retains its original full classification-filtered game cards: three columns with 17px gaps, or four at viewports at least 1600px. Analytics use two columns; four performance-category metrics appear in analytics and weekly review.

At 1250px and below, navigation narrows to 205px, gutters to 25px, KPIs use three columns and Manage games two. At 850px and below, navigation becomes a 74px icon rail, analytics stack and review metrics use two columns. At 580px and below, navigation moves above content with labeled icon tabs, header height becomes 49px, main gutters become 17px, KPIs use two columns and game cards one. Heading actions and weekly controls wrap; search expands to full width. Wide history tables scroll inside their container.

Best Bets use two columns at 1350px and below and one on phones. Compact Play/Pick rows use three columns, two at 1199px and below, and one at 580px and below. Dashboard charts sit above Line Watch and use three columns above 1050px, then stack. Supporting panels use three columns, two at 1199px and below with Pick changes spanning the row, then one on phones. Compact Line Watch uses a list capped at 265px with contained vertical scrolling; phone rows wrap the selection above the saved/current comparison and movement label. The six KPI columns retain the existing three-column compact and two-column phone behavior.

Editors use two field columns with notes spanning both, even on phones. Their scrollable panel is capped at 780px and 90vh; phone padding reduces to 19px and the height limit becomes 94vh. The new-week editor is capped at 400px.

## Elevation & Depth

The interface has no box shadows. White surfaces, subtle borders and pale nested pick bands establish hierarchy. Best Bet and graded cards receive distinct border colors. Editors use a navy translucent backdrop (#12243888) and layer above the page; a compact green status toast sits above content.

## Shapes

Cards and panels use 12px corners, KPIs 10px, buttons 7px, fields and pick bands 6px, badges 4px and editors 14px. Borders are thin and restrained. Avatars are circular; team abbreviation blocks are compact colored rectangles. Keep this utilitarian silhouette consistent.

## Components

### Navigation and actions

Navigation uses icon-plus-label buttons, muted navy-surface text, #1a314b hover and #263c54 active fill with white text. A small blue dot marks the desktop active tab. Tablet tabs show icons; phone tabs restore their labels. Primary actions use white text on #245b98, darkening to #17487e on hover. Secondary actions use white fill and a subtle border, shifting to #eef2f7 on hover. Disabled controls reduce opacity to 0.5 and show a not-allowed cursor.

### Filters and fields

Classification filters wrap rather than disappear. Selection uses a white fill, dark blue text and subtle border. Search combines an icon and text field in one bordered container. Season, week and history filters use native selects. Form inputs use 6px corners with 9px 11px padding. Keyboard focus uses a 2px blue outline offset by 4px.

### Pick cards

A card proceeds from kickoff/status to matchup, saved ATS pick, classification, confidence/current spread/cover margin, then notes. Confidence uses a short 3px track with a blue fill; the numeric value remains visible. Completed cards add the final score and result badge. The chevron disclosure reveals rationale, contextual notes, closing line, timestamp, original selection and saved revisions; its rotation shows the expanded state. The whole card opens the selection editor by click, Enter or Space; its independent disclosure retains the supporting evidence and explicit edit action. Changed and Locked labels preserve visible state. Saved and current spreads remain separate fields.

### Executive summary

Best Bets retain full pick cards, slightly larger saved-pick values and extra internal breathing room only on the Dashboard. Other recommended plays are strictly Play/Pick selections in compact actionable rows. Current-week Recommended Plays and Best Bets records show Pending until at least one selection is graded; push-only results retain their explicit no-decided-picks explanation. Model/actual P/L tooltips work on hover and keyboard focus. The three summary charts show weekly ATS win rate, weekly Best Bet win rate and cumulative model units.

Compact Line Watch follows the charts. Show all Best Bets with known current lines and other selections with movement of at least 0.5 points; label Better/Worse from the pick team's perspective and keep saved/current lines separate. Preserve every relevant Best Bet, using remaining capacity up to five rows for other relevant selections. When Best Bets exceed five, keep them all accessible within the 265px scroll area. An empty state explains absent current lines or no meaningful movement instead of displaying a full 14-row table. The full-line-watch link opens the complete selected-week table in Manage picks (14 rows for a 14-game week); Manage adds only a small full-line-watch toggle to its existing cards and controls.

Below Line Watch, three supporting panels show selected-week counts, freshness and pick changes. Counts distinguish actionable selections (Best Bet, Play, Pick and activated Conditional), leans, conditional and pass/avoid, alongside classifications and Pending/Locked/Final status. The full-week-card link leads to Manage picks. Freshness covers spreads, injuries, weather and scores with honest Manual update, Not checked and Stale states, checked coverage and recorded times. Automatic-source states are supported for future integrations, but no live feed is connected; never imply otherwise. The editor adds a Scores checked now checkbox for explicit score verification. Pick changes show up to two revisions inline and offer View all changes when multiple selections changed, retaining revision evidence and original-versus-revised performance.

### Analytics, history and review

Analytics use flat panel charts with 9px blue bar tracks, visible numbers and supporting sample counts. Empty values retain unknown-state copy. History uses a horizontally scrollable compact table with a pale header, row hover fill and an explicit pick edit button. Analytics, review and history distinguish All Picks, Recommended Plays, Best Bets and Actual Bets. Model units use Recommended Plays with flat 1u risk at -110; actual P/L uses recorded wagers and their own team, line, odds and stake. Pushes do not enter win-rate denominators. History retains separate prediction and wager columns. Review surfaces pair concise metrics, original/revised comparisons and editable lessons. Status and error messages retain text, with status announcements and error alerts implemented in the page.

### Editors and motion

Editors have explicit close, cancel and save controls. The selection editor is a labeled modal dialog; page logic manages focus and Escape dismissal. Save actions show saving state and respect storage readiness. Optional bet tracking reveals sportsbook, wager team, line, American odds and stake with potential win and settled-result feedback. Revisions preserve original selections and require a reason for team or saved-line changes. Historical selection fields lock at recorded kickoff, with a visible reasoned administrator unlock/re-lock path and audit events; market updates, reports, scores and wager details remain recordable. Missing kickoff times explicitly prevent automatic time-based locking. Button background/color transitions last 150ms; reduced-motion preferences disable transitions. Avoid decorative movement.

## Do's and Don'ts

- **Do** retain the navy navigation, light canvas, white surfaces and compact comparison hierarchy.
- **Do** keep meaningful text alongside result colors, classification stars and chart bars.
- **Do** preserve responsive grids, wrapping filters and contained table scrolling.
- **Do** keep darker functional metadata colors and visible keyboard focus.
- **Don't** add ornamental shadows, gradients or decorative animation.
- **Don't** confuse saved selection evidence with current or closing market lines.
- **Don't** present missing source times or lines as known values, or imply connected market feeds.
