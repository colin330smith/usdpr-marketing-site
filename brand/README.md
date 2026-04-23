# brand/ — USDPR brand assets

## What lives here

| File | Purpose | Referenced by |
|---|---|---|
| `favicon.svg` | Brand favicon | (alternate — main root uses `/favicon.svg`) |
| `og.svg` | Open Graph share image | live `index.html` via `og:image` |
| `logo-mark.svg` | Square logomark | pitch deck, collateral |
| `logo-stacked.svg` | Vertical wordmark | collateral |
| `logo-wordmark.svg` | Horizontal wordmark (light bg) | `<head>` logo on light pages |
| `logo-wordmark-dark.svg` | Horizontal wordmark (dark bg) | dark-themed pages |
| `linkedin-banner.svg` | LinkedIn company banner | social profile |
| `design-system.css` | Canonical legal-page design tokens | **privacy.html, terms.html, leave-behind.html** — live CSS |
| `email-signature.html` | Gmail signature HTML snippet | Colin's email signature |
| `cold-email-sequence.md` | Outbound email templates | internal ops reference |
| `case-study-template.html` | Template for future customer case studies | used once we have customers |
| `pitch-deck.html` | Investor/partner pitch deck | shared via link in outbound |
| `pms-export-guide.html` | Help doc: how to export PMS data | linked from onboarding flow |
| `readiness-quiz.html` | Lead-qualifying interactive quiz | linked from hero CTA alternatives |
| `sample-friday-report.html` | Example Friday Report for pilot prospects | linked from pilot page |
| `sms-templates.html` | SMS templates reference | internal ops reference |

## `_drafts/` — internal design exploration

Files in `_drafts/` are **not live assets**. They are internal iteration
artifacts and planning docs. The `robots.txt` at site root disallows
`/brand/` so nothing in this directory is crawlable or indexable.

- `reference.html` — 13-version design iteration sandbox (v1 Editorial Clinical → v13 monochrome + competitor-aligned copy). Kept as the future-rebuild reference.
- `CLAUDE_DESIGN_PROMPT.md` — 18-section brief for pasting into Claude Design when a full redesign is scheduled.

## Conventions

- Every SVG uses `viewBox` + no fixed width/height (scalable)
- Every logo has both `-light` and `-dark` variants where relevant
- The root `/favicon.svg` is the canonical (not `brand/favicon.svg`)
- The root `/og.svg` is the canonical for Open Graph (not `brand/og.svg`)

## CSS architecture — two-stylesheet split

The site runs two parallel stylesheets:

- **`/brand.css`** — main site stylesheet (Bricolage Grotesque + warm
  amber accent). **64 pages** load this: index, pilot, all ICP landers,
  blog, alternatives, pms, city/state SEO pages.
- **`brand/design-system.css`** — editorial legal-doc stylesheet
  (Fraunces serif + warm paper). **3 pages** load this: privacy,
  terms, leave-behind.

The split exists because privacy/terms/leave-behind were built during
a prior design iteration that explored an "editorial clinical"
direction. They were kept on that system because (a) legal docs benefit
from a more typographic treatment, and (b) the leave-behind is
print-first.

If a future design pass unifies the entire site on one system, either
(a) migrate the three outliers to brand.css, or (b) migrate the rest
of the site to design-system.css. Today both systems are in production.
