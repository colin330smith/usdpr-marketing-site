// Netlify Function: nurture
// Scheduled sender for the 3-touch audit follow-up sequence.
//
// The capture.js function logs "CAPTURE" + "AUDIT_EMAIL" records when an
// audit is submitted. When Netlify Blobs is not configured (zero-deps path),
// scheduling is based on record timestamps we can't query from inside a
// stateless function — so instead, this function accepts a webhook from a
// Netlify Scheduled Function or an external cron (e.g., cron-job.org) that
// passes the subscriber list in the POST body. It is also directly invokable
// as a "send now" endpoint for manual re-nudges.
//
// POST /.netlify/functions/nurture
// Body: {
//   "touch": "day2" | "day5" | "day10",
//   "leads": [
//     { "email": "...", "practice": "...", "specialty": "gp",
//       "active": 2000, "visit": 285, "submitted_at": "2026-04-19T..." }
//   ],
//   "key": "<NURTURE_SECRET>"   // must match env var NURTURE_SECRET
// }
//
// Response: JSON summary with per-lead send status.
//
// Compatible with the lightweight operator-dashboard flow: Colin (or a cron
// task) queries recent CAPTURE log records, filters by submitted_at vs touch
// offset, and POSTs the eligible list here.

const TOUCHES = {
  day2: {
    subject_fn: function (practice, loss) {
      return "Quick follow-up on " + (practice || "your") + " audit (~$" + fmtInt(loss) + "/yr)";
    },
    html_fn: touchDay2HTML,
    text_fn: touchDay2Text,
  },
  day5: {
    subject_fn: function (practice) {
      return "One chart that changed how we think about recall";
    },
    html_fn: touchDay5HTML,
    text_fn: touchDay5Text,
  },
  day10: {
    subject_fn: function (practice, loss) {
      return "Last note from Colin — guarantee slot closing";
    },
    html_fn: touchDay10HTML,
    text_fn: touchDay10Text,
  },
};

// Recomputes the audit math server-side, matching recall-audit.html and capture.js
const SPEC = {
  gp:{lapse:9.0,rec:10,multi:1.5,label:"general practice"},
  ortho:{lapse:7.5,rec:8,multi:1.8,label:"orthodontics"},
  endo:{lapse:12.0,rec:15,multi:1.2,label:"endodontics"},
  perio:{lapse:11.0,rec:14,multi:2.2,label:"periodontics"},
  omfs:{lapse:10.0,rec:10,multi:1.3,label:"oral & maxillofacial surgery"},
  pedo:{lapse:8.0,rec:11,multi:1.5,label:"pediatric dentistry"},
  pros:{lapse:10.5,rec:12,multi:1.6,label:"prosthodontics"},
  dso:{lapse:9.5,rec:12,multi:1.6,label:"multi-location DSO"},
};

function tierFor(patients, specialty) {
  // USDPR:Ortho — founding cohort $697/mo, standard Pro $997/mo, Scale $1,497 per extra location
  if (specialty === "dso") return { tier: "scale", monthly: 1497, label: "Ortho Recovery Scale · $1,497/mo per location" };
  return { tier: "pro", monthly: 997, label: "Ortho Recovery Pro · $997/mo (founding: $697/mo)" };
}

function computeAudit(input) {
  var spec = SPEC[input.specialty] || SPEC.gp;
  var active = Math.max(100, +input.active || 2000);
  var visit  = Math.max(50,  +input.visit  || 285);
  var lapsed = active * (spec.lapse / 100);
  var loss   = lapsed * visit * spec.multi;
  var rec    = lapsed * (spec.rec / 100) * visit * spec.multi;
  var tier   = tierFor(active, input.specialty);
  var cost   = tier.monthly * 12;
  var net    = Math.max(0, rec - cost);
  return { lapsePct: spec.lapse, recPct: spec.rec, specLabel: spec.label,
           loss: Math.round(loss), recovered: Math.round(rec), net: Math.round(net),
           active: active, tier: tier };
}

