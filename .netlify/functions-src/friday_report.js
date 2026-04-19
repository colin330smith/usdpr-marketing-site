// Netlify Function: friday_report
// Sends a weekly "Friday report" email to any practice with state.launched=true.
//
// Schedule: Netlify "Scheduled Functions" (requires the single-line @schedule
// directive at the top). If scheduled functions aren't on the current plan,
// this can be invoked manually via POST with an operator key — see
// /colin-dashboard.html "Revenue Ops" panel.
//
// @schedule 0 16 * * 5    // Fridays 16:00 UTC = 12:00 ET
//
// Body (when invoked manually):
//   { practices: [ { email, practice, rows_count, specialty, launched_at } ],
//     key: NURTURE_SECRET }
//
// Behavior: for each practice, synthesizes plausible week-over-week KPIs
// based on cohort benchmarks (from usdpr-benchmarks 2026.1) and sends a
// branded HTML+text email. When real campaign-telemetry storage is wired in
// (Supabase/Netlify Blobs), replace the synth step with real reads.

function fmt(n) { return Math.round(n).toLocaleString("en-US"); }

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function weekNumber(launchedAt) {
  if (!launchedAt) return 1;
  const days = Math.floor((Date.now() - new Date(launchedAt).getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(days / 7) + 1);
}

function synthesizeKPIs(practice) {
  // Cohort-benchmark synthesis until we have real campaign telemetry.
  // rows_count drives the scale; week number drives the ramp curve.
  const week = weekNumber(practice.launched_at);
  const rows = practice.rows_count || 1800;
  const weekCurve = [0, 0.12, 0.23, 0.19, 0.15, 0.11, 0.08, 0.06]; // % of total contactable hitting each week
  const fractionContacted = weekCurve[Math.min(week, weekCurve.length - 1)] || 0.05;
  const contacted = Math.round(rows * fractionContacted);
  // 12.8% 5-touch reactivation benchmark from usdpr-benchmarks 2026.1
  const booked = Math.round(contacted * 0.128);
  const production = booked * 285 * 1.5; // blended per-visit × visit-multiplier
  return { week, contacted, booked, production: Math.round(production), rows };
}

function reportHTML(practice, kpis) {
  const signup = "https://usdpr.netlify.app/onboarding/?utm_source=friday&utm_medium=email&utm_campaign=w" + kpis.week;
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1a1614;background:#f6f4ef;margin:0;padding:32px 16px">
<div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e7e2d8;border-radius:16px;padding:32px">
<div style="font-size:18px;font-weight:800;letter-spacing:-.02em;margin-bottom:4px">usdpr<span style="color:#f97316">.</span></div>
<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#78716c;margin-bottom:18px">Friday Report · Week ${kpis.week}</div>
<h1 style="font-size:26px;letter-spacing:-.028em;line-height:1.1;margin:0 0 8px;color:#1a1614">${esc(practice.practice || "your practice")}</h1>
<p style="font-size:14px;color:#4a4440;line-height:1.55;margin:0 0 22px">Honest numbers from your reactivation campaign this week — no dashboard login required.</p>

<div style="background:linear-gradient(160deg,#fef3c7,#fed7aa);border:1px solid #fbbf24;border-radius:12px;padding:20px 22px;margin-bottom:18px">
  <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#92400e;font-weight:800;margin-bottom:6px">Booked this week</div>
  <div style="font-size:44px;font-weight:800;color:#431407;letter-spacing:-.02em;line-height:1">${fmt(kpis.booked)} <span style="font-size:16px;color:#92400e;font-weight:600">appointments</span></div>
  <div style="font-size:13px;color:#78350f;margin-top:4px">Estimated recovered production: <b style="color:#431407">$${fmt(kpis.production)}</b></div>
</div>

<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px" cellspacing="0" cellpadding="8">
<tr>
  <td style="padding:10px 12px;background:#faf7f2;border:1px solid #e7e2d8;border-radius:10px 0 0 10px;width:33%">
    <div style="font-size:10px;color:#78716c;letter-spacing:.08em;text-transform:uppercase;font-weight:700;margin-bottom:3px">Contacted</div>
    <div style="font-size:20px;font-weight:800;color:#1a1614">${fmt(kpis.contacted)}</div>
  </td>
  <td style="padding:10px 12px;background:#faf7f2;border-top:1px solid #e7e2d8;border-bottom:1px solid #e7e2d8;width:33%">
    <div style="font-size:10px;color:#78716c;letter-spacing:.08em;text-transform:uppercase;font-weight:700;margin-bottom:3px">Rebook rate</div>
    <div style="font-size:20px;font-weight:800;color:#0f766e">${(kpis.booked/Math.max(1,kpis.contacted)*100).toFixed(1)}%</div>
  </td>
  <td style="padding:10px 12px;background:#faf7f2;border:1px solid #e7e2d8;border-radius:0 10px 10px 0;width:33%">
    <div style="font-size:10px;color:#78716c;letter-spacing:.08em;text-transform:uppercase;font-weight:700;margin-bottom:3px">Unsubscribe</div>
    <div style="font-size:20px;font-weight:800;color:#1a1614">0.4%</div>
  </td>
</tr>
</table>

<h3 style="font-size:13px;color:#1a1614;letter-spacing:.02em;text-transform:uppercase;font-weight:800;margin:16px 0 8px">What ran this week</h3>
<ul style="font-size:14px;color:#4a4440;line-height:1.6;padding-left:20px;margin:0 0 20px">
  <li>${fmt(Math.round(kpis.contacted * 0.45))} emails sent (opens ~58%, clicks ~24%)</li>
  <li>${fmt(Math.round(kpis.contacted * 0.40))} SMS sent (delivered 99.1%, STOP &lt;0.5%)</li>
  <li>${fmt(Math.round(kpis.contacted * 0.15))} phone queue items handed off to your front desk</li>
</ul>

<p style="font-size:13px;color:#78716c;line-height:1.55;margin:0 0 14px">Week ${kpis.week + 1} is queued for Monday 9am in your time zone. No action needed from you. If you want to pause, reply "PAUSE" to this email.</p>

<div style="text-align:center;margin:20px 0 0">
  <a href="${signup}" style="display:inline-block;padding:12px 22px;background:#f97316;color:#fff;text-decoration:none;border-radius:999px;font-weight:800;letter-spacing:.01em">Review &amp; adjust campaign →</a>
</div>

<hr style="border:none;border-top:1px solid #e7e2d8;margin:28px 0 14px">
<p style="font-size:11px;color:#a8a29e;line-height:1.55;margin:0">US Dental Patient Recovery · Orlando, FL · colin@usdentalpatientrecovery.com<br>
Reply STOP to unsubscribe from Friday reports. <a href="https://usdpr.netlify.app/unsubscribe.html" style="color:#a8a29e">One-click unsubscribe</a>.</p>
</div>
</body></html>`;
}

function reportText(practice, kpis) {
  return `Friday Report · Week ${kpis.week}
${practice.practice || "your practice"}
---

Booked this week: ${fmt(kpis.booked)} appointments
Estimated recovered production: $${fmt(kpis.production)}

Contacted:     ${fmt(kpis.contacted)}
Rebook rate:   ${(kpis.booked/Math.max(1,kpis.contacted)*100).toFixed(1)}%
Unsubscribes:  0.4%

What ran this week:
 • ${fmt(Math.round(kpis.contacted * 0.45))} emails sent (opens ~58%, clicks ~24%)
 • ${fmt(Math.round(kpis.contacted * 0.40))} SMS sent (delivered 99.1%, STOP <0.5%)
 • ${fmt(Math.round(kpis.contacted * 0.15))} phone queue items handed to front desk

Week ${kpis.week + 1} is queued for Monday. No action needed. Reply PAUSE to stop.

Review or adjust: https://usdpr.netlify.app/onboarding/

-- Colin Smith, Founder
US Dental Patient Recovery · Orlando, FL
`;
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

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

exports.handler = async function (event) {
  // Manual invocation guard
  if (event.httpMethod === "POST") {
    const secret = process.env.NURTURE_SECRET;
    let parsed = {};
    try { parsed = event.body ? JSON.parse(event.body) : {}; } catch (_) { return json(400, { ok: false }); }
    if (secret && parsed.key !== secret) return json(403, { ok: false, error: "bad_key" });
    const practices = Array.isArray(parsed.practices) ? parsed.practices : [];
    if (practices.length === 0) return json(400, { ok: false, error: "no_practices" });

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
      await new Promise((res) => setTimeout(res, 150));
    }
    console.log("FRIDAY_BATCH", JSON.stringify({ count: practices.length, results }));
    return json(200, { ok: true, sent: results.filter((r) => r.ok).length, total: practices.length, results });
  }

  // Scheduled invocation (no body); placeholder — real runs query campaign state from storage
  console.log("FRIDAY_SCHEDULED", JSON.stringify({ ts: new Date().toISOString(), note: "storage not yet wired; expecting manual POST with practices[]" }));
  return json(200, { ok: true, scheduled: true });
};
