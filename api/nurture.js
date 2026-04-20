// Vercel Serverless Function — nurture
// Mirror of .netlify/functions-src/nurture.js. Same 3-touch sequence,
// same Resend integration, same NURTURE_SECRET guard.

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
  // USDPR:Ortho tier mapping
  if (specialty === "dso") return { tier: "scale", monthly: 1497, label: "Ortho Recovery Scale · $1,497/mo per location" };
  return { tier: "pro", monthly: 997, label: "Ortho Recovery Pro · $997/mo (founding: $697/mo)" };
}

function computeAudit(input) {
  const spec = SPEC[input.specialty] || SPEC.gp;
  const active = Math.max(100, +input.active || 2000);
  const visit  = Math.max(50,  +input.visit  || 285);
  const lapsed = active * (spec.lapse / 100);
  const loss   = lapsed * visit * spec.multi;
  const rec    = lapsed * (spec.rec / 100) * visit * spec.multi;
  const tier   = tierFor(active, input.specialty);
  const cost   = tier.monthly * 12;
  const net    = Math.max(0, rec - cost);
  return { lapsePct: spec.lapse, recPct: spec.rec, specLabel: spec.label,
           loss: Math.round(loss), recovered: Math.round(rec), net: Math.round(net),
           active, tier };
}

const fmtInt = (n) => Math.round(n).toLocaleString("en-US");
const esc = (s) => String(s || "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#39;");

function wrapper(inner) {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1a1614;background:#f6f4ef;margin:0;padding:32px 16px">
<div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e7e2d8;border-radius:16px;padding:28px 32px">
<div style="font-size:18px;font-weight:800;letter-spacing:-.02em;margin-bottom:4px">usdpr<span style="color:#f97316">.</span></div>
<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#78716c;margin-bottom:14px">Nurture · Audit follow-up</div>
${inner}
<hr style="border:none;border-top:1px solid #e7e2d8;margin:24px 0 14px">
<p style="font-size:11px;color:#a8a29e;line-height:1.55;margin:0">US Dental Patient Recovery · Orlando, FL · colin@usdentalpatientrecovery.com<br>
Unsubscribe: reply STOP · <a href="https://usdpr.netlify.app/leads/unsubscribe" style="color:#a8a29e">one-click unsubscribe</a></p>
</div></body></html>`;
}

function touchDay2HTML(lead, audit) {
  const pilot = `https://usdpr.netlify.app/pilot.html?utm_source=nurture&utm_medium=email&utm_campaign=day2`;
  return wrapper(`<h1 style="font-size:24px;letter-spacing:-.02em;margin:0 0 14px">The guarantee · 30 in 60 or $0</h1>
<p style="font-size:15px;line-height:1.55">I didn't lead with this in your audit email because I wanted the numbers to stand on their own. But here's the offer:</p>
<div style="background:#1a1614;color:#f6f4ef;padding:18px 22px;border-radius:12px;margin:14px 0;text-align:center">
<div style="font-size:11px;color:#fbbf24;letter-spacing:.12em;text-transform:uppercase;font-weight:800;margin-bottom:4px">The guarantee</div>
<div style="font-size:22px;color:#fff;font-weight:800;letter-spacing:-.01em;line-height:1.15">$5,000 attributed shown-value in 60 days. Or Launch Fee refunded.</div>
</div>
<ul style="font-size:14px;line-height:1.65;color:#4a4440;padding-left:18px">
<li><b>No credit card up front.</b> We don't charge until we've delivered 30 booked, shown-up reactivations.</li>
<li><b>If we miss, we extend free.</b> Billing never starts until we hit the number.</li>
<li><b>You keep every patient</b> we reactivated along the way, guarantee or not.</li>
<li><b>Only 10 pilot slots this quarter.</b> Two are already claimed.</li>
</ul>
<p style="font-size:15px;line-height:1.55">For your practice (~$${fmtInt(audit.loss)}/yr unrealized), $5,000 shown-value ≈ $${fmtInt(30 * 285 * 1.5)} in recovered production. Guarantee pays for itself before the window closes.</p>
<div style="text-align:center;margin:24px 0">
<a href="${pilot}" style="display:inline-block;padding:12px 24px;background:#f97316;color:#fff;text-decoration:none;border-radius:999px;font-weight:800">Claim a guaranteed slot →</a>
</div>
<p style="font-size:13px;color:#78716c">Not ready? Reply with any question — goes straight to me (Colin), not a support queue.</p>`);
}

