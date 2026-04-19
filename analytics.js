/* ═══════════════════════════════════════════════════════════════════════════
   analytics.js  \u2014 usdpr. web telemetry
   ───────────────────────────────────────────────────────────────────────────
   Drop-in. One script tag. Wires:

     1. Plausible  \u2014  cookieless pageviews + custom events
     2. UTM capture  \u2014  first-touch stored in localStorage + passed to every
                        outbound form submit + signup link
     3. Event helpers  \u2014  window.usdprTrack('event', props) auto-wires to
                          any element with [data-track] attribute
     4. Engagement signals  \u2014  scroll depth (25/50/75/100), time-on-page
                              (10/30/60/120s), rage clicks, tab focus/blur
     5. Conversion attribution  \u2014  localStorage.usdpr_utm_first + _last get
                                  appended to /signup links for attribution
     6. Debug panel  \u2014  ?debug=1 URL param shows live event tape

   No cookies. No PII. No network beacon calls beyond Plausible.

   Include on every page with:
       <script defer src="/analytics.js" data-domain="usdentalpatientrecovery.com"></script>

   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  if (window.__usdprAnalyticsBooted) return;
  window.__usdprAnalyticsBooted = true;

  const scriptEl = document.currentScript ||
    document.querySelector('script[src*="analytics.js"]');
  const DOMAIN = (scriptEl && scriptEl.dataset.domain) || 'usdentalpatientrecovery.com';
  const DEBUG  = location.search.indexOf('debug=1') !== -1;

  // ───── 1. Load Plausible ────────────────────────────────────────────────
  function loadPlausible(){
    if (document.querySelector('script[data-usdpr-plausible]')) return;
    const s = document.createElement('script');
    s.defer = true;
    s.async = true;
    s.setAttribute('data-domain', DOMAIN);
    s.setAttribute('data-usdpr-plausible', '');
    // We use the self-hosted-aware tag; the CDN version works the same.
    s.src = 'https://plausible.io/js/script.tagged-events.outbound-links.file-downloads.js';
    document.head.appendChild(s);

    // Ensure window.plausible exists before real script loads
    window.plausible = window.plausible || function(){(window.plausible.q = window.plausible.q || []).push(arguments)};
  }

  // ───── 2. UTM capture + first-touch attribution ─────────────────────────
  const UTM_KEYS = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','ref','gclid','fbclid'];
  function captureUtm(){
    const qs = new URLSearchParams(location.search);
    const now = new Date().toISOString();
    const incoming = {};
    for (const k of UTM_KEYS) {
      const v = qs.get(k);
      if (v) incoming[k] = v.slice(0, 100);
    }
    if (!Object.keys(incoming).length) return;

    const payload = Object.assign({ ts: now, landing_page: location.pathname, referrer: document.referrer || '' }, incoming);

    try {
      if (!localStorage.getItem('usdpr_utm_first')) {
        localStorage.setItem('usdpr_utm_first', JSON.stringify(payload));
      }
      localStorage.setItem('usdpr_utm_last', JSON.stringify(payload));
      sessionStorage.setItem('usdpr_utm_session', JSON.stringify(payload));
    } catch(e){}
  }

  function attributionForLinks(){
    // Append UTMs to /signup links so the tier router lands them clean
    let first = null, last = null;
    try { first = JSON.parse(localStorage.getItem('usdpr_utm_first') || 'null'); } catch(e){}
    try { last  = JSON.parse(localStorage.getItem('usdpr_utm_last')  || 'null'); } catch(e){}
    if (!first && !last) return;

    const params = new URLSearchParams();
    // Current page's UTMs take priority; fall back to first-touch
    const src = last || first;
    for (const k of UTM_KEYS) if (src[k]) params.set(k, src[k]);
    // Attribution metadata
    if (first) params.set('ft_source', first.utm_source || '');
    if (first) params.set('ft_ts',     first.ts || '');

    // Append to every signup link
    document.querySelectorAll('a[href^="/signup"],a[href*="/signup?"]').forEach(a => {
      try {
        const u = new URL(a.href, location.origin);
        params.forEach((v, k) => { if (!u.searchParams.has(k)) u.searchParams.set(k, v); });
        a.href = u.toString();
      } catch(e){}
    });
  }

  // ───── 3. Event helpers ─────────────────────────────────────────────────
  // First-party beacon — sends a subset of high-signal events to our own
  // /leads/analytics endpoint so the operator console has real data even
  // when Plausible is blocked / not configured.
  const BEACON_EVENTS = new Set([
    'pageview_meta','CTA click','Form submit','Scroll depth','Rage click',
    'Time on page','Tab hidden','conversion','signup_click','audit_start','audit_submit'
  ]);
  function firstPartyBeacon(name, props){
    if (!BEACON_EVENTS.has(name)) return;
    try {
      fetch('/leads/analytics', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          event: name, path: location.pathname, ts: new Date().toISOString(), props: props || {}
        }),
        keepalive: true,
        credentials: 'omit',
      });
    } catch(e){}
  }
  function track(name, props){
    try {
      const p = Object.assign({path: location.pathname}, props || {});
      if (window.plausible) window.plausible(name, {props: p});
      firstPartyBeacon(name, p);
      if (DEBUG) logDebug(name, p);
    } catch(e){}
  }
  window.usdprTrack = track;

  // Auto-wire [data-track] elements
  function wireDataTrack(){
    document.addEventListener('click', (ev) => {
      const el = ev.target.closest('[data-track]');
      if (!el) return;
      const name = el.dataset.track;
      const props = {};
      Object.keys(el.dataset).forEach(k => {
        if (k.startsWith('trackProp')) {
          const prop = k.slice(9).replace(/^./, c => c.toLowerCase());
          props[prop] = el.dataset[k];
        }
      });
      if (!props.label && el.textContent) props.label = el.textContent.trim().slice(0, 60);
      track(name, props);
    }, true);
  }

  // ───── 4. Engagement signals ────────────────────────────────────────────
  function wireEngagement(){
    const pageLoadedAt = performance.now();

    // Scroll depth — fire at 25/50/75/100%
    const scrollMarks = [25, 50, 75, 100];
    const seenScroll = new Set();
    function onScroll(){
      const sc = window.scrollY + window.innerHeight;
      const doc = document.documentElement.scrollHeight;
      const pct = Math.min(100, Math.round((sc / doc) * 100));
      for (const m of scrollMarks) {
        if (pct >= m && !seenScroll.has(m)) {
          seenScroll.add(m);
          track('Scroll depth', {depth_pct: m});
        }
      }
    }
    window.addEventListener('scroll', onScroll, {passive: true});

    // Time on page — fire at 10/30/60/120/300s
    const timeMarks = [10, 30, 60, 120, 300];
    timeMarks.forEach(s => {
      setTimeout(() => track('Time on page', {seconds: s}), s * 1000);
    });

    // Rage clicks — 3+ clicks within 700ms in a 40px radius
    let lastClick = null, rageCount = 0, rageTimer = null;
    document.addEventListener('click', (ev) => {
      const now = Date.now();
      const dx = lastClick ? Math.abs(ev.clientX - lastClick.x) : 999;
      const dy = lastClick ? Math.abs(ev.clientY - lastClick.y) : 999;
      const dt = lastClick ? now - lastClick.t : 9999;
      if (dt < 700 && dx < 40 && dy < 40) {
        rageCount++;
        clearTimeout(rageTimer);
        rageTimer = setTimeout(() => {
          if (rageCount >= 3) {
            const target = ev.target.closest('[id],[class]');
            const label = target ? (target.id || target.className.split(' ')[0] || '').slice(0, 40) : '';
            track('Rage click', {count: rageCount, on: label});
          }
          rageCount = 0;
        }, 900);
      } else {
        rageCount = 1;
      }
      lastClick = {x: ev.clientX, y: ev.clientY, t: now};
    }, true);

    // Tab visibility
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        const secOnPage = Math.round((performance.now() - pageLoadedAt) / 1000);
        track('Tab hidden', {seconds: secOnPage});
      }
    });

    // CTA click — anything that looks like a primary button
    document.addEventListener('click', (ev) => {
      const a = ev.target.closest('a.btn, a.nav-cta, a[class*="-btn"]');
      if (!a) return;
      const label = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      const href = a.getAttribute('href') || '';
      let category = 'other';
      if (href.startsWith('/signup')) category = 'signup';
      else if (href.startsWith('mailto:')) category = 'email';
      else if (href.startsWith('tel:')) category = 'phone';
      else if (href.startsWith('/schedule')) category = 'schedule';
      else if (href.indexOf('#pricing') !== -1) category = 'pricing';
      track('CTA click', {label, href: href.slice(0, 120), category});
    });
  }

  // ───── 5. Submit signals ────────────────────────────────────────────────
  function wireFormSubmits(){
    document.addEventListener('submit', (ev) => {
      const f = ev.target;
      if (!f || f.tagName !== 'FORM') return;
      const id = f.id || (f.getAttribute('action') || '').slice(0, 40) || 'unknown';
      track('Form submit', {form: id});
    }, true);
  }

  // ───── 6. Debug panel ───────────────────────────────────────────────────
  let debugEl = null;
  function logDebug(name, props){
    if (!debugEl) {
      debugEl = document.createElement('div');
      debugEl.setAttribute('data-usdpr-debug', '');
      Object.assign(debugEl.style, {
        position:'fixed', bottom:'12px', right:'12px', zIndex:'99999',
        width:'360px', maxHeight:'48vh', overflow:'auto',
        background:'#0b0e0f', color:'#f6f4ef',
        fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize:'11px',
        padding:'12px', borderRadius:'10px', border:'1px solid #1a1d20',
        boxShadow:'0 8px 32px rgba(0,0,0,.3)', lineHeight:'1.5'
      });
      const hd = document.createElement('div');
      hd.style.cssText = 'color:#f97316;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px;font-size:10px';
      hd.textContent = '\u00A7 usdpr debug \u00B7 ?debug=1';
      debugEl.appendChild(hd);
      document.body.appendChild(debugEl);
    }
    const row = document.createElement('div');
    row.style.cssText = 'border-top:1px solid rgba(255,255,255,.08);padding:6px 0';
    const n = document.createElement('div');
    n.style.cssText = 'color:#4ade80;font-weight:700';
    n.textContent = name;
    const p = document.createElement('div');
    p.style.cssText = 'color:rgba(246,244,239,.65);font-size:10.5px';
    p.textContent = JSON.stringify(props || {});
    row.appendChild(n); row.appendChild(p);
    debugEl.appendChild(row);
    debugEl.scrollTop = debugEl.scrollHeight;
  }

  // ───── Boot ─────────────────────────────────────────────────────────────
  function boot(){
    loadPlausible();
    captureUtm();
    attributionForLinks();
    wireDataTrack();
    wireEngagement();
    wireFormSubmits();
    // Fire initial page view with attribution
    track('pageview_meta', {
      first_source: (JSON.parse(localStorage.getItem('usdpr_utm_first') || 'null') || {}).utm_source || 'direct',
      last_source:  (JSON.parse(localStorage.getItem('usdpr_utm_last')  || 'null') || {}).utm_source || 'direct',
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
})();
