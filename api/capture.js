// Vercel Serverless Function — capture
// Mirror of .netlify/functions-src/capture.js, ported to Vercel's Node.js
// request/response signature. Same logic, same env vars.

const MAX_BODY = 16 * 1024;
const FORBIDDEN_KEYS = new Set([
  "patient_id","patient_name","patient_email","patient_phone",
  "dob","date_of_birth","ssn","diagnosis","treatment",
  "procedure_code","cpt","icd10","mrn","pms_id",
  "chart_number","insurance_id","claim_id",
]);

function redact(body, depth) {
  depth = depth || 0;
  if (depth > 6 || body === null || body === undefined) return body;
  if (Array.isArray(body)) return body.slice(0, 50).map((x) => redact(x, depth + 1));
  if (typeof body === "object") {
    const out = {};
    for (const k in body) {
      if (!Object.prototype.hasOwnProperty.call(body, k)) continue;
      if (FORBIDDEN_KEYS.has(k.toLowerCase())) continue;
      out[k] = redact(body[k], depth + 1);
    }
    return out;
  }
  if (typeof body === "string") return body.slice(0, 2000);
  return body;
}

function kindFor(path) {
  const p = (path || "").toLowerCase();
  if (p.includes("/leads/audit"))      return "audit_submit";
  if (p.includes("/leads/analytics"))  return "analytics";
  if (p.includes("/leads/playbook"))   return "playbook_request";
  if (p.includes("/leads/share"))      return "calculator_share";
  if (p.includes("/cancel/action"))    return "cancel_action";
  if (p.includes("/schedule/book"))    return "schedule_book";
  if (p.includes("/referrals/submit")) return "referral_submit";
  if (p.includes("/onboarding/step"))  return "onboarding_step";
  return "unknown";
}

const SPEC = {
  gp:    { lapse: 9.0,  rec: 10, multi: 1.5, label: "general practice" },
  ortho: { lapse: 7.5,  rec:  8, multi: 1.8, label: "orthodontics" },
  endo:  { lapse: 12.0, rec: 15, multi: 1.2, label: "endodontics" },
  perio: { lapse: 11.0, rec: 14, multi: 2.2, label: "periodontics" },
  omfs:  { lapse: 10.0, rec: 10, multi: 1.3, label: "oral & maxillofacial surgery" },
  pedo:  { lapse:  8.0, rec: 11, multi: 1.5, label: "pediatric dentistry" },
  pros:  { lapse: 10.5, rec: 12, multi: 1.6, label: "prosthodontics" },
  dso:   { lapse:  9.5, rec: 12, multi: 1.6, label: "multi-location DSO" },
};

function tierFor(patients, specialty) {
  if (specialty === "dso") return { tier: "dso", monthly: 1997, label: "DSO · $1,997/mo" };
  if (patients <= 2000)    return { tier: "practice", monthly: 297, label: "Practice · $297/mo" };
  if (patients <= 10000)   return { tier: "practice_pro", monthly: 697, label: "Practice Pro · $697/mo" };
  return                         { tier: "dso", monthly: 1997, label: "DSO · $1,997/mo" };
}

function computeAudit(input) {
  const spec   = SPEC[input.specialty] || SPEC.gp;
  const active = Math.max(100, +input.active || 2000);
  const visit  = Math.max(50,  +input.visit  || 285);
  const lapsed = active * (spec.lapse / 100);
  const loss   = lapsed * visit * spec.multi;
  const rec    = lapsed * (spec.rec / 100) * visit * spec.multi;
  const tier   = tierFor(active, input.specialty);
  const cost   = tier.monthly * 12;
  const net    = Math.max(0, rec - cost);
  return {
    lapsePct: spec.lapse, recPct: spec.rec, multi: spec.multi, specLabel: spec.label,
    active, visit, lapsed: Math.round(lapsed), loss: Math.round(loss),
    recovered: Math.round(rec), tier, toolCost: cost, net: Math.round(net),
  };
}

const fmt = (n) => Math.round(n).toLocaleString("en-US");

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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