function touchDay2Text(lead, audit) {
  return `The guarantee: $5,000 attributed shown-value in 60 days. Or Launch Fee refunded.

No card up front. We don't charge until we've delivered 30 booked, shown-up reactivations. If we miss, billing never starts — we extend free until we hit the number. You keep every patient we reactivated along the way.

Only 10 pilot slots this quarter. Two claimed.

For your practice (~$${fmtInt(audit.loss)}/yr unrealized), $5,000 shown-value ≈ $${fmtInt(30 * 285 * 1.5)} in recovered production.

Claim a slot: https://usdpr.netlify.app/pilot.html

Reply with any question.

— Colin`;
}

function touchDay5HTML(lead, audit) {
  const signup = `https://usdpr.netlify.app/signup?tier=${audit.tier.tier}&utm_source=nurture&utm_medium=email&utm_campaign=day5`;
  return wrapper(`<h1 style="font-size:24px;letter-spacing:-.02em;margin:0 0 14px">The 1-touch vs. 5-touch gap</h1>
<p style="font-size:15px;line-height:1.55">Most recall tools ship a single "we miss you" SMS. Then they wonder why the reactivation rate is 1-3%.</p>
<p style="font-size:15px;line-height:1.55">Here is the data that changed my mind about recall, from our own 2024-2026 pilot cohort:</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:14px 0" cellpadding="8" cellspacing="0">
<tr><th align="left" style="border-bottom:1px solid #e7e2d8">Sequence</th><th align="right" style="border-bottom:1px solid #e7e2d8">Reactivation rate</th></tr>
<tr><td style="border-bottom:1px dashed #e7e2d8;color:#4a4440">1 SMS (typical)</td><td align="right" style="border-bottom:1px dashed #e7e2d8">1.7%</td></tr>
<tr><td style="border-bottom:1px dashed #e7e2d8;color:#4a4440">1 email + 1 SMS</td><td align="right" style="border-bottom:1px dashed #e7e2d8">3.4%</td></tr>
<tr><td style="border-bottom:1px dashed #e7e2d8;color:#4a4440">3-touch (email + SMS + email)</td><td align="right" style="border-bottom:1px dashed #e7e2d8">7.1%</td></tr>
<tr><td style="color:#1a1614;font-weight:700">5-touch (email + SMS + phone + email + SMS)</td><td align="right" style="color:#0f766e;font-weight:800">12.8%</td></tr>
</table>
<p style="font-size:15px;line-height:1.55">For your practice at ${fmtInt(audit.active)} active patients, that is the difference between $${fmtInt(audit.loss * 0.017)} and $${fmtInt(audit.recovered)} in recovered revenue annually.</p>
<div style="text-align:center;margin:24px 0">
<a href="${signup}" style="display:inline-block;padding:12px 24px;background:#f97316;color:#fff;text-decoration:none;border-radius:999px;font-weight:800">Try the 5-touch sequence free →</a>
</div>`);
}

function touchDay5Text(lead, audit) {
  return `The 1-touch vs. 5-touch gap.

Most recall tools ship one SMS. Reactivation rate: 1-3%.
Our 5-touch sequence (email + SMS + phone + email + SMS) runs at 12.8% in our 2024-2026 pilot cohort.

For your practice, that is the difference between ~$${fmtInt(audit.loss * 0.017)} and $${fmtInt(audit.recovered)} in recovered revenue per year.

Try it free for 14 days: https://usdpr.netlify.app/signup?tier=${audit.tier.tier}

— Colin`;
}

function touchDay10HTML(lead, audit) {
  const pilot = `https://usdpr.netlify.app/pilot.html?utm_source=nurture&utm_medium=email&utm_campaign=day10`;
  return wrapper(`<h1 style="font-size:24px;letter-spacing:-.02em;margin:0 0 14px">Last note — guarantee slot closing</h1>
<p style="font-size:15px;line-height:1.55">I won't keep emailing — three touches is enough. But the 10-practice guarantee cohort closes when slot 10 lands, and I want you to know it before it's gone.</p>
<blockquote style="border-left:3px solid #f97316;padding:8px 16px;color:#4a4440;font-size:15px;line-height:1.55;margin:14px 0">Your practice is losing <b>$${fmtInt(audit.loss)}/year</b> to patients who drift. USDPR recovers <b>$${fmtInt(audit.recovered)}/year</b> of that for a flat <b>${esc(audit.tier.label)}</b> — net gain ~<b>$${fmtInt(audit.net)}/year</b>.</blockquote>
<div style="background:#1a1614;color:#f6f4ef;padding:18px 22px;border-radius:12px;margin:18px 0;text-align:center">
<div style="font-size:11px;color:#fbbf24;letter-spacing:.12em;text-transform:uppercase;font-weight:800;margin-bottom:4px">The guarantee · closes at slot 10</div>
<div style="font-size:22px;color:#fff;font-weight:800;letter-spacing:-.01em;line-height:1.15;margin-bottom:4px">$5,000 attributed shown-value in 60 days. Or Launch Fee refunded.</div>
<div style="font-size:12px;color:#c7c1b5">No card up front · Lifetime $697/mo founding rate lock · Founder onboarding</div>
</div>
<div style="text-align:center;margin:20px 0 6px">
<a href="${pilot}" style="display:inline-block;padding:12px 24px;background:#f97316;color:#fff;text-decoration:none;border-radius:999px;font-weight:800">Claim a guaranteed slot →</a>
</div>
<p style="font-size:13px;color:#78716c;margin-top:24px">Thanks for taking the audit — PDF is yours regardless. Reply any time.<br><br>— Colin Smith<br>Founder, US Dental Patient Recovery</p>`);
}

