/* ═══════════════════════════════════════════════════════════════════════════
   lead-capture.js — single-file drop-in for marketing pages
   Provides two compounding lead-capture mechanisms:

     1. Exit-intent modal (desktop)   — fires when the cursor leaves the
                                        top of the viewport (visitor moving
                                        toward the browser chrome / tabs /
                                        address bar).
     2. Scroll-depth modal (mobile)   — fires on 65% scroll AND 20s dwell.
                                        Exit-intent doesn't exist on mobile
                                        so this is the equivalent signal.

   Session-dedupe via sessionStorage.  Permanent-dismiss via localStorage
   so a visitor who subscribes or dismisses explicitly is never bothered
   again across visits.

   Pure DOM — no innerHTML.  No external deps.  ~12KB.

   Drop into any page with:
       <script defer src="/lead-capture.js"></script>
   The script auto-boots after DOMContentLoaded.  Everything else (styles,
   markup) is injected safely.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  // ───── Config ─────────────────────────────────────────────────────────────
  const STORAGE = {
    dismissed:  'usdpr_lead_dismissed_v1',   // localStorage — permanent
    convertedE: 'usdpr_lead_converted_v1',   // localStorage — permanent
    seenInSession: 'usdpr_lead_seen_v1',     // sessionStorage — per-tab
  };

  const MOBILE_BREAKPOINT = 820;
  const SCROLL_THRESHOLD  = 0.65;
  const DWELL_SECONDS_MOBILE = 20;
  const DWELL_SECONDS_DESKTOP = 8;  // ignore exit-intent for first 8s

  // Plausible-friendly fire-helper (no-op if Plausible not loaded)
  const track = (name, props) => {
    try { if (window.plausible) window.plausible(name, props ? {props} : undefined); } catch(e){}
  };

  // ───── Guard against re-loading ──────────────────────────────────────────
  if (window.__usdprLeadBooted) return;
  window.__usdprLeadBooted = true;

  // ───── Early exits — don't ever show the modal here ──────────────────────
  function shouldSkip(){
    const path = location.pathname.replace(/\/+$/,'');
    const skip = [
      '/playbook', '/playbook.html',
      '/signup',
      '/terms', '/terms.html',
      '/privacy', '/privacy.html',
      '/thanks', '/thanks.html',
      '/cancel', '/cancel.html',
    ];
    if (skip.some(s => path === s || path.endsWith(s))) return true;
    if (location.search.indexOf('no_modal=1') !== -1) return true;

    // Don't bother already-subscribed visitors ever again
    try { if (localStorage.getItem(STORAGE.dismissed))  return true; } catch(e){}
    try { if (localStorage.getItem(STORAGE.convertedE)) return true; } catch(e){}

    // Only fire once per session
    try { if (sessionStorage.getItem(STORAGE.seenInSession)) return true; } catch(e){}

    // Don't pester bots/headless
    if (navigator.webdriver) return true;

    // Honor reduced-motion for the initial slide-in (we'll still show — just without animation)
    return false;
  }

  if (shouldSkip()) return;

  // ───── Styles — injected once ────────────────────────────────────────────
  const css = `
    .usdpr-lc-overlay{
      position:fixed;inset:0;z-index:9998;
      background:rgba(11,14,15,.48);
      backdrop-filter:saturate(140%) blur(4px);
      -webkit-backdrop-filter:saturate(140%) blur(4px);
      opacity:0;pointer-events:none;
      transition:opacity .28s cubic-bezier(.22,.8,.2,1);
    }
    .usdpr-lc-overlay.is-open{opacity:1;pointer-events:auto}

    .usdpr-lc-modal{
      position:fixed;left:50%;top:50%;transform:translate(-50%,-46%) scale(.97);
      z-index:9999;
      width:min(540px,calc(100vw - 32px));
      max-height:calc(100vh - 40px);overflow:auto;
      background:#f6f4ef;color:#0b0e0f;
      border-radius:18px;
      box-shadow:0 24px 64px rgba(11,14,15,.24),0 2px 8px rgba(11,14,15,.08);
      font-family:'Bricolage Grotesque','-apple-system',BlinkMacSystemFont,'Segoe UI',sans-serif;
      font-variation-settings:'opsz' 14,'wdth' 100,'wght' 400;
      opacity:0;pointer-events:none;
      transition:opacity .28s cubic-bezier(.22,.8,.2,1),transform .32s cubic-bezier(.2,.9,.1,1);
    }
    .usdpr-lc-modal.is-open{
      opacity:1;pointer-events:auto;
      transform:translate(-50%,-50%) scale(1);
    }
    @media(prefers-reduced-motion:reduce){
      .usdpr-lc-overlay,.usdpr-lc-modal{transition:none}
      .usdpr-lc-modal{transform:translate(-50%,-50%)}
    }

    .usdpr-lc-close{
      position:absolute;top:14px;right:14px;
      width:32px;height:32px;border-radius:50%;
      background:transparent;border:1px solid rgba(11,14,15,.14);
      cursor:pointer;color:#3a3d3f;
      display:inline-flex;align-items:center;justify-content:center;
      transition:background .18s,border-color .18s,color .18s;
    }
    .usdpr-lc-close:hover{background:#fff;border-color:#0b0e0f;color:#0b0e0f}
    .usdpr-lc-close svg{width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round}

    .usdpr-lc-top{
      padding:28px 32px 0;
    }
    .usdpr-lc-eye{
      display:inline-flex;align-items:center;gap:10px;
      font-size:11.5px;color:#f97316;
      font-variation-settings:'opsz' 12,'wdth' 100,'wght' 700;
      letter-spacing:.09em;text-transform:uppercase;
      margin-bottom:12px;
    }
    .usdpr-lc-eye::before{
      content:'';width:18px;height:1px;background:#f97316;
    }
    .usdpr-lc-h{
      font-size:clamp(24px,3.2vw,30px);line-height:1.1;color:#0b0e0f;
      font-variation-settings:'opsz' 48,'wdth' 92,'wght' 800;
      letter-spacing:-.034em;margin-bottom:10px;
      max-width:22ch;
    }
    .usdpr-lc-h .a{color:#f97316}
    .usdpr-lc-sub{
      font-size:14.5px;line-height:1.5;color:#3a3d3f;
      max-width:46ch;
      font-variation-settings:'opsz' 15,'wdth' 100,'wght' 400;
    }
    .usdpr-lc-sub strong{color:#0b0e0f;font-variation-settings:'opsz' 15,'wdth' 100,'wght' 700}

    .usdpr-lc-body{
      padding:18px 32px 20px;
    }
    .usdpr-lc-form{display:grid;gap:8px}
    .usdpr-lc-input{
      border:1.5px solid #e3ddd1;border-radius:10px;
      background:#fff;
      padding:13px 14px;
      font-size:15px;color:#0b0e0f;
      font-variation-settings:'opsz' 15,'wdth' 100,'wght' 500;
      letter-spacing:-.005em;font-family:inherit;
      outline:0;
      transition:border-color .18s,box-shadow .18s;
    }
    .usdpr-lc-input:focus{
      border-color:#0b0e0f;
      box-shadow:0 0 0 3px rgba(249,115,22,.18);
    }
    .usdpr-lc-input.err{border-color:#b45309;background:#fff7ed}

    .usdpr-lc-btn{
      display:inline-flex;align-items:center;justify-content:center;gap:8px;
      padding:13px 20px;border:0;cursor:pointer;
      background:#0b0e0f;color:#f6f4ef;
      border-radius:100px;
      font-size:15px;font-family:inherit;
      font-variation-settings:'opsz' 16,'wdth' 100,'wght' 700;
      letter-spacing:-.005em;
      transition:background .18s,transform .18s,box-shadow .18s;
      margin-top:4px;
    }
    .usdpr-lc-btn:hover{
      background:#f97316;color:#0b0e0f;
      transform:translateY(-1px);
      box-shadow:0 4px 14px rgba(249,115,22,.3);
    }
    .usdpr-lc-btn svg{width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round}

    .usdpr-lc-fine{
      margin-top:12px;
      font-size:11.5px;color:#6b6e70;line-height:1.5;
      display:flex;flex-wrap:wrap;gap:4px 16px;align-items:center;
      font-variation-settings:'opsz' 12,'wdth' 100,'wght' 500;
    }
    .usdpr-lc-chip{
      display:inline-flex;align-items:center;gap:5px;
      color:#3a3d3f;
    }
    .usdpr-lc-chip::before{
      content:'';width:4px;height:4px;border-radius:50%;background:#15803d;
    }
    .usdpr-lc-fine a{color:#6b6e70;text-decoration:underline;text-decoration-color:#d1c9b8;text-underline-offset:.18em}
    .usdpr-lc-fine a:hover{color:#0b0e0f}

    .usdpr-lc-alt{
      padding:14px 32px 22px;
      border-top:1px solid #eae4d6;
      background:linear-gradient(180deg,transparent 0%,#efece4 100%);
      font-size:12px;color:#6b6e70;text-align:center;
      border-radius:0 0 18px 18px;
      font-variation-settings:'opsz' 13,'wdth' 100,'wght' 500;
    }
    .usdpr-lc-alt a{color:#3a3d3f;text-decoration:underline;text-decoration-color:#d1c9b8;text-underline-offset:.18em}
    .usdpr-lc-alt a:hover{color:#0b0e0f}

    .usdpr-lc-ok{
      padding:28px 32px 24px;text-align:center;
    }
    .usdpr-lc-ok h3{
      font-size:24px;line-height:1.15;color:#0b0e0f;
      font-variation-settings:'opsz' 48,'wdth' 92,'wght' 800;
      letter-spacing:-.032em;margin-bottom:8px;
    }
    .usdpr-lc-ok p{
      font-size:14px;line-height:1.55;color:#3a3d3f;max-width:44ch;margin:0 auto 18px;
    }
    .usdpr-lc-ok .usdpr-lc-btn{margin-top:0}
  `;

  const style = document.createElement('style');
  style.setAttribute('data-usdpr-lead','');
  style.textContent = css;
  document.head.appendChild(style);

  // ───── DOM (safe creation — no innerHTML) ────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'usdpr-lc-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const modal = document.createElement('div');
  modal.className = 'usdpr-lc-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'usdpr-lc-h');
  modal.setAttribute('tabindex', '-1');

  // Close button
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'usdpr-lc-close';
  close.setAttribute('aria-label', 'Dismiss');
  const closeSvg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  closeSvg.setAttribute('viewBox','0 0 16 16');
  const closePath = document.createElementNS('http://www.w3.org/2000/svg','path');
  closePath.setAttribute('d','M4 4l8 8M12 4l-8 8');
  closeSvg.appendChild(closePath);
  close.appendChild(closeSvg);

  // Top block
  const top = document.createElement('div');
  top.className = 'usdpr-lc-top';

  const eye = document.createElement('div');
  eye.className = 'usdpr-lc-eye';
  eye.appendChild(document.createTextNode('Before you go \u2014 free field guide'));
  top.appendChild(eye);

  const h = document.createElement('h2');
  h.className = 'usdpr-lc-h';
  h.id = 'usdpr-lc-h';
  h.appendChild(document.createTextNode('The '));
  const hA = document.createElement('span'); hA.className = 'a';
  hA.appendChild(document.createTextNode('Dental Reactivation Playbook'));
  h.appendChild(hA);
  h.appendChild(document.createTextNode('.'));
  top.appendChild(h);

  const sub = document.createElement('p');
  sub.className = 'usdpr-lc-sub';
  sub.appendChild(document.createTextNode('48 pages. Real SMS + email sequences, the compliance guardrails, and the benchmarks we use daily. '));
  const subS = document.createElement('strong');
  subS.appendChild(document.createTextNode('Free.'));
  sub.appendChild(subS);
  sub.appendChild(document.createTextNode(' PDF in your inbox in under a minute.'));
  top.appendChild(sub);

  // Form
  const body = document.createElement('div');
  body.className = 'usdpr-lc-body';

  const form = document.createElement('form');
  form.className = 'usdpr-lc-form';
  form.noValidate = true;

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.className = 'usdpr-lc-input';
  emailInput.placeholder = 'you@yourpractice.com';
  emailInput.required = true;
  emailInput.autocomplete = 'email';
  emailInput.setAttribute('aria-label','Email');
  form.appendChild(emailInput);

  const practiceInput = document.createElement('input');
  practiceInput.type = 'text';
  practiceInput.className = 'usdpr-lc-input';
  practiceInput.placeholder = 'Practice name (optional)';
  practiceInput.autocomplete = 'organization';
  practiceInput.setAttribute('aria-label','Practice name');
  form.appendChild(practiceInput);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'usdpr-lc-btn';
  submit.appendChild(document.createTextNode('Send me the PDF'));
  const submitSvg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  submitSvg.setAttribute('viewBox','0 0 16 16');
  const submitPath = document.createElementNS('http://www.w3.org/2000/svg','path');
  submitPath.setAttribute('d','M3 8h10M9 4l4 4-4 4');
  submitSvg.appendChild(submitPath);
  submit.appendChild(submitSvg);
  form.appendChild(submit);

  body.appendChild(form);

  const fine = document.createElement('div');
  fine.className = 'usdpr-lc-fine';
  ['No list sharing, ever','One-click unsubscribe','HIPAA-safe'].forEach(txt=>{
    const chip = document.createElement('span');
    chip.className = 'usdpr-lc-chip';
    chip.appendChild(document.createTextNode(txt));
    fine.appendChild(chip);
  });
  body.appendChild(fine);

  // Alt link at bottom
  const alt = document.createElement('div');
  alt.className = 'usdpr-lc-alt';
  alt.appendChild(document.createTextNode('Or skip ahead: '));
  const altA = document.createElement('a');
  altA.href = '/signup?tier=practice_pro&utm_source=exit_intent&utm_medium=modal';
  altA.appendChild(document.createTextNode('start the 14-day free trial \u2192'));
  alt.appendChild(altA);

  // Success state
  const ok = document.createElement('div');
  ok.className = 'usdpr-lc-ok';
  ok.style.display = 'none';
  const okH = document.createElement('h3'); okH.appendChild(document.createTextNode('Check your inbox.'));
  const okP = document.createElement('p');  okP.appendChild(document.createTextNode('The PDF is on its way. If it doesn\u2019t arrive in 2\u20133 minutes, check spam or email colin@usdentalpatientrecovery.com.'));
  const okBtn = document.createElement('a');
  okBtn.href = '/signup?tier=practice_pro&utm_source=exit_intent&utm_medium=modal_success';
  okBtn.className = 'usdpr-lc-btn';
  okBtn.appendChild(document.createTextNode('While you\u2019re here \u2014 start the trial'));
  ok.appendChild(okH); ok.appendChild(okP); ok.appendChild(okBtn);

  // Assemble
  modal.appendChild(close);
  modal.appendChild(top);
  modal.appendChild(body);
  modal.appendChild(alt);
  modal.appendChild(ok);

  // Attach to body at DOMContentLoaded
  function attach(){
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, {once:true});
  } else {
    attach();
  }

  // ───── Open / close / focus management ───────────────────────────────────
  let lastFocus = null;
  let opened = false;

  function open(reason){
    if (opened) return;
    if (shouldSkip()) return;
    opened = true;
    try { sessionStorage.setItem(STORAGE.seenInSession, '1'); } catch(e){}

    lastFocus = document.activeElement;
    overlay.classList.add('is-open');
    modal.classList.add('is-open');

    // Focus the first input after a beat so the animation lands first
    setTimeout(()=>{ try{ emailInput.focus({preventScroll:true}); }catch(e){ emailInput.focus(); } }, 220);

    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', onDismiss);
    close.addEventListener('click', onDismiss);

    track('Exit modal shown', {reason: reason || 'unknown'});
  }

  function dismiss(why){
    if (!opened) return;
    overlay.classList.remove('is-open');
    modal.classList.remove('is-open');
    opened = false;
    try {
      // Hard-dismiss means don't show again this browser
      localStorage.setItem(STORAGE.dismissed, String(Date.now()));
    } catch(e){}
    document.removeEventListener('keydown', onKey);
    overlay.removeEventListener('click', onDismiss);
    close.removeEventListener('click', onDismiss);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    track('Exit modal dismissed', {reason: why || 'click'});
  }

  function onDismiss(ev){
    if (ev && ev.target !== overlay && ev.target !== close && !close.contains(ev.target)) return;
    dismiss('user');
  }
  function onKey(ev){
    if (ev.key === 'Escape') dismiss('escape');
    // Very lightweight focus-trap inside the modal
    if (ev.key === 'Tab' && opened) {
      const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length-1];
      if (ev.shiftKey && document.activeElement === first) { last.focus(); ev.preventDefault(); }
      else if (!ev.shiftKey && document.activeElement === last) { first.focus(); ev.preventDefault(); }
    }
  }

  // ───── Form submit ───────────────────────────────────────────────────────
  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const e = (emailInput.value || '').trim();
    const p = (practiceInput.value || '').trim();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      emailInput.classList.add('err');
      emailInput.focus();
      setTimeout(()=>emailInput.classList.remove('err'), 1400);
      return;
    }

    submit.disabled = true;
    submit.style.opacity = '.6';

    try{
      await fetch('/leads/playbook', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          email: e,
          practice: p,
          source: 'exit_intent',
          page: location.pathname,
          utm: Object.fromEntries(new URLSearchParams(location.search).entries()),
          referrer: document.referrer || '',
        }),
      });
    }catch(err){ /* swallow — UX still proceeds */ }

    try { localStorage.setItem(STORAGE.convertedE, e); } catch(err){}

    // Swap to success state
    top.style.display = 'none';
    body.style.display = 'none';
    alt.style.display = 'none';
    ok.style.display = '';

    track('Exit modal converted', {pageSource: location.pathname});
  });

  // ───── Triggers ──────────────────────────────────────────────────────────
  const pageLoadedAt = Date.now();
  const isMobile = matchMedia('(max-width:' + MOBILE_BREAKPOINT + 'px)').matches;

  if (isMobile) {
    // Mobile: 65% scroll-depth + 20s dwell
    let firedScroll = false;
    const onScroll = () => {
      if (firedScroll || opened) return;
      const sc = window.scrollY + window.innerHeight;
      const doc = document.documentElement.scrollHeight;
      if (sc / doc >= SCROLL_THRESHOLD && (Date.now() - pageLoadedAt) >= DWELL_SECONDS_MOBILE * 1000) {
        firedScroll = true;
        open('mobile_scroll');
      }
    };
    window.addEventListener('scroll', onScroll, {passive:true});
  } else {
    // Desktop: cursor leaves top of viewport moving up
    let firedExit = false;
    const onLeave = (ev) => {
      if (firedExit || opened) return;
      if ((Date.now() - pageLoadedAt) < DWELL_SECONDS_DESKTOP * 1000) return;
      if (!ev.relatedTarget && !ev.toElement && ev.clientY <= 2) {
        firedExit = true;
        open('desktop_exit');
      }
    };
    document.addEventListener('mouseout', onLeave);

    // Also fire on long-idle desktop (2 min no interaction)
    let idleTimer;
    const markActive = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(()=>{ if (!opened && !firedExit) { firedExit = true; open('desktop_idle'); } }, 120000);
    };
    ['mousemove','keydown','scroll','touchstart'].forEach(ev=>window.addEventListener(ev, markActive, {passive:true}));
    markActive();
  }
})();