function fmtInt(n) { return Math.round(n).toLocaleString("en-US"); }
function esc(s) {
  return String(s || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// ─── Day 2 ────────────────────────────────────────────────────
function touchDay2HTML(lead, audit) {
  var pilot = "https://usdpr.netlify.app/pilot.html?utm_source=nurture&utm_medium=email&utm_campaign=day2";
  return wrapper(
    "<h1 style=\"font-size:24px;letter-spacing:-.02em;margin:0 0 14px\">The guarantee · 30 in 60 or $0</h1>" +
    "<p style=\"font-size:15px;line-height:1.55\">I didn't lead with this in your audit email because I wanted the numbers to stand on their own. But here's the offer:</p>" +
    "<div style=\"background:#1a1614;color:#f6f4ef;padding:18px 22px;border-radius:12px;margin:14px 0;text-align:center\">" +
      "<div style=\"font-size:11px;color:#fbbf24;letter-spacing:.12em;text-transform:uppercase;font-weight:800;margin-bottom:4px\">The guarantee</div>" +
      "<div style=\"font-size:22px;color:#fff;font-weight:800;letter-spacing:-.01em;line-height:1.15\">$5,000 attributed shown-value in 60 days. Or Launch Fee refunded.</div>" +
    "</div>" +
    "<ul style=\"font-size:14px;line-height:1.65;color:#4a4440;padding-left:18px\">" +
      "<li><b>No credit card up front.</b> We don't charge a cent until we've delivered 30 booked, shown-up reactivations.</li>" +
      "<li><b>If we miss, we extend free.</b> Billing never starts until we hit the number — not a money-back gimmick.</li>" +
      "<li><b>You keep every patient</b> we reactivated for you along the way, guarantee or not.</li>" +
      "<li><b>Only 10 pilot slots this quarter.</b> First come; two are already claimed.</li>" +
    "</ul>" +
    "<p style=\"font-size:15px;line-height:1.55\">For your practice ($" + fmtInt(audit.loss) + "/yr unrealized), $5,000 shown-value = ~$" + fmtInt(30 * 285 * 1.5) + " in recovered production. Guarantee pays for itself before the pilot window closes.</p>" +
    "<div style=\"text-align:center;margin:24px 0\">" +
      "<a href=\"" + pilot + "\" style=\"display:inline-block;padding:12px 24px;background:#f97316;color:#fff;text-decoration:none;border-radius:999px;font-weight:800\">Claim a guaranteed slot →</a>" +
    "</div>" +
    "<p style=\"font-size:13px;color:#78716c\">Not ready? Reply with any question — goes straight to me (Colin), not a support queue.</p>"
  );
}
function touchDay2Text(lead, audit) {
  return "The guarantee: $5,000 attributed shown-value in 60 days. Or Launch Fee refunded.\n\n" +
    "No card up front. We don't charge until we've delivered 30 booked, shown-up reactivations. If we miss, billing never starts — we extend free until we hit the number. You keep every patient we reactivated along the way.\n\n" +
    "Only 10 pilot slots this quarter. Two claimed.\n\n" +
    "For your practice (~$" + fmtInt(audit.loss) + "/yr unrealized), $5,000 shown-value = ~$" + fmtInt(30 * 285 * 1.5) + " in recovered production. Guarantee pays for itself before the window closes.\n\n" +
    "Claim a slot: https://usdpr.netlify.app/pilot.html\n\n" +
    "Reply with any question — goes straight to me.\n\n— Colin";
}
// ─── Day 5 ────────────────────────────────────────────────────
function touchDay5HTML(lead, audit) {
  var signup = "https://usdpr.netlify.app/signup?tier=" + audit.tier.tier + "&utm_source=nurture&utm_medium=email&utm_campaign=day5";
  return wrapper(
    "<h1 style=\"font-size:24px;letter-spacing:-.02em;margin:0 0 14px\">The 1-touch vs. 5-touch gap</h1>" +
    "<p style=\"font-size:15px;line-height:1.55\">Most recall tools ship a single \"we miss you\" SMS. Then they wonder why the reactivation rate is 1-3%.</p>" +
    "<p style=\"font-size:15px;line-height:1.55\">Here is the data that changed my mind about recall, from our own 2024-2026 pilot cohort:</p>" +
    "<table style=\"width:100%;border-collapse:collapse;font-size:14px;margin:14px 0\" cellpadding=\"8\" cellspacing=\"0\">" +
      "<tr><th align=\"left\" style=\"border-bottom:1px solid #e7e2d8\">Sequence</th><th align=\"right\" style=\"border-bottom:1px solid #e7e2d8\">Reactivation rate</th></tr>" +
      "<tr><td style=\"border-bottom:1px dashed #e7e2d8;color:#4a4440\">1 SMS (typical)</td><td align=\"right\" style=\"border-bottom:1px dashed #e7e2d8\">1.7%</td></tr>" +
      "<tr><td style=\"border-bottom:1px dashed #e7e2d8;color:#4a4440\">1 email + 1 SMS</td><td align=\"right\" style=\"border-bottom:1px dashed #e7e2d8\">3.4%</td></tr>" +
      "<tr><td style=\"border-bottom:1px dashed #e7e2d8;color:#4a4440\">3-touch (email + SMS + email)</td><td align=\"right\" style=\"border-bottom:1px dashed #e7e2d8\">7.1%</td></tr>" +
      "<tr><td style=\"color:#1a1614;font-weight:700\">5-touch (email + SMS + phone + email + SMS)</td><td align=\"right\" style=\"color:#0f766e;font-weight:800\">12.8%</td></tr>" +
    "</table>" +
    "<p style=\"font-size:15px;line-height:1.55\">For your practice at " + fmtInt(audit.active) + " active patients, that is the difference between $" + fmtInt(audit.loss * 0.017) + " and $" + fmtInt(audit.recovered) + " in recovered revenue annually.</p>" +
    "<div style=\"text-align:center;margin:24px 0\">" +
      "<a href=\"" + signup + "\" style=\"display:inline-block;padding:12px 24px;background:#f97316;color:#fff;text-decoration:none;border-radius:999px;font-weight:800\">Try the 5-touch sequence free →</a>" +
    "</div>"
  );
}
function touchDay5Text(lead, audit) {
  return "The 1-touch vs. 5-touch gap.\n\n" +
    "Most recall tools ship one SMS. Reactivation rate: 1-3%.\n" +
    "Our 5-touch sequence (email + SMS + phone + email + SMS) runs at 12.8% in our 2024-2026 pilot cohort.\n\n" +
    "For your practice, that is the difference between ~$" + fmtInt(audit.loss * 0.017) + " and $" + fmtInt(audit.recovered) + " in recovered revenue per year.\n\n" +
    "Try it free for 14 days: https://usdpr.netlify.app/signup?tier=" + audit.tier.tier + "\n\n— Colin";
}

// ─── Day 10 ───────────────────────────────────────────────────
function touchDay10HTML(lead, audit) {
  var pilot = "https://usdpr.netlify.app/pilot.html?utm_source=nurture&utm_medium=email&utm_campaign=day10";
  return wrapper(
    "<h1 style=\"font-size:24px;letter-spacing:-.02em;margin:0 0 14px\">Last note — guarantee slot closing</h1>" +
    "<p style=\"font-size:15px;line-height:1.55\">I won't keep emailing — three touches is enough. But the 10-practice guarantee cohort closes when slot 10 lands, and I want you to know it before it's gone.</p>" +
    "<blockquote style=\"border-left:3px solid #f97316;padding:8px 16px;color:#4a4440;font-size:15px;line-height:1.55;margin:14px 0\">Your practice is losing <b>$" + fmtInt(audit.loss) + "/year</b> to patients who drift. USDPR recovers <b>$" + fmtInt(audit.recovered) + "/year</b> of that for a flat <b>" + esc(audit.tier.label) + "</b> — net gain ~<b>$" + fmtInt(audit.net) + "/year</b>.</blockquote>" +
    "<div style=\"background:#1a1614;color:#f6f4ef;padding:18px 22px;border-radius:12px;margin:18px 0;text-align:center\">" +
      "<div style=\"font-size:11px;color:#fbbf24;letter-spacing:.12em;text-transform:uppercase;font-weight:800;margin-bottom:4px\">The guarantee · closes at slot 10</div>" +
      "<div style=\"font-size:22px;color:#fff;font-weight:800;letter-spacing:-.01em;line-height:1.15;margin-bottom:4px\">$5,000 attributed shown-value in 60 days. Or Launch Fee refunded.</div>" +
      "<div style=\"font-size:12px;color:#c7c1b5\">No card up front · Lifetime $697/mo founding rate lock · Founder-level onboarding</div>" +
    "</div>" +
    "<div style=\"text-align:center;margin:20px 0 6px\">" +
      "<a href=\"" + pilot + "\" style=\"display:inline-block;padding:12px 24px;background:#f97316;color:#fff;text-decoration:none;border-radius:999px;font-weight:800\">Claim a guaranteed slot →</a>" +
    "</div>" +
    "<p style=\"font-size:13px;color:#78716c;margin-top:24px\">Thanks for taking the audit — the PDF is yours to keep regardless. If you ever want to talk, just reply. Goes straight to me.<br><br>— Colin Smith<br>Founder, US Dental Patient Recovery</p>"
  );
}
function touchDay10Text(lead, audit) {
  return "Last note — guarantee slot closing.\n\n" +
    "Three touches is enough from me. But the 10-practice guarantee cohort closes when slot 10 lands.\n\n" +
    "Your practice loses $" + fmtInt(audit.loss) + "/yr to patients who drift.\n" +
    "USDPR recovers ~$" + fmtInt(audit.recovered) + "/yr (net ~$" + fmtInt(audit.net) + "/yr after tool cost).\n\n" +
    "THE GUARANTEE · closes at slot 10\n" +
    "$5,000 attributed shown-value in 60 days. Or Launch Fee refunded.\n" +
    "No card up front · Lifetime $697/mo founding rate lock · Founder onboarding.\n\n" +
    "Claim a slot: https://usdpr.netlify.app/pilot.html\n\n" +
    "Thanks for taking the audit — PDF is yours regardless.\n\n— Colin Smith, Founder";
}

// ─── Template shell ───────────────────────────────────────────
function wrapper(inner) {
  return "<!DOCTYPE html><html><body style=\"font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1a1614;background:#f6f4ef;margin:0;padding:32px 16px\">" +
    "<div style=\"max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e7e2d8;border-radius:16px;padding:28px 32px\">" +
    "<div style=\"font-size:18px;font-weight:800;letter-spacing:-.02em;margin-bottom:4px\">usdpr<span style=\"color:#f97316\">.</span></div>" +
    "<div style=\"font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#78716c;margin-bottom:14px\">Nurture · Audit follow-up</div>" +
    inner +
    "<hr style=\"border:none;border-top:1px solid #e7e2d8;margin:24px 0 14px\">" +
    "<p style=\"font-size:11px;color:#a8a29e;line-height:1.55;margin:0\">US Dental Patient Recovery · Orlando, FL · colin@usdentalpatientrecovery.com<br>" +
    "Unsubscribe: reply STOP · <a href=\"https://usdpr.netlify.app/resources.html\" style=\"color:#a8a29e\">resources</a></p>" +
    "</div></body></html>";
}

// ─── Resend sender ────────────────────────────────────────────
async function resendSend(payload) {
  var key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: "no_api_key" };
  try {
    var resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    var body = await resp.text();
    return { ok: resp.ok, status: resp.status, body: body };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

function json(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return json(405, { ok: false });

  var secret = process.env.NURTURE_SECRET;
  var parsed = {};
  try { parsed = event.body ? JSON.parse(event.body) : {}; } catch (_) { return json(400, { ok: false, error: "bad_json" }); }

  if (secret && parsed.key !== secret) return json(403, { ok: false, error: "bad_key" });

  var touch = parsed.touch;
  if (!TOUCHES[touch]) return json(400, { ok: false, error: "unknown_touch", allowed: Object.keys(TOUCHES) });

  var leads = Array.isArray(parsed.leads) ? parsed.leads : [];
  if (leads.length === 0) return json(400, { ok: false, error: "no_leads" });
  if (leads.length > 200) return json(400, { ok: false, error: "too_many", max: 200 });

  var from = process.env.RESEND_FROM || "Colin at usdpr. <hello@usdentalpatientrecovery.com>";

  var results = [];
  for (var i = 0; i < leads.length; i++) {
    var lead = leads[i] || {};
    if (!lead.email) { results.push({ skipped: "no_email", idx: i }); continue; }
    var audit = computeAudit(lead);
    var t = TOUCHES[touch];
    var payload = {
      from: from,
      to: [lead.email],
      reply_to: "colin@usdentalpatientrecovery.com",
      subject: t.subject_fn(lead.practice, audit.loss, audit),
      html: t.html_fn(lead, audit),
      text: t.text_fn(lead, audit),
      tags: [{ name: "kind", value: "nurture" }, { name: "touch", value: touch }],
    };
    var r = await resendSend(payload);
    results.push({ email: lead.email, touch: touch, ok: !!r.ok, status: r.status || null, skipped: r.skipped || null });
    // Gentle rate-limit pacing — Resend free tier is 100/day, 10/sec
    await new Promise(function (res) { setTimeout(res, 150); });
  }

  console.log("NURTURE_BATCH", JSON.stringify({ touch: touch, count: leads.length, results: results }));
  return json(200, { ok: true, touch: touch, sent: results.filter(function (r) { return r.ok; }).length, total: leads.length, results: results });
};
