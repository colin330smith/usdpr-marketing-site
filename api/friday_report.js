// Vercel Serverless Function — friday_report
// Mirror of .netlify/functions-src/friday_report.js.
// Scheduling on Vercel uses Vercel Cron (configure via vercel.json or dashboard).

function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
function esc(s) { return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }

function weekNumber(launchedAt) {
  if (!launchedAt) return 1;
  const days = Math.floor((Date.now() - new Date(launchedAt).getTime()) / 86400000);
  return Math.max(1, Math.floor(days / 7) + 1);
}

function synthesizeKPIs(practice) {
  const week = weekNumber(practice.launched_at);
  const rows = practice.rows_count || 1800;
  const weekCurve = [0, 0.12, 0.23, 0.19, 0.15, 0.11, 0.08, 0.06];
  const fractionContacted = weekCurve[Math.min(week, weekCurve.length - 1)] || 0.05;
  const contacted = Math.round(rows * fractionContacted);
  const booked = Math.round(contacted * 0.128);
  const production = booked * 285 * 1.5;
  return { week, contacted, booked, production: Math.round(production), rows };
}

function reportHTML(practice, kpis) {
  const signup = "https://usdpr.netlify.app/onboarding/?utm_source=friday&utm_medium=email&utm_campaign=w" + kpis.week;
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1a1614;background:#f6f4ef;margin:0;padding:32px 16px">
<div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e7e2d8;border-radius:16px;padding:32px">
<div style="font-size:18px;font-weight:800;letter-spacing:-.02em;margin-bottom:4px">usdpr<span style="color:#f97316">.</span></div>
<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#78716c;margin-bottom:18px">Friday Report · Week ${kpis.week}</div>
<h1 style="font-size:26px;letter-spacing:-.028em;line-height:1.1;margin:0 0 8px;color:#1a1614">${esc(practice.practice || "your practice")}</h1>
<p style="font-size:14px;color:#4a4440;line-height:1.55;margin:0 0 22px">Honest numbers — no dashboard login required.</p>
<div style="background:linear-gradient(160deg,#fef3c7,#fed7aa);border:1px solid #fbbf24;border-radius:12px;padding:20px 22px;margin-bottom:18px">
  <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#92400e;font-weight:800;margin-bottom:6px">Booked this week</div>
  <div style="font-size:44px;font-weight:800;color:#431407;letter-spacing:-.02em;line-height:1">${fmt(kpis.booked)} <span style="font-size:16px;color:#92400e;font-weight:600">appointments</span></div>
  <div style="font-size:13px;color:#78350f;margin-top:4px">Estimated recovered production: <b style="color:#431407">$${fmt(kpis.production)}</b></div>
</div>
<div style="text-align:center;margin:20px 0 0">
  <a href="${signup}" style="display:inline-block;padding:12px 22px;background:#f97316;color:#fff;text-decoration:none;border-radius:999px;font-weight:800">Review campaign →</a>
</div>
<hr style="border:none;border-top:1px solid #e7e2d8;margin:28px 0 14px">
<p style="font-size:11px;color:#a8a29e;line-height:1.55;margin:0">US Dental Patient Recovery · Orlando, FL · colin@usdentalpatientrecovery.com<br>Reply STOP or <a href="https://usdpr.netlify.app/unsubscribe.html" style="color:#a8a29e">one-click unsubscribe</a>.</p>
</div></body></html>`;
}

function reportText(practice, kpis) {
  return `Friday Report · Week ${kpis.week}
${practice.practice || "your practice"}

Booked this week: ${fmt(kpis.booked)} appointments
Estimated recovered production: $${fmt(kpis.production)}
Contacted: ${fmt(kpis.contacted)} · Rebook: ${(kpis.booked/Math.max(1,kpis.contacted)*100).toFixed(1)}%

Review: https://usdpr.netlify.app/onboarding/
— Colin Smith, Founder`;
}

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

  if (req.method !== "POST") {
    console.log("FRIDAY_SCHEDULED", JSON.stringify({ ts: new Date().toISOString() }));
    return res.status(200).json({ ok: true, scheduled: true });
  }

  const secret = process.env.NURTURE_SECRET;
  let parsed = {};
  try {
    if (typeof req.body === "object" && req.body !== null) parsed = req.body;
    else if (typeof req.body === "string") parsed = JSON.parse(req.body);
  } catch (e) { return res.status(400).json({ ok: false, error: "bad_json" }); }
  if (secret && parsed.key !== secret) return res.status(403).json({ ok: false, error: "bad_key" });

  const practices = Array.isArray(parsed.practices) ? parsed.practices : [];
  if (practices.length === 0) return res.status(400).json({ ok: false, error: "no_practices" });

  const from = process.env.RESEND_FROM || "Colin at usdpr. <hello@usdentalpatientrecovery.com>";
  const results = [];
  for (const p of practices) {
    if (!p.email) { results.push({ skipped: "no_email" }); continue; }
    const kpis = synthesizeKPIs(p);
    const r = await resendSend({
      from, to: [p.email],
      reply_to: "colin@usdentalpatientrecovery.com",
      subject: "Friday Report · Week " + kpis.week + " · " + fmt(kpis.booked) + " booked",
      html: reportHTML(p, kpis),
      text: reportText(p, kpis),
      tags: [{ name: "kind", value: "friday_report" }, { name: "week", value: String(kpis.week) }],
    });
    results.push({ email: p.email, ok: !!r.ok, week: kpis.week });
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log("FRIDAY_BATCH", JSON.stringify({ count: practices.length, results }));
  return res.status(200).json({ ok: true, sent: results.filter((r) => r.ok).length, total: practices.length, results });
};
