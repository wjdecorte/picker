---
name: NFL Picks Dashboard
description: A compact scouting ledger for professional weekly ATS review.
colors:
  navy: "#001d3c"
  canvas: "#eef3f9"
  surface: "#ffffff"
  ink: "#102b49"
  muted: "#738092"
  functional-muted: "#52657b"
  blue: "#005fc7"
  primary-button: "#d50a0a"
  primary-hover: "#a00000"
  border: "#d9e3ef"
  field-border: "#d8dfe7"
  nav-active: "#005fc7"
  nav-hover: "#003369"
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
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "58px"
    fontWeight: 600
    letterSpacing: "-0.03em"
  title:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "14px"
    lineHeight: 1.65
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

## NFL broadcast, built for weekly review
The three-view workspace uses the NFL broadcast palette: Legacy Blue #001D3C, Shield Blue #003369, Impact Blue #0074EE and Shield Red #D50A0A. Saturated blue surfaces, red action emphasis and white data rows replace the muted October 29 treatment. IBM Plex Sans remains the data face; Barlow Condensed gives week headings and record values a stronger sports identity. The mode is Operate: generate and review the weekly card, make personal overrides, and understand results.

## Navigation and hierarchy
A single navy top bar contains This Week, History and Settings. There is no permanent sidebar. The current week is the page heading; season/week controls and Load another week sit alongside it. Generate picks is the primary action; Refresh is secondary. Setup status, generation progress, provider errors and save conflicts use explicit text. A missing API key disables generation and points to Settings; manual picks remain available.

## Weekly card
A compact white list shows matchup/kickoff, active saved selection/classification/source, confidence, current market line, ATS result and Details/Override controls. Current lines never replace pick lines. Source text distinguishes AI, manual override and imported picks. Best Bet retains its star and blue label. Wins/losses/pushes have green/red/yellow text badges; pending is neutral.

Four flat record summaries show ATS record, Best Bets, model units and unsettled count. Vertical dividers and condensed figures create a scoreboard rhythm; positive/negative units use green/red based on their actual sign, and zero stays neutral. They use spacing and horizontal rules rather than repeated KPI cards. Model units remain Recommended Plays only at 1u risk and -110; actual wagers are separate.

Details reveal rationale, odds provenance, timestamps, and immutable per-game decision history. Override is an inline two-row form, never a new modal. Reasons are required. Use latest AI pick pre-fills the form; saving still creates a new manual version. Locked games expose score entry/corrections, not prediction editing.

## History
Week buttons lead to a searchable table. Active picks, every version, AI snapshots and personal overrides are explicit filters. Each version grades at its own spread. Comparison, detailed analytics, weekly lessons and historical actual-bet metrics remain behind disclosures rather than competing with the weekly workflow.

## Settings
Shows key configuration status (never a credential), provider/model, environment-variable guidance, feed coverage and complete data export. Configuration status does not claim the key has been verified. Injury, weather and current team-performance feeds are not connected; model limitations remain visible.

## Typography, tokens and controls
Reuse the documented palette above. Intentional supporting tones keep strong contrast: navy navigation text #bdcad8, brand mark white on #d50a0a, selection #d8e6f6, field/action ink #3d4c60, muted row labels #52677e, error ink #8d3039 and #a4333d, success ink #236349, and dark push/configuration ink #796019. These are functional tonal variants, not additional accents. Main heading 58px/700 in Barlow Condensed (46px on phone), section titles 20px/600, panel titles 15px/600, body/controls 14px with 1.65 body line height, record values 32px/600 in Barlow Condensed. Supporting text is 12px; compact row metadata is 11px with functional muted ink. White surfaces use 12px corners, fields 6px and buttons 7px. Borders supply depth; no decorative shadows, gradients or casino motifs. Native controls retain visible labels and a 2px blue keyboard focus outline. Selection, caret and scrollbars use the palette. Reduced motion disables the refresh spinner.

## Responsive behavior
Desktop content caps at 1352px with 28px gutters. Below 1100px actions stack and list columns tighten; below 850px each game rearranges into a compact grid and metadata moves below its label. At 580px and below, the brand sits over three labeled tabs, gutters become 17px, record summaries use two columns, controls wrap, and the weekly list becomes a two-column card layout. Inline editors use two field columns, with rationale/reason spanning both. History tables scroll inside their own container; the page never scrolls horizontally. Analytics stack to one column. Touch controls target at least 42px.

## Content and evidence
Never invent a game, line, injury, statistic or source timestamp. Generated lines come from fetched sportsbook quotes, assigned by the server after the model chooses a team. User overrides are separate immutable records. Every model request is user-triggered and server-side. Original imports retain historical source/entry-time distinctions.

## Color provenance and usage (October 31, 2026)
Source: [NFL Global Design Playbook — Color Palette](https://designplaybook.nfl.com/color). This is an independent personal analytics interface, with no official NFL shield or affiliation claim. #005FC7 is an accessible darker blue variant for white navigation text; Impact Blue remains for large numerals and confidence meters. Red marks the brand and generation action, while result badges continue using explicit Win/Loss/Push labels with green/red/gold. Classifications use blue Best Bet, green Play, gold Lean, purple Conditional and gray Pass/Avoid. Team abbreviation tiles identify away/home sides in league blues, not purported franchise colors. The weekly banner uses Shield Blue and pale blue text; missing-key disabled actions remain visibly disabled.

## Model connection controls
Settings keeps the approved NFL broadcast styling. Generation billing is an explicit labeled selector: ChatGPT subscription or separately billed API key. Continue with ChatGPT is a plain high-contrast text button using the official action label, without an invented OpenAI logo. Saved account and model controls have visible labels, with connected/permission/error/pending status in text. NAS tunnel instructions are a disclosure, expanded for an unconnected NAS. Sign-in opens OpenAI in a separate tab; no passwords or tokens enter a dashboard field. Settings refreshes connection status while visible and links to ChatGPT Usage. Disconnect and cancel remain separate actions.