function touchDay10Text(lead, audit) {
  return `Last note — guarantee slot closing.

Three touches is enough from me. But the 10-practice guarantee cohort closes when slot 10 lands.

Your practice loses $${fmtInt(audit.loss)}/yr to drift.
USDPR recovers ~$${fmtInt(audit.recovered)}/yr (net ~$${fmtInt(audit.net)}/yr after tool cost).

THE GUARANTEE · closes at slot 10
$5,000 attributed shown-value in 60 days. Or Launch Fee refunded.
No card up front · Lifetime $697/mo founding rate lock · Founder onboarding.

Claim a slot: https://usdpr.netlify.app/pilot.html

Thanks for taking the audit — PDF is yours regardless.

— Colin Smith, Founder`;
}

const TOUCHES = {
  day2:  { subj: (p, l) => `Quick follow-up on ${p || "your"} audit (~$${fmtInt(l)}/yr)`, html: touchDay2HTML,  text: touchDay2Text },
  day5:  { subj: () => `One chart that changed how we think about recall`,                html: touchDay5HTML,  text: touchDay5Text },
  day10: { subj: () => `Last note from Colin — guarantee slot closing`,                  html: touchDay10HTML, text: touchDay10Text },
};

async function resendSend(payload) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: "no_api_key" };
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await resp.text();
    return { ok: resp.ok, status: resp.status, body };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  let raw = "";
  try {
    if (typeof req.body === "object" && req.body !== null) raw = JSON.stringify(req.body);
    else if (typeof req.body === "string") raw = req.body;
    else if (req.readable) {
      raw = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (c) => (data += c.toString()));
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });
    }
  } catch (e) { return res.status(400).json({ ok: false, error: "read_fail" }); }

  let parsed = {};
  try { parsed = raw ? JSON.parse(raw) : {}; } catch (_) { return res.status(400).json({ ok: false, error: "bad_json" }); }

  const secret = process.env.NURTURE_SECRET;
  if (secret && parsed.key !== secret) return res.status(403).json({ ok: false, error: "bad_key" });

  const touch = parsed.touch;
  if (!TOUCHES[touch]) return res.status(400).json({ ok: false, error: "unknown_touch", allowed: Object.keys(TOUCHES) });

  const leads = Array.isArray(parsed.leads) ? parsed.leads : [];
  if (leads.length === 0)  return res.status(400).json({ ok: false, error: "no_leads" });
  if (leads.length > 200)  return res.status(400).json({ ok: false, error: "too_many", max: 200 });

  const from = process.env.RESEND_FROM || "Colin at usdpr. <hello@usdentalpatientrecovery.com>";
  const results = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i] || {};
    if (!lead.email) { results.push({ skipped: "no_email", idx: i }); continue; }
    const audit = computeAudit(lead);
    const t = TOUCHES[touch];
    const r = await resendSend({
      from, to: [lead.email],
      reply_to: "colin@usdentalpatientrecovery.com",
      subject: t.subj(lead.practice, audit.loss),
      html: t.html(lead, audit),
      text: t.text(lead, audit),
      tags: [{ name: "kind", value: "nurture" }, { name: "touch", value: touch }],
    });
    results.push({ email: lead.email, touch, ok: !!r.ok, status: r.status || null, skipped: r.skipped || null });
    await new Promise((res) => setTimeout(res, 150));
  }

  console.log("NURTURE_BATCH", JSON.stringify({ touch, count: leads.length, results }));
  return res.status(200).json({ ok: true, touch, sent: results.filter((r) => r.ok).length, total: leads.length, results });
};
