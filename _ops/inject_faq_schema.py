#!/usr/bin/env python3
"""Retrofit FAQPage JSON-LD schema onto top pages for Google People-Also-Ask capture.

Each page gets 4-6 hyper-relevant questions the ICP is actually typing into
Google. The script inserts the schema block immediately before </head>.
Idempotent: re-runs replace any previous FAQ block for the page.
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).parent.parent

MARKER_OPEN  = "<!-- BEGIN auto FAQ schema -->"
MARKER_CLOSE = "<!-- END auto FAQ schema -->"

# Per-page FAQ content (question → answer). Tailored to the page's topic and
# designed to match real dentist search queries that should land on that page.
PAGES = {
    "calculator.html": [
        ("How do I calculate lapsed patient revenue loss?",
         "Multiply your active patient count by your annual lapse rate (9% is the US industry average) to get lapsed patients per year. Multiply that by your average visit value ($285 is national benchmark) and expected visits per reactivated patient (1.5x is conservative). For a 2,000-patient practice: 2,000 × 9% × $285 × 1.5 = ~$77,000 of annual revenue at risk."),
        ("What's the average dental practice reactivation rate?",
         "Generic SMS recall blasts typically reactivate 1-3% of lapsed patients. Multi-touch sequences using email + SMS + phone with personalized templates consistently reactivate 8-15%. The free calculator lets you adjust the reactivation rate slider to see how much revenue you recover at different conversion levels."),
        ("How much does a dental reactivation service cost?",
         "US Dental Patient Recovery charges a flat monthly SaaS fee: $297/mo for solo practices up to 2,000 patients, $697/mo for growing practices up to 10,000 patients, $1,997/mo for DSOs. All plans include a 14-day free trial with no credit card required. Flat fees keep the arrangement inside anti-kickback safe harbors — per-patient pricing triggers state patient-brokering statutes."),
        ("Is the dental ROI calculator free to use?",
         "Yes, the calculator is 100% free with no signup or email required. It runs entirely in your browser — no analytics tracking, no lead capture, no popup. Dental consultants and bloggers can embed it on their own site free at usdpr.netlify.app/embed.html."),
        ("What is a good average visit value for a dental practice?",
         "The 2026 national average for a general dental patient visit is approximately $285 (includes hygiene appointment + diagnostic imaging averaged across recall visits). Specialty practices run higher: ortho consults $400-$600, endo $900-$1,400 per RCT, perio SRP quadrants $320-$480, OMFS consults $280-$450."),
    ],
    "pilot.html": [
        ("What does the USDPR pilot program include?",
         "The pilot is a 14-day free trial with no credit card required, plus a 30-day money-back guarantee after activation. The first 10 practices also get a lifetime rate lock (your price never increases), priority white-glove onboarding, and direct Slack access to the founder. The trial includes email campaigns; SMS layers in after your 10DLC carrier brand approves (typically 2-3 weeks)."),
        ("How long is the free trial for dental reactivation SaaS?",
         "14 calendar days from activation. You can cancel in one click from the portal — no retention call, no cancellation fee, no per-patient invoice at any point. If you continue past day 14, the monthly subscription starts ($297/$697/$1,997 depending on tier)."),
        ("Can I cancel my dental SaaS subscription anytime?",
         "Yes. Every USDPR subscription can be cancelled in one click from the customer portal. No contract term, no early-termination fee, no retention call. Per TCPA + CAN-SPAM, we also stop all outreach sequences within 2 business hours of cancellation and delete stored PHI within 30 days on request."),
        ("Is the USDPR pilot program legal in my state?",
         "Yes in all 50 states. Our pilot only contacts your existing patients under your practice name (follow-up care, not solicitation). We charge a flat SaaS fee, never per-patient, which keeps the arrangement inside federal anti-kickback safe harbors and state patient-brokering statutes. A HIPAA Business Associate Agreement is signed automatically at checkout before any patient data is imported."),
        ("What happens after the 14-day free trial ends?",
         "On day 15, your selected monthly plan begins and Stripe charges your card. You can cancel on day 14 (or any day after) with one click and pay nothing. During the trial we run your first reactivation campaign end-to-end so you see real reactivated appointments before payment starts."),
    ],
    "compare.html": [
        ("What is the best dental patient reactivation software?",
         "The best choice depends on your use case. For generic patient communication (appointment reminders, recall texts, online forms), Weave, Solutionreach, and RevenueWell are established options at $200-$900/month. For dedicated reactivation of lapsed patients with multi-touch email + SMS + phone sequences and specialty-aware segmentation, USDPR is purpose-built at $297-$1,997/month with a 14-day free trial and no contract."),
        ("How does USDPR compare to Weave and Solutionreach?",
         "Weave and Solutionreach are broad patient-communication suites (phone systems, reminders, reviews, forms, payments). USDPR is a narrow reactivation specialist: we only focus on bringing back lapsed patients using multi-channel sequences, specialty-aware segmentation, and AI-classified reply handling. We integrate alongside your existing Weave/SR setup — we don't replace it."),
        ("Can I switch dental reactivation software later?",
         "Yes. USDPR stores all patient communication logs and campaign data in portable CSV/JSON format you can export at any time. No vendor lock-in, no proprietary data formats, no exit fees. We can also help you migrate inbound from RevenueWell, Dental Intelligence, or Lighthouse 360 — we've built the importers for all three."),
        ("Why is dental reactivation flat-fee instead of per-patient?",
         "Per-patient pricing triggers state patient-brokering and anti-kickback statutes in most US states (including Florida §817.505 and the federal Anti-Kickback Statute). Flat monthly SaaS fees keep the arrangement in a recognized safe harbor and align incentives on campaign quality rather than quantity of reactivations billed."),
    ],
    "for-specialists.html": [
        ("How is patient reactivation different for dental specialists?",
         "Specialty practices have recall windows, referral sources, and patient journeys that general dental tools miss entirely. Orthodontists need retainer-check cadence at 6/12/18 months plus paused mid-treatment workflows. Endodontists need RCT → crown follow-up at 30/60/90 days. Periodontists need 3-month maintenance (not 6) plus post-SRP adherence tracking. OMFS needs consult-to-schedule conversion and post-op recovery check-ins. Generic recall tools broadcast a single 'we miss you' to all of these — which is the exact wrong approach."),
        ("What is the best reactivation software for orthodontists?",
         "USDPR for orthodontics segments patients by treatment phase (active, retention, paused, completed) and sends cadence-appropriate messaging: retainer-check reminders at 6/12/18 months, paused-treatment re-engagement after 60/90/180 days of inactivity, and post-debond evaluations. We also track referral sources so you can close the loop with referring GPs."),
        ("How do endodontists reactivate RCT patients who never returned for the crown?",
         "The window is 30-90 days post-RCT. USDPR runs a 5-touch sequence: day 14 clinical check-in, day 30 crown reminder with urgency framing, day 45 GP coordination (via referring dentist), day 60 direct reminder, day 90 final outreach. Practices running this sequence close the crown loop on 40-60% of lapsed post-RCT patients vs. the 10-15% typical with single-touch recall."),
        ("Can specialty practices share patient data with referring GPs via HIPAA?",
         "Yes, under the Treatment exception of HIPAA §164.506(c)(2), which permits disclosure between covered providers for ongoing treatment coordination. USDPR includes referral-source tagging and closed-loop reporting that shares minimum-necessary PHI with referring GPs — all logged in a Business Associate Agreement-backed audit trail."),
    ],
    "for-managers.html": [
        ("How many hours per week do dental recall calls take?",
         "Industry benchmarks: an office manager at a 2,000-patient practice spends 4-8 hours/week on recall calls, depending on automation already in place. USDPR removes recall calls entirely — the front desk reviews pre-drafted replies to inbound responses instead of cold-calling lapsed patients. Typical savings: 6 hours/week returned to the OM."),
        ("Can dental office managers automate overdue patient recall?",
         "Yes. USDPR runs the full 5-touch reactivation sequence (email + SMS + phone) automatically. The office manager reviews and one-click-approves AI-classified replies (interested / question / objection / unsubscribe). No list-dialing, no script-reading, no manual follow-up cadence to track. The OM becomes a traffic controller, not a cold-caller."),
        ("What dental reactivation software is easiest for office managers?",
         "USDPR is designed for office managers specifically: a single reactivation dashboard showing this week's reactivated-patient revenue, a unified inbox for all inbound replies across email + SMS, and AI-drafted responses that the OM only has to review and send. No system to configure, no cadence to design, no scripts to write — the playbook ships pre-built."),
        ("How much time does USDPR save the front desk weekly?",
         "Case-study benchmarks: front-desk time on reactivation drops from 4-8 hours/week to under 30 minutes/week (review + approve pre-drafted replies). The 3-8 hour reclaim typically gets redirected to insurance verification, new-patient intake, or post-op follow-ups — higher-value front-desk work."),
    ],
    "for-dsos.html": [
        ("How do DSOs handle patient reactivation across multiple locations?",
         "Most DSOs run reactivation either as a centralized call center (expensive, low conversion) or leave it to individual offices (inconsistent, no visibility). USDPR provides a single multi-tenant dashboard showing reactivated revenue per location, staff-efficiency benchmarks, and AI-classified reply volume — with per-location branding on outgoing messages so patients still see their local office."),
        ("Is USDPR enterprise-ready for DSO deployment?",
         "Yes. The DSO plan ($1,997/month base) includes up to 50,000 patients across unlimited locations, SSO integration (Okta, Azure AD), role-based access control (regional manager, office manager, front desk), and a master audit log viewable at corporate. Additional locations beyond the base are $297/month each. HIPAA BAA covers all entities under a single master agreement."),
        ("What's the ROI of reactivation for a 10-location DSO?",
         "At 10 locations averaging 3,000 active patients each (30,000 total), a 9% annual lapse rate produces ~2,700 lapsing patients. At $285/visit × 1.5 visit multiplier × 10% reactivation rate = ~$115,000 annual recovered revenue. Net of tool cost ($1,997/mo × 12 + 9 additional locations × $297/mo × 12 = ~$56,000/year): ~$59,000 net annual gain, conservatively."),
        ("Do DSOs need a separate HIPAA BAA for each dental location?",
         "No — under 45 CFR §164.504(e)(1)(i), a single master BAA can cover all locations operating under a common DSO legal entity. USDPR provides one enterprise BAA that names all covered entities, executed by the DSO corporate counsel. Individual location administrators are added via the admin portal, not separate agreements."),
    ],
    "for-owners.html": [
        ("What's the lifetime value of a reactivated dental patient?",
         "Industry benchmarks: a reactivated dental patient stays an average 3-4 additional years after reactivation, generates ~$2,200 in gross production over that window (2 visits/year × $285 × 4 years + 20% diagnostic/restorative uplift), and refers an average of 0.6 new patients within 18 months. Total LTV including referral value: ~$2,800-$3,400."),
        ("Can dental practice owners outsource patient reactivation?",
         "Yes, but most outsourced services use per-patient pricing which triggers state patient-brokering statutes. USDPR is a flat-fee SaaS (legal in all 50 states under federal anti-kickback safe harbor) that runs reactivation end-to-end: list import, message drafting, multi-channel sequencing, reply classification, and warm handoff to your front desk. The practice stays the merchant of record — no broker arrangement, no compliance gray zone."),
        ("How do I know if my dental practice has a reactivation problem?",
         "Three quick diagnostics: (1) Run a 'last visit > 18 months' report in Dentrix/Open Dental/Eaglesoft — if >10% of active patients show up, you have a reactivation leak. (2) Check your hygiene pre-appoint rate — under 85% signals recall leakage. (3) Check your recall-to-booked rate — industry average is 12-18%; under 10% means your current tool isn't converting. USDPR's free calculator quantifies the dollar loss."),
        ("Is dental patient reactivation worth the investment for a solo practice?",
         "For a 2,000-patient practice losing $77,000/year to lapse at a $297/month tool cost, the payback is under 7 days of the first recovered appointment. The practical floor is about 800 active patients; below that, the math gets tighter but still positive. The 14-day free trial lets you verify the math on your own data before paying."),
    ],
    "pricing.html": [
        ("How much does dental patient reactivation software cost?",
         "USDPR: $297/month for up to 2,000 patients (Practice), $697/month for up to 10,000 patients (Practice Pro), $1,997/month for DSOs up to 50,000 patients plus $297/month per additional location. All plans include a 14-day free trial with no credit card required. Competing platforms: RevenueWell $300-$500/mo, Lighthouse 360 $280-$450/mo, Weave $400-$900/mo, Solutionreach $329-$749/mo, Dental Intelligence $500-$1,200/mo."),
        ("Is there a free trial for dental reactivation SaaS?",
         "Yes — 14 days, no credit card required. You can run a full reactivation campaign during the trial and see real booked appointments before any payment. Cancel in one click from the portal. Pilot program practices (first 10) also get a 30-day money-back guarantee after the trial."),
        ("Why does USDPR use flat-fee instead of per-patient pricing?",
         "Per-patient pricing for dental patient contact triggers state patient-brokering and anti-kickback statutes in most US states (Florida §817.505, California Business & Professions Code §650, federal 42 U.S.C. §1320a-7b). Flat SaaS fees keep the arrangement in a recognized safe harbor and align incentives on campaign quality over quantity of billable reactivations."),
        ("Are there setup fees or hidden charges?",
         "No setup fees, no per-patient fees, no per-message fees, no SMS pass-through surcharges, no onboarding fees, no contract term. The published monthly price is the total price. 10DLC carrier registration ($15 one-time industry-standard fee for SMS senders) is the only external cost, and we handle the filing."),
    ],
    "integrations.html": [
        ("What dental software does USDPR integrate with?",
         "USDPR imports from Dentrix (all versions G5+), Open Dental (native API), Eaglesoft (v17+), Curve Dental (cloud), Carestream CS Practice, Denticon, and CareStack. CSV import works with any PMS. Outbound integrations include Weave, Solutionreach, and RevenueWell for coexistence (we run reactivation while they continue handling reminders). Appointment booking writes back via NexHealth, Modento, or direct PMS API where available."),
        ("How do I export my patient list from Dentrix for reactivation?",
         "Dentrix → Office Manager → Letters & Custom Lists → Patient Report → set last-visit filter to 18+ months ago, status = Active or Inactive, export to CSV. The guide at usdpr.netlify.app/blog/dentrix-broken-appointment-report.html walks through the exact clicks, filters, and column mapping to USDPR's required format."),
        ("Does USDPR connect to Open Dental via API?",
         "Yes — native Open Dental API integration (read-only for patient lookup, write access for appointment creation with practice authorization). The integration uses the Open Dental Developer Portal API keys and respects all standard Open Dental user-permission gates. Setup takes 15 minutes on a fresh Open Dental install."),
        ("Can I import my patient list from CSV without PMS integration?",
         "Yes. USDPR accepts any CSV with columns for patient name, email, mobile phone, last visit date, and primary provider (or their column-name equivalents). The upload wizard auto-detects columns, flags missing data, and runs PHI validation before import. This works identically for practices on Dentrix, Open Dental, Eaglesoft, or any other PMS."),
    ],
}


def build_schema(qa_pairs: list[tuple[str, str]]) -> str:
    obj = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a},
            }
            for q, a in qa_pairs
        ],
    }
    return (
        MARKER_OPEN
        + "\n<script type=\"application/ld+json\">\n"
        + json.dumps(obj, separators=(",", ":"))
        + "\n</script>\n"
        + MARKER_CLOSE
    )


def upsert(page_path: Path, schema_block: str) -> bool:
    html = page_path.read_text()
    if MARKER_OPEN in html:
        # Replace existing
        pattern = re.compile(
            re.escape(MARKER_OPEN) + r".*?" + re.escape(MARKER_CLOSE),
            re.DOTALL,
        )
        new = pattern.sub(schema_block, html, count=1)
    else:
        # Insert before </head>
        if "</head>" not in html:
            return False
        new = html.replace("</head>", schema_block + "\n</head>", 1)
    if new == html:
        return False
    page_path.write_text(new)
    return True


def main() -> int:
    touched = 0
    for page, pairs in PAGES.items():
        path = ROOT / page
        if not path.exists():
            print(f"  skip: {page} (not found)")
            continue
        schema = build_schema(pairs)
        if upsert(path, schema):
            print(f"  +faq {page}  ({len(pairs)} Q&A)")
            touched += 1
        else:
            print(f"  unchanged: {page}")
    print(f"\n{touched} pages updated with FAQ schema")
    return 0


if __name__ == "__main__":
    sys.exit(main())
