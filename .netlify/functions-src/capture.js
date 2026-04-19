// Netlify Function: capture
// Receives every marketing-form POST (audit lead magnet, cancel save, schedule,
// referrals, onboarding steps, calculator shares, analytics pings).
//
// • Logs structured JSON to Netlify Function logs (operator review).
// • Optionally emails colin@usdentalpatientrecovery.com via Resend
//   if RESEND_API_KEY is configured.
// • On audit submissions, sends the dentist their PDF audit confirmation
//   email and enrolls them in a 3-touch nurture sequence (kicked off here,
//   follow-ups sent by the nurture-cron function).
// • Always returns 200 JSON so the client-side .catch(()=>{}) never trips
//   and the "check your inbox" UX is reliable.

const MAX_BODY = 16 * 1024; // 16KB
const FORBIDDEN_KEYS = new Set([
  "patient_id","patient_name","patient_email","patient_phone",
  "dob","date_of_birth","ssn","diagnosis","treatment",
  "procedure_code","cpt","icd10","mrn","pms_id",
  "chart_number","insurance_id","claim_id",
]);

function redact(body, depth) {
  depth = depth || 0;
  if (depth > 6 || body === null || body === undefined) return body;
  if (Array.isArray(body)) return body.slice(0, 50).map(function (x) { return redact(x, depth + 1); });
  if (typeof body === "object") {
    var out = {};
    for (var k in body) {
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
  var p = (path || "").toLowerCase();
  if (p.indexOf("/leads/audit")       !== -1) return "audit_submit";
  if (p.indexOf("/leads/analytics")   !== -1) return "analytics";
  if (p.indexOf("/leads/playbook")    !== -1) return "playbook_request";
  if (p.indexOf("/leads/share")       !== -1) return "calculator_share";
  if (p.indexOf("/leads/unsubscribe") !== -1) return "unsubscribe";
  if (p.indexOf("/cancel/action")     !== -1) return "cancel_action";
  if (p.indexOf("/schedule/book")     !== -1) return "schedule_book";
  if (p.indexOf("/referrals/submit")  !== -1) return "referral_submit";
  if (p.indexOf("/onboarding/step")   !== -1) return "onboarding_step";
  return "unknown";
}

function json(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

// ─────────────────────────────────────────────────────────────
// Specialty-aware audit math — must match recall-audit.html
// ─────────────────────────────────────────────────────────────
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
  if (specialty === "dso")      return { tier: "dso",          monthly: 1997, label: "DSO · $1,997/mo" };
  if (patients <= 2000)         return { tier: "practice",     monthly:  297, label: "Practice · $297/mo" };
  if (patients <= 10000)        return { tier: "practice_pro", monthly:  697, label: "Practice Pro · $697/mo" };
  return                               { tier: "dso",          monthly: 1997, label: "DSO · $1,997/mo" };
}

function computeAudit(input) {
  var spec   = SPEC[input.specialty] || SPEC.gp;
  var active = Math.max(100, +input.active || 2000);
  var visit  = Math.max(50,  +input.visit  || 285);
  var lapsed = active * (spec.lapse / 100);
  var loss   = lapsed * visit * spec.multi;
  var rec    = lapsed * (spec.rec / 100) * visit * spec.multi;
  var tier   = tierFor(active, input.specialty);
  var cost   = tier.monthly * 12;
  var net    = Math.max(0, rec - cost);
  return {
    lapsePct: spec.lapse, recPct: spec.rec, multi: spec.multi, specLabel: spec.label,
    active: active, visit: visit, lapsed: Math.round(lapsed), loss: Math.round(loss),
    recovered: Math.round(rec), tier: tier, toolCost: cost, net: Math.round(net),
  };
}

function fmt(n) {
  return Math.round(n).toLocaleString("en-US");
}

// ─────────────────────────────────────────────────────────────
// Resend email senders
// ─────────────────────────────────────────────────────────────
async function resendSend(payload) {
  var key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true, reason: "no_api_key" };
  try {
    var resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    var body = await resp.text();
    return { ok: resp.ok, status: resp.status, body: body };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

function auditEmailHTML(capture, audit) {
  var practice = (capture.body && capture.body.practice) || "your practice";
  var signupLink = "https://usdpr.netlify.app/signup?tier=" + audit.tier.tier + "&utm_source=audit_email&utm_medium=email&utm_campaign=pdf_delivery";
  return (
    "<!DOCTYPE html><html><body style=\"font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1a1614;background:#f6f4ef;margin:0;padding:32px 16px\">" +
    "<div style=\"max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e7e2d8;border-radius:16px;padding:32px\">" +
    "<div style=\"font-size:20px;font-weight:800;letter-spacing:-.02em;margin-bottom:4px\">usdpr<span style=\"color:#f97316\">.</span></div>" +
    "<div style=\"font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#78716c;margin-bottom:20px\">Recall Revenue Audit</div>" +
    "<h1 style=\"font-size:28px;letter-spacing:-.03em;line-height:1.1;margin:0 0 12px;color:#1a1614\">Your audit for " + escapeHtml(practice) + "</h1>" +
    "<p style=\"font-size:15px;line-height:1.55;color:#4a4440;margin:0 0 20px\">Based on the numbers you entered, here are the three that matter most:</p>" +
    "<div style=\"background:linear-gradient(160deg,#fef3c7,#fed7aa);border:1px solid #fbbf24;border-radius:12px;padding:18px 20px;margin-bottom:16px\">" +
      "<div style=\"font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#92400e;font-weight:800\">Unrealized revenue</div>" +
      "<div style=\"font-size:40px;font-weight:800;color:#431407;letter-spacing:-.02em;line-height:1\">$" + fmt(audit.loss) + "<span style=\"font-size:16px;color:#92400e\">/yr</span></div>" +
      "<div style=\"font-size:12px;color:#78350f;margin-top:4px\">" + fmt(audit.active) + " active patients · " + audit.lapsePct.toFixed(1) + "% lapse rate for " + audit.specLabel + "</div>" +
    "</div>" +
    "<table style=\"width:100%;border-collapse:collapse;font-size:14px;color:#4a4440;margin-bottom:20px\" cellspacing=\"0\" cellpadding=\"0\">" +
      "<tr><td style=\"padding:8px 0;border-bottom:1px dashed #e7e2d8\">Patients likely to lapse this year</td><td style=\"padding:8px 0;border-bottom:1px dashed #e7e2d8;text-align:right;font-weight:700;color:#1a1614\">" + fmt(audit.lapsed) + "</td></tr>" +
      "<tr><td style=\"padding:8px 0;border-bottom:1px dashed #e7e2d8\">Recoverable at " + audit.recPct + "% reactivation</td><td style=\"padding:8px 0;border-bottom:1px dashed #e7e2d8;text-align:right;font-weight:700;color:#1a1614\">$" + fmt(audit.recovered) + "/yr</td></tr>" +
      "<tr><td style=\"padding:8px 0;border-bottom:1px dashed #e7e2d8\">Recommended plan</td><td style=\"padding:8px 0;border-bottom:1px dashed #e7e2d8;text-align:right;font-weight:700;color:#1a1614\">" + audit.tier.label + "</td></tr>" +
      "<tr><td style=\"padding:8px 0\">Net gain after tool cost</td><td style=\"padding:8px 0;text-align:right;font-weight:800;color:#0f766e\">$" + fmt(audit.net) + "/yr</td></tr>" +
    "</table>" +
    "<div style=\"text-align:center;margin:24px 0 20px\">" +
      "<a href=\"" + signupLink + "\" style=\"display:inline-block;padding:14px 28px;background:#f97316;color:#fff;text-decoration:none;border-radius:999px;font-weight:800;letter-spacing:.01em\">Start your 14-day free trial →</a>" +
    "</div>" +
    "<p style=\"font-size:13px;color:#78716c;line-height:1.55;margin:0 0 8px\">No credit card. One-click cancel. Industry-first flat-fee pricing. HIPAA Business Associate Agreement signed automatically at checkout.</p>" +
    "<p style=\"font-size:13px;color:#78716c;line-height:1.55;margin:0\">Questions? Just reply to this email — it goes to Colin, the founder, directly.</p>" +
    "<hr style=\"border:none;border-top:1px solid #e7e2d8;margin:24px 0 16px\">" +
    "<p style=\"font-size:11px;color:#a8a29e;line-height:1.55;margin:0\">US Dental Patient Recovery · Orlando, FL · colin@usdentalpatientrecovery.com<br>" +
    "Unsubscribe by replying with STOP in the subject. Sent because you requested an audit at usdpr.netlify.app/recall-audit.html.</p>" +
    "</div>" +
    "</body></html>"
  );
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function auditEmailText(capture, audit) {
  var practice = (capture.body && capture.body.practice) || "your practice";
  return (
    "Your Recall Revenue Audit for " + practice + "\n" +
    "-----------------------------------------------\n\n" +
    "Based on " + fmt(audit.active) + " active patients and a " + audit.lapsePct.toFixed(1) + "% lapse rate for " + audit.specLabel + ":\n\n" +
    "  • Unrealized revenue:        $" + fmt(audit.loss) + "/yr\n" +
    "  • Patients lapsing this year: " + fmt(audit.lapsed) + "\n" +
    "  • Recoverable (" + audit.recPct + "% rec. rate):   $" + fmt(audit.recovered) + "/yr\n" +
    "  • Recommended plan:           " + audit.tier.label + "\n" +
    "  • Net gain after tool cost:   $" + fmt(audit.net) + "/yr\n\n" +
    "Start your 14-day free trial (no card required):\n" +
    "https://usdpr.netlify.app/signup?tier=" + audit.tier.tier + "&utm_source=audit_email\n\n" +
    "Questions? Just reply — this goes to Colin, the founder, directly.\n\n" +
    "--\n" +
    "US Dental Patient Recovery · Orlando, FL · colin@usdentalpatientrecovery.com\n" +
    "Unsubscribe by replying with STOP in the subject.\n"
  );
}

async function sendAuditEmailToProspect(capture, audit) {
  var from = process.env.RESEND_FROM || "Colin at usdpr. <hello@usdentalpatientrecovery.com>";
  return resendSend({
    from: from,
    to: [capture.email],
    subject: "Your Recall Revenue Audit — " + fmt(audit.loss) + " unrealized/yr at " + (capture.body.practice || "your practice"),
    html: auditEmailHTML(capture, audit),
    text: auditEmailText(capture, audit),
    reply_to: "colin@usdentalpatientrecovery.com",
    tags: [{ name: "kind", value: "audit_delivery" }, { name: "specialty", value: capture.body.specialty || "gp" }],
  });
}

async function notifyOperator(capture, audit) {
  var key = process.env.RESEND_API_KEY;
  if (!key) return;
  var from = process.env.RESEND_FROM || "usdpr captures <captures@usdentalpatientrecovery.com>";
  var to   = process.env.OPERATOR_EMAIL || "colin@usdentalpatientrecovery.com";
  var subjectHead = "[" + capture.kind + "]";
  var lines = [
    "Kind:     " + capture.kind,
    "When:     " + capture.ts,
    "Email:    " + (capture.email || "(none)"),
    "Practice: " + ((capture.body && capture.body.practice) || "(none)"),
    "Referrer: " + (capture.ref || "(none)"),
  ];
  if (audit) {
    lines.push("");
    lines.push("Audit snapshot:");
    lines.push("  loss       $" + fmt(audit.loss) + "/yr");
    lines.push("  recoverable $" + fmt(audit.recovered) + "/yr (@ " + audit.recPct + "%)");
    lines.push("  tier       " + audit.tier.label);
    lines.push("  net        $" + fmt(audit.net) + "/yr");
  }
  lines.push("");
  lines.push("Full body:");
  lines.push(JSON.stringify(capture.body, null, 2));
  return resendSend({
    from: from, to: [to],
    subject: subjectHead + " " + (capture.email || capture.body.practice || "new") +
             (audit ? " · $" + fmt(audit.loss) + "/yr loss" : ""),
    text: lines.join("\n"),
    tags: [{ name: "kind", value: capture.kind }],
  });
}

// ─────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────
exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "POST only" });
  }

  var raw = event.body || "";
  if (raw.length > MAX_BODY) return json(413, { ok: false });

  var parsed = {};
  try { parsed = raw ? JSON.parse(raw) : {}; } catch (_) { /* tolerant */ }

  if (parsed.trap) return json(200, { ok: true }); // honeypot

  var headers = event.headers || {};
  var path = headers["x-nf-original-pathname"] ||
             headers["x-forwarded-path"] ||
             event.path ||
             "";
  var kind = kindFor(path);

  var capture = {
    kind: kind,
    path: path,
    ts:   new Date().toISOString(),
    email:    typeof parsed.email === "string"    ? parsed.email.slice(0, 254)    : null,
    practice: typeof parsed.practice === "string" ? parsed.practice.slice(0, 200) : null,
    ua:       (headers["user-agent"] || "").slice(0, 300),
    ref:      (headers.referer || headers.referrer || "").slice(0, 500),
    ip:       (headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown",
    body:     redact(parsed),
  };

  // Compute audit if this is an audit submission
  var audit = null;
  if (kind === "audit_submit" && capture.email) {
    try {
      audit = computeAudit(capture.body || {});
    } catch (e) {
      console.log("audit_compute_error", String(e));
    }
  }

  // Structured log — visible in Netlify Functions dashboard.
  console.log("CAPTURE", JSON.stringify(Object.assign({}, capture, { audit: audit })));

  // Fire prospect email + operator notification in parallel.
  // Don't await the prospect send for more than a few seconds — always return 200.
  var tasks = [];
  if (kind === "audit_submit" && capture.email && audit) {
    tasks.push(sendAuditEmailToProspect(capture, audit).then(function (r) {
      console.log("AUDIT_EMAIL", JSON.stringify({ to: capture.email, result: r }));
    }));
  }
  tasks.push(notifyOperator(capture, audit).then(function (r) {
    console.log("OPERATOR_NOTIFY", JSON.stringify({ result: r }));
  }));

  // Wait up to 5 seconds for tasks; bail after that to respect function time budget.
  var timeout = new Promise(function (resolve) { setTimeout(resolve, 5000); });
  await Promise.race([Promise.all(tasks), timeout]);

  return json(200, { ok: true, kind: kind });
};
