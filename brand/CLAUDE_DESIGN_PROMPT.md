# USDPR — Claude Design Brief

**Last updated:** 2026-04-22
**For:** Paste into Claude Design (claude.ai → Design)
**After:** Upload this repo as the codebase anchor + attach `/brand/mark-matrix.svg` as reference

---

## 1 · What you are designing

The complete public brand system for **US Dental Patient Recovery (USDPR)** — a venture-quality orthodontic patient recovery SaaS.

Three pages in scope, plus a unified design system:

1. **`/index.html`** — marketing homepage (converts ortho owners → free audit signup)
2. **`/leave-behind.html`** — print-optimized one-pager (hand-delivered at AAO; must print at Letter 8.5 × 11)
3. **`/pilot.html`** — founding-10 pilot page (scarcity + conversion, not precious)

Plus brand marks (mark, favicon, OG image) and a canonical `design-system.css` with tokens + primitives + components the whole 40-page site can consume.

---

## 2 · The company, in one screen

| | |
|---|---|
| **Name** | US Dental Patient Recovery (USDPR) |
| **What it does** | Finds the orthodontic patients already in the practice's chart who should be coming back but aren't — across 8 specific patient states — and hands the treatment coordinator a ranked Friday-morning call list with shown-up attribution. Not bulk SMS. Not auto-booking. A diagnostic instrument. |
| **Stage** | Pre-revenue. Solo founder. Running a 90-day founding-10 pilot cohort. 2 practices signed (Orlando FL, Tampa FL). |
| **Founder** | Colin Smith, Orlando, Florida. |
| **Pricing** | Recovery Launch $1,500 (one-time, refunded if guarantee misses) · Ortho Recovery Pro $997/mo ($697/mo locked for the first 10 practices) · Scale $1,497/mo per location for DSOs |
| **Guarantee** | "$5,000 of attributed shown-patient value in 60 days, or your Launch Fee is refunded." Measured with a scheduled/shown/incremental attribution model against a matched holdout group. Advertised in accordance with 16 CFR Part 239. |

## 3 · The buyer (read this twice)

**Primary:** Orthodontic practice owner. 40s–50s. Owns 1–3 practices. Runs a $3–8M/year business. Sees 40 patients a day. Graduated from a 2–3 year ortho residency. Respects precision because **aligning teeth is craft**.

**Secondary:** DSO operations lead or CFO. More acquisitive, more skeptical, wants portfolio rollups.

**Critical insight from research:** dental/ortho practice owners are a conservative buying culture with "strict buyer qualification and high switching costs" — healthcare SaaS hits **21.5% free-trial-to-paid**, higher than almost any vertical, precisely *because* the buyer qualifies harder before trying¹. They've been burned by ~200 dental-marketing vendors who promised leads and delivered call sheets. Every vendor pitch activates a defensive reflex.