function auditEmailHTML(capture, audit) {
  const practice = esc((capture.body && capture.body.practice) || "your practice");
  const signupLink = "https://usdpr.netlify.app/signup?tier=" + audit.tier.tier + "&utm_source=audit_email&utm_medium=email&utm_campaign=pdf_delivery";
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1a1614;background:#f6f4ef;margin:0;padding:32px 16px">
<div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e7e2d8;border-radius:16px;padding:32px">
<div style="font-size:20px;font-weight:800;letter-spacing:-.02em;margin-bottom:4px">usdpr<span style="color:#f97316">.</span></div>
<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#78716c;margin-bottom:20px">Recall Revenue Audit</div>
<h1 style="font-size:28px;letter-spacing:-.03em;line-height:1.1;margin:0 0 12px;color:#1a1614">Your audit for ${practice}</h1>
<p style="font-size:15px;line-height:1.55;color:#4a4440;margin:0 0 20px">Based on the numbers you entered, here are the three that matter most:</p>
<div style="background:linear-gradient(160deg,#fef3c7,#fed7aa);border:1px solid #fbbf24;border-radius:12px;padding:18px 20px;margin-bottom:16px">
<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#92400e;font-weight:800">Unrealized revenue</div>
<div style="font-size:40px;font-weight:800;color:#431407;letter-spacing:-.02em;line-height:1">$${fmt(audit.loss)}<span style="font-size:16px;color:#92400e">/yr</span></div>
<div style="font-size:12px;color:#78350f;margin-top:4px">${fmt(audit.active)} active patients · ${audit.lapsePct.toFixed(1)}% lapse rate for ${audit.specLabel}</div>
</div>
<table style="width:100%;border-collapse:collapse;font-size:14px;color:#4a4440;margin-bottom:20px" cellspacing="0" cellpadding="0">
<tr><td style="padding:8px 0;border-bottom:1px dashed #e7e2d8">Patients likely to lapse this year</td><td style="padding:8px 0;border-bottom:1px dashed #e7e2d8;text-align:right;font-weight:700;color:#1a1614">${fmt(audit.lapsed)}</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px dashed #e7e2d8">Recoverable at ${audit.recPct}% reactivation</td><td style="padding:8px 0;border-bottom:1px dashed #e7e2d8;text-align:right;font-weight:700;color:#1a1614">$${fmt(audit.recovered)}/yr</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px dashed #e7e2d8">Recommended plan</td><td style="padding:8px 0;border-bottom:1px dashed #e7e2d8;text-align:right;font-weight:700;color:#1a1614">${esc(audit.tier.label)}</td></tr>
<tr><td style="padding:8px 0">Net gain after tool cost</td><td style="padding:8px 0;text-align:right;font-weight:800;color:#0f766e">$${fmt(audit.net)}/yr</td></tr>
</table>
<div style="text-align:center;margin:24px 0 20px">
<a href="${signupLink}" style="display:inline-block;padding:14px 28px;background:#f97316;color:#fff;text-decoration:none;border-radius:999px;font-weight:800;letter-spacing:.01em">Start your 14-day free trial →</a>
</div>
<p style="font-size:13px;color:#78716c;line-height:1.55;margin:0 0 8px">No credit card. One-click cancel. Flat-fee pricing. HIPAA Business Associate Agreement signed automatically at checkout.</p>
<p style="font-size:13px;color:#78716c;line-height:1.55;margin:0">Questions? Just reply to this email — it goes to Colin, the founder, directly.</p>
<hr style="border:none;border-top:1px solid #e7e2d8;margin:24px 0 16px">
<p style="font-size:11px;color:#a8a29e;line-height:1.55;margin:0">US Dental Patient Recovery · Orlando, FL · colin@usdentalpatientrecovery.com<br>
Unsubscribe by replying STOP. Sent because you requested an audit at usdpr.netlify.app/recall-audit.html.</p>
</div></body></html>`;
}

function auditEmailText(capture, audit) {
  const practice = (capture.body && capture.body.practice) || "your practice";
  return `Your Recall Revenue Audit for ${practice}
-----------------------------------------------

Based on ${fmt(audit.active)} active patients and a ${audit.lapsePct.toFixed(1)}% lapse rate for ${audit.specLabel}:

  • Unrealized revenue:         $${fmt(audit.loss)}/yr
  • Patients lapsing this year: ${fmt(audit.lapsed)}
  • Recoverable (${audit.recPct}% rec):  $${fmt(audit.recovered)}/yr
  • Recommended plan:           ${audit.tier.label}
  • Net gain after tool cost:   $${fmt(audit.net)}/yr

Start your 14-day free trial (no card required):
https://usdpr.netlify.app/signup?tier=${audit.tier.tier}&utm_source=audit_email

Questions? Just reply — this goes to Colin, the founder, directly.

--
US Dental Patient Recovery · Orlando, FL · colin@usdentalpatientrecovery.com
Unsubscribe by replying STOP.
`;
}

async function sendAuditEmailToProspect(capture, audit) {
  const from = process.env.RESEND_FROM || "Colin at usdpr. <hello@usdentalpatientrecovery.com>";
  return resendSend({
    from, to: [capture.email],
    subject: `Your Recall Revenue Audit — ${fmt(audit.loss)} unrealized/yr at ${(capture.body && capture.body.practice) || "your practice"}`,
    html: auditEmailHTML(capture, audit),
    text: auditEmailText(capture, audit),
    reply_to: "colin@usdentalpatientrecovery.com",
    tags: [{ name: "kind", value: "audit_delivery" }, { name: "specialty", value: (capture.body && capture.body.specialty) || "gp" }],
  });
}

async function notifyOperator(capture, audit) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const from = process.env.RESEND_FROM || "usdpr captures <captures@usdentalpatientrecovery.com>";
  const to   = process.env.OPERATOR_EMAIL || "colin@usdentalpatientrecovery.com";
  const subj = `[${capture.kind}] ${capture.email || (capture.body && capture.body.practice) || "new"}` +
               (audit ? ` · $${fmt(audit.loss)}/yr loss` : "");
  const lines = [
    `Kind:     ${capture.kind}`,
    `When:     ${capture.ts}`,
    `Email:    ${capture.email || "(none)"}`,
    `Practice: ${(capture.body && capture.body.practice) || "(none)"}`,
    `Referrer: ${capture.ref || "(none)"}`,
  ];
  if (audit) {
    lines.push("");
    lines.push("Audit snapshot:");
    lines.push(`  loss        $${fmt(audit.loss)}/yr`);
    lines.push(`  recoverable $${fmt(audit.recovered)}/yr (@ ${audit.recPct}%)`);
    lines.push(`  tier        ${audit.tier.label}`);
    lines.push(`  net         $${fmt(audit.net)}/yr`);
  }
  lines.push("", "Full body:", JSON.stringify(capture.body, null, 2));
  return resendSend({
    from, to: [to], subject: subj, text: lines.join("\n"),
    tags: [{ name: "kind", value: capture.kind }],
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });

  let raw = "";
  try {
    if (typeof req.body === "object" && req.body !== null) {
      raw = JSON.stringify(req.body);
    } else if (typeof req.body === "string") {
      raw = req.body;
    } else if (req.readable) {
      raw = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (c) => { data += c.toString(); if (data.length > MAX_BODY) reject(new Error("too_large")); });
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });
    }
  } catch (e) { return res.status(413).json({ ok: false }); }
  if (raw.length > MAX_BODY) return res.status(413).json({ ok: false });

  let parsed = {};
  try { parsed = raw ? JSON.parse(raw) : {}; } catch (_) {}
  if (parsed.trap) return res.status(200).json({ ok: true });

  const headers = req.headers || {};
  const path = headers["x-forwarded-path"] || headers["x-matched-path"] || req.url || "";
  const kind = kindFor(path);

  const capture = {
    kind, path,
    ts: new Date().toISOString(),
    email:    typeof parsed.email === "string"    ? parsed.email.slice(0, 254)    : null,
    practice: typeof parsed.practice === "string" ? parsed.practice.slice(0, 200) : null,
    ua:       (headers["user-agent"] || "").slice(0, 300),
    ref:      (headers.referer || headers.referrer || "").slice(0, 500),
    ip:       (headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown",
    body:     redact(parsed),
  };

  let audit = null;
  if (kind === "audit_submit" && capture.email) {
    try { audit = computeAudit(capture.body || {}); } catch (e) { console.log("audit_compute_error", String(e)); }
  }

  console.log("CAPTURE", JSON.stringify(Object.assign({}, capture, { audit })));

  const tasks = [];
  if (kind === "audit_submit" && capture.email && audit) {
    tasks.push(sendAuditEmailToProspect(capture, audit).then((r) => console.log("AUDIT_EMAIL", JSON.stringify({ to: capture.email, result: r }))));
  }
  tasks.push(notifyOperator(capture, audit).then((r) => console.log("OPERATOR_NOTIFY", JSON.stringify({ result: r }))));

  const timeout = new Promise((resolve) => setTimeout(resolve, 5000));
  await Promise.race([Promise.all(tasks), timeout]);

  return res.status(200).json({ ok: true, kind });
};