**What converts this buyer:** Compliance signals above the fold (HIPAA/BAA/SOC 2)², industry-specific testimonials near CTAs², real product screenshots over abstract illustrations³, outcomes-based guarantees (the ortho industry's affordability sweet spot of $500–$750 initial payment and ~$200/mo for patients translates directly to vendor trust — price transparency is a buying signal)⁴, peer-referral language (ortho is historically referral-based)⁴, and short forms (5 fields or fewer converts **120% better**; each additional field penalizes conversion 20–30%)¹.

**What repels this buyer:**
- Generic "startup-y" aesthetic (signals "another kid with a landing page")
- Vague aspirational copy ("Build the future of dental" — this is AI-slop coded language⁵)
- Stock imagery of diverse teams pointing at laptops⁵
- Long enterprise-y contracts and aggressive billing reputation (Solutionreach's reputational damage is the cautionary tale⁶)
- Any pitch that says "leads" without "systems" — the industry's complaint is "100 leads, empty schedule"⁴

---

## 4 · THE THESIS — "Precision Clinical Instrument"

**The competitive visual white space in ortho software is clinical-editorial-precision.** No one in the category owns it. Here's the current landscape:

- **Weave** — aggressive orange/red, illustration-heavy, CTAs-everywhere "all-in-one" transactional
- **Solutionreach** — dated 2019 corporate SaaS; reputation baggage⁶
- **NexHealth** — modern but generic (Inter + gradients, AI-slop-adjacent⁵)
- **Dental Intel** — dashboard-forward thinking, undercooked design

**USDPR's position:** A precision clinical instrument, not a marketing tool. The brand should feel like it was designed by someone who reads clinical literature, not by someone who watched a Stripe tutorial.

**Reference class (this is the vibe):**
- Surgical-instrument catalogs: Aesculap, Karl Storz — precision, restraint, reverence for the tool
- Scientific journals: NEJM, Nature — authority through spacing and hairline rules, not shout
- Private-banking sites: Brown Brothers Harriman (pre-merger) — quiet confidence, oldstyle numerals
- Modern B2B "design-forward" (for polish calibration only, not buyer signal): Attio, Linear, Vercel, Retool, Warp

**Explicit NOT references:** Mercury, Ramp (VC-SaaS buyer signal wrong for ortho owners), any dental-vendor site from 2019, any YC-flavor landing page with purple gradients, any Framer template.

---

## 5 · THE SIGNATURE — The Recovery Opportunity Matrix

USDPR's product primitive is a diagnostic framework: **8 patient states that surround the practice.** This IS the brand mark. Make it visible everywhere.

```
┌───┬───┬───┐
│01 │02 │03 │   01 RET — Retainer Check Overdue
│RET│OBS│CON│   02 OBS — Observation Overdue
├───┼───┼───┤   03 CON — Consult No-Start
│08 │ u │04 │   04 NSH — No-Show, Not Rescheduled
│FPR│ · │NSH│   05 DFM — Debond Follow-Up Missed
├───┼───┼───┤   06 FGC — Financing Gone Cold
│07 │06 │05 │   07 IFS — Inactive Family / Siblings
│IFS│FGC│DFM│   08 FPR — Former Patient Return
└───┴───┴───┘   (center is the practice, filled amber)
```

- Simplified (grid only, no labels) → logomark + favicon
- Labeled and sized up → hero visual on the homepage
- Full bleed on the leave-behind cover
- Segment motif through page (section dividers, page numbers, anchor links)
- Animates on page load: diagnostic-scan reveal, cells fill sequentially ~80ms apart, over 800ms total

A buyer absorbs the product thesis in the three seconds it takes to parse the matrix. That's the signature. Nothing in dental software has this.

Asset attached: `/brand/mark-matrix.svg` (baseline geometry, 48×48).

---

## 6 · TYPOGRAPHY — Locked

Research-confirmed trending pairs for 2026 B2B design-forward brands⁷⁸:

- **Display:** **Instrument Serif** (italic heavily preferred; narrow proportions; editorial-clinical; "quiet authority"⁸)
- **Body/UI:** **Geist** (Vercel's neo-grotesque; current gold standard for B2B SaaS⁷; explicitly *not* Inter)
- **Data/Mono:** **Geist Mono** (matching)

All three are free on Google Fonts. Include them via a single `@import` and set CSS variables:

```css
--font-display: 'Instrument Serif', Iowan Old Style, Georgia, serif;
--font-sans:    'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono:    'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace;
```

Hierarchy:
- `t-mega` → `clamp(56px, 9.5vw, 148px)` · Instrument italic · line-height 0.92
- `t-hero` → `clamp(44px, 7vw, 104px)` · Instrument italic · line-height 0.95
- `t-h2`   → `clamp(28px, 3.6vw, 52px)` · Instrument italic · line-height 1.02
- Body    → Geist 16/1.55
- Eyebrow → Geist Mono 11px / 0.18em letter-spacing / uppercase / amber

Use oldstyle-numerals (`font-variant-numeric: oldstyle-nums tabular-nums`) for every display number over 24px. This is the single highest-leverage typographic move.

**FORBIDDEN FONTS:** Inter, Roboto, Arial, system-ui, Open Sans, Space Grotesk, Plus Jakarta Sans, DM Sans, DM Serif Display, GT Walsheim, Söhne, Playfair Display, Fraunces (I tried Fraunces; too NYT-precious for this buyer).

---

## 7 · COLOR — Locked tokens

Dominant dark + warm paper + **one** sharp accent. Not evenly distributed. Not gradient-heavy. Not pastel. Not neon.

```css
/* INK — cool near-black */
--ink-1000: #07080A;
--ink-900:  #0B0C0E;   /* primary */
--ink-800:  #17181B;
--ink-700:  #25272C;
--ink-600:  #34373C;   /* body copy */
--ink-500:  #55595F;   /* muted */
--ink-300:  #A7ABB0;
--ink-100:  #E6E4DF;

/* PAPER — warm bone (not stark white) */
--paper-50:  #F5F1E8;   /* page bg */
--paper-100: #ECE7D9;
--paper-200: #E0D9C5;

/* AMBER — signature. Surgical, not dusty. */
--amber-700: #9E4A0D;
--amber-600: #C26013;   /* signature mid */
--amber-500: #E58028;   /* bright action */
--amber-200: #F8D9B3;   /* highlight wash */

/* SIGNAL — diagnostic green (shown patient, recovered revenue) */
--signal-700: #1B7F41;
--signal-500: #2DAC5A;
--signal-200: #B9E5C7;

/* ALERT — serious at-risk (not pink) */
--alert-700: #9E2410;
--alert-500: #C8300F;

/* RULES — hairlines, layered opacities */
--rule:         rgba(11, 12, 14, 0.10);
--rule-strong:  rgba(11, 12, 14, 0.22);
--rule-inv:     rgba(245, 241, 232, 0.14);
```

**Semantic application** (this is the discipline that separates "design" from "decoration"⁵):
- Amber = action + emphasis (CTAs, the practice-center cell, highlighted words)
- Signal green = shown-patient, attribution, recovered revenue
- Alert = at-risk opportunity counts (not cancellations)
- Ink/paper = everything else

**FORBIDDEN:** Purple-to-blue gradients anywhere⁵. White page with gray body (corporate-SaaS dated). Neon. Drop shadows over 8% opacity. Colored drop shadows.

---

## 8 · MOTION — Purpose over decoration

All motion CSS-only. Zero JS-required reveals. `prefers-reduced-motion` fully respected.

Three kinds of motion are allowed:
1. **Page-load orchestrated reveal:** the hero's 3×3 matrix fills cell-by-cell over 800ms like a diagnostic scan completing. Staggered delay 80ms between cells. Type fades up after the matrix resolves.
2. **Functional hover states:** 2px lift on cards, 200ms ease-out, shadow depth steps up. Links underline-draw right-to-left on hover. Buttons hover amber with a subtle -1px translate.
3. **Scroll-triggered amber underline-draw** on one key phrase on the homepage (e.g. "already in your system"). IntersectionObserver, one shot.

**FORBIDDEN:** Generic fade-in-on-scroll applied uniformly (AI-slop signal⁵). Parallax. Auto-playing video hero. Carousels. Hover states that do nothing. Buttons that snap instead of ease⁵. Tilt-on-cursor. Cursor trails.

---

## 9 · LAYOUT — Disciplined neo-brutalism

2026 research confirms a split in how brutalism performs: **disciplined layouts with clear grids** score acceptable usability; **chaotic "anti-design"** tanks⁹. We're in the disciplined camp.

Principles:
- 12-column grid, 1240px max-width, 40px gutter (scales to 20px mobile)
- Hairline rules (1px @ 10% opacity) instead of colored dividers
- Sections separated by rhythm + rules, not by colored bands
- Generous whitespace, but intentional — every pause has a reason
- Asymmetric hero: matrix right-weighted, type left-weighted (NOT centered)
- Page has a visible editorial frame: thin sticky top bar with pulsing signal-green dot + live-ish metric
- Card-based layouts are OK but vary the card — not all 16px radius, not all the same height⁵

No card mosaic for card mosaic's sake. No identical 3-across feature grid. No 2-3-2 "features" boxes with icons from Feather.

---

## 10 · HOMEPAGE — Sections in order

Ship exactly these sections, in this order, with this content:

**① Diagnostic top bar** (sticky, 44px): pulsing `--signal-500` dot + `t-mono` text: *"12,847 Recovery Opportunities detected this quarter across pilot practices"*

**② Hero** (asymmetric split): matrix on the right, type on the left.
- Eyebrow: `ORLANDO, FL · VOLUME I` (Geist Mono, amber-700)
- Headline (Instrument italic, t-hero): *"Recover the ortho patients **already in your system**."* (amber highlight underlay on the bold phrase)
- Lede (Geist 20px): "The typical orthodontic practice has 31% of its active chart sitting in the pipeline unseen — retainer checks overdue, observation no-starts, consult no-starts, financing gone cold. USDPR detects them, ranks them, and hands your TC a Friday-morning call list with shown-up attribution."
- CTA: primary ink-900 "Start the free Ortho Recovery Audit →" + ghost "Claim a founding-10 slot"
- Trust-row (right below buttons, small): `HIPAA · BAA-first · TCPA · 45 CFR §164.502` in Geist Mono / amber-700. **This is load-bearing for the buyer.²**
- Numeric strip below (4 stats with oldstyle-numerals): 696 avg active patients/ortho · 23% attendance loss per 6-mo gap · $5K shown-value guarantee · $697/mo founding cohort

**③ The $487M figure** (full-bleed editorial): oldstyle italic "$487M" in Instrument Serif, 220px clamp, followed by small caption "of shown-patient value forfeited annually across US ortho practices from overdue retainer-checks and lapsed observations." Cite to AAO 2025 + ADA 2025 + AAO 2024 Landscape Consumer Study.

**④ The 8 Recovery Opportunity states** (numbered roster with mini-matrix): each row = index (01–08) + mini matrix SVG showing its cell lit amber + Instrument Serif italic title + Geist 14px description + Geist Mono meta tag (e.g. "Typical ratio · 18% of debond chart"). Hairline rules between rows. Hover: row tinted warm paper-100, matrix scales 1.02.

**⑤ Method** (3-step, but rendered as a diagnostic procedure): 01 Connect PMS (Open Dental REST / Dentrix CSV / Cloud 9 / Ortho2) · 02 72-hour signed audit · 03 Friday 8:00 AM call list. Each as a 3-column card with oldstyle step number, instrument-style icon, body.

**⑥ Evidence** — the product, shown: ONE high-fidelity mockup (SVG or PNG) of the actual Friday email. Columns: Detected / Scheduled / Shown / Incremental. Real columns, real data, one anonymized sample. This is the most important section on the page — it replaces a product demo video³.

**⑦ Guarantee** (full-bleed dark ink-900 section): amber italic headline "*$5,000 of shown-patient value in 60 days. Or your Launch Fee is refunded.*" Circular seal SVG. Three-line fine-print: "Advertised in accordance with 16 CFR Part 239. Refunded via ACH within 10 business days. CFO-signed escrow release."

**⑧ Pricing** (3-column dossier, not card-grid): Launch $1,500 · Pro $997/mo (featured, $697 founding) · Scale $1,497/mo/loc. Oldstyle numerics, amber-accented featured column. Six bullets each. Individual CTAs.

**⑨ Q&A** (editorial italic Q prefix, plain-text answers): 6 hard questions. What do you add that Weave/Solutionreach don't? / Is this HIPAA-compliant? / Can you prove patients showed up, not just that SMS went? / Why ortho-only? / Does it work under 400 active patients? / Who's behind this?

**⑩ Citations block** (numbered, Geist Mono): AAO 2025 Member Survey · CareCredit ortho case-fee data · PubMed adherence study · AAO 2024 Landscape Consumer Study · ADA 2025 Workforce Report.

**⑪ Final CTA** (centered, warm bone section): "Run a free recall audit. *Get your ratios in 72 hours.*" + email form (ONE field, inline submit button) + trust row.

**⑫ Footer** (dark ink-900): four columns (Product / Company / Legal / Trust) + wordmark + founder email.

---

## 11 · LEAVE-BEHIND — 8.5 × 11 print-ready

On screen: document floating on ink-void with printed-paper shadow. In print: clean, no screen artifacts.

- Masthead: mark + wordmark + italic tagline ("Orthodontic patient recovery — purpose-built for the eight patient states every practice already owns.") + edition label "Edition I · Orlando, FL · Printed for practice review"
- Hero: matrix, full-bleed, labeled, amber center
- 4-panel grid:
  - §01 The figure — "$487M unrecovered annually" (oldstyle italic)
  - §02 The primitive — 8 states in a compressed 2-column list
  - §03 The method — 3 steps
  - §04 The offer — mini-pricing grid (Launch · Pro · Scale)
- Guarantee strip (full-width, dark): seal + italic amber headline + fine print + "pilot.usdpr →"
- Colophon: contact / founder / standards / folio

---

## 12 · PILOT PAGE — Urgency with brand intact

The pilot page is the *one* surface where confidence gets turned up. Keep the Instrument Serif italic for headlines but dial up the amber and run the dark hero.

- Dark ink-900 hero + amber-500 glow
- Kicker pill (Geist Mono + amber-500): *"FOUNDING COHORT · FIRST 10 ORTHODONTIC PRACTICES · $697/MO LOCKED"*
- Headline (Instrument italic, t-hero, amber accent on second clause): *"$5,000 shown-patient value in 60 days. **Or your Launch Fee is refunded.**"*
- Slots panel (right side): 10-cell grid, 2 filled with checkmarks, tally "02/10", roster beneath: "Pilot 1: Orlando, FL · 1,800 patients · signed 2026-04. Pilot 2: Tampa, FL · 4,200 patients · signed 2026-04."
- Five benefits: dossier cards with oldstyle index (01–05): Lifetime rate lock · 30-in-60 guarantee · Founder onboarding · Monthly roadmap call · Founding-10 badge
- $38k compound-savings callout
- Fit-check (two columns, ✓ / —): This fits when… / Not for you if…
- Dark closer (centered): *"Ten slots. Two gone. Rate doubles at slot 11."*

---

## 13 · Trust + compliance (non-negotiable)

Research lock-in²: healthcare SaaS buyers evaluate security before features. Display these signals above the fold, near CTAs, and in the footer:

- **HIPAA** — we are a HIPAA Business Associate operating under a signed BAA before PHI moves
- **BAA-first** — loud enough that buyers hear it
- **TCPA** — we respect 10DLC registration and cross-campaign opt-out (FCC April 2026)
- **45 CFR §164.502** — minimum-necessary standard
- **SOC 2 Type II** — on the Q2 2027 roadmap (honest pre-audit posture noted)
- **OIG Advisory Opinion 25-08** — FMV memo filed to customer record at Launch
- **16 CFR Part 239** — guarantee is advertised in accordance with FTC endorsement rules

These are trust signals, not clutter. Render them as Geist Mono badges in amber-700 on paper-100, one pill each, grouped in two or three places on the homepage.

---

## 14 · Anti-pattern list — the slop we will NOT ship

Every one of these has a research citation⁵. Use this as a reject checklist:

- [ ] Inter font, anywhere
- [ ] Purple-to-blue gradients anywhere (hero, buttons, backgrounds, accents)
- [ ] Uniform 16px border radius on every card
- [ ] Identical padding, identical card heights — the "boxes inside boxes" look
- [ ] Stock photography (diverse team, open laptop, window light)
- [ ] AI-generated illustrations (3D blobs, isometric people, "slightly too smooth")
- [ ] Vague aspirational headlines ("Build the future of work," "Your all-in-one platform," "Scale without limits")
- [ ] Hedging language ("may help," "potentially," "up to")
- [ ] Generic superlatives ("best-in-class," "industry-leading," "cutting-edge")
- [ ] Hover states that do nothing
- [ ] Buttons that snap instead of ease
- [ ] Generic fade-in-on-scroll applied to every section uniformly
- [ ] Blob / abstract gradient backgrounds
- [ ] Hero that says what the product does without showing it
- [ ] Form with more than 5 fields (conversion penalty 20–30% per extra field¹)
- [ ] Copy above 7th-grade reading level (cuts conversion in half¹)
- [ ] 3-column "Features" grid with Feather icons
- [ ] Testimonial carousel on auto-play
- [ ] Pricing with 4+ tiers (decision paralysis in a conservative buyer)

---

## 15 · Output format

Package as a Claude Code handoff bundle containing:

```
/brand/
  design-system.css       — tokens + primitives + components (one file)
  design-tokens.json      — for future Figma sync
  mark-matrix.svg         — logomark (3×3, no labels)
  wordmark.svg            — wordmark ("usdpr.")
  favicon.svg             — 48×48 dark-bg version
  og-instrument.svg       — 1200×630 OG image with matrix + headline
  BRAND_RATIONALE.md      — why Instrument, why matrix, why italic serif, why amber

/index.html               — homepage, all 12 sections above
/leave-behind.html        — print-ready one-pager
/pilot.html               — founding-10 conversion page
```

---

## 16 · First deliverable — before you build everything

**Generate THREE distinct hero treatments** for the homepage.

Keep the Instrument/Geist type stack. Keep the amber accent. Keep the Recovery Opportunity Matrix as the visual. Vary:

- **Direction A** — matrix-right, type-left (the default I've described)
- **Direction B** — matrix as centerpiece, type above + below (symmetrical editorial)
- **Direction C** — matrix as full-bleed backdrop (very low opacity), type overlaid (most confident, risks illegibility — show me you can solve that)

I'll pick one. Then generate the full page. Then the leave-behind. Then the pilot.

---

## 17 · What I've tried and why it failed (don't repeat)

Two failed prior redesigns this month. Both failed for recoverable reasons:

1. **"Editorial Clinical"** — Fraunces serif + JetBrains Mono + warm amber. Execution was clean but the aesthetic read as *magazine* not *instrument*. Too precious for a conversion page. Lesson: this buyer rewards precision-confidence, not editorial-restraint.
2. **"Bold Condensed Startup"** — Bricolage Grotesque 800-weight + neon orange + pill badges + card grid. Converted fine on feel but looked like every YC-stage startup. Lesson: the "confident startup" register is too generic to differentiate.

The right answer is neither: **disciplined neo-brutalism, editorial-italic headlines, oldstyle numerics, hairline rules, one unique signature diagram, semantic color.** Confident AND precise. Warm AND clinical. Memorable AND trustworthy.

---

## 18 · Sources

1. [Landing Page Conversion Benchmarks 2026 — Apexure](https://www.apexure.com/blog/landing-page-conversion-rate-benchmarks-by-industry) · healthcare SaaS 21.5% trial-to-paid; 5-field forms convert 120% better
2. [Landing Page Statistics 2026 — Digital Applied](https://www.digitalapplied.com/blog/landing-page-statistics-2026-conversion-data-points) · compliance badges as trust signals
3. [10 SaaS Landing Page Trends for 2026 — SaaSFrame](https://www.saasframe.io/blog/10-saas-landing-page-trends-for-2026-with-real-examples) · real product screenshots > abstract illustrations; split-screen heroes
4. [Orthodontic Marketing Playbook — Patient.li](https://www.patient.li/insights/your-2025-orthodontic-marketing-playbook/) · the $500–$750 initial-payment / $200/mo sweet spot; "leads without systems" complaint
5. [AI Slop Web Design Guide — 925 Studios](https://www.925studios.co/blog/ai-slop-web-design-guide) · the complete anti-pattern list (Inter, purple gradients, uniform cards, stock imagery, generic copy, decorative motion)
6. [Weave vs NexHealth vs Solutionreach — PracticeSignal](https://practicesignal.com/dental/compare/weave-vs-nexhealth-vs-solutionreach) · Solutionreach reputational baggage
7. [50 Fonts Popular in 2026 — Creative Boom](https://www.creativeboom.com/resources/top-50-fonts-in-2026/) · Geist / Geist Mono trending in B2B SaaS
8. [Typography Trends 2026 — DesignMonks](https://www.designmonks.co/blog/typography-trends-2026) · Instrument Serif popularity; shift away from bland minimalism
9. [Neobrutalism Usability Study — NN/g](https://www.nngroup.com/articles/neobrutalism/) · disciplined vs chaotic brutalism; usability delta
10. [Introducing Claude Design — Anthropic](https://www.anthropic.com/news/claude-design-anthropic-labs) · Claude Design workflow + handoff bundle format
11. [AAO 2025 Member Survey](https://www.aaoinfo.org/member-survey) · 696 active patients per orthodontist
12. [ADA 2025 Workforce Report](https://www.ada.org/resources/research/health-policy-institute) · 10,830 US orthodontists
13. [16 CFR Part 239 — FTC Guarantee Rules](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-239) · guarantee advertising compliance

---

**Paste this entire document into Claude Design. Attach the repo. Attach `/brand/mark-matrix.svg`. Ask for three hero directions first. Ship from there.**
