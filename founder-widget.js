/* ═══════════════════════════════════════════════════════════════════════════
   founder-widget.js  \u2014 persistent "Talk to Colin" floating CTA
   ───────────────────────────────────────────────────────────────────────────
   Appears on every page after 4 seconds of dwell. Opens a bottom-sheet with
   three conversation options:

     1. Email Colin (pre-filled with current page + question prompt)
     2. Schedule a 15-min call (same-day slots)
     3. Text Colin's cell (SMS link)

   No external dependencies. Safe DOM. Session-dedupe. Hide button
   after open + convert events. Mobile-friendly.

   Drop in with:
       <script defer src="/founder-widget.js"></script>
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  if (window.__usdprFounderBooted) return;
  window.__usdprFounderBooted = true;

  // ───── Skip paths ───────────────────────────────────────────────────────
  const SKIP = ['/signup','/cancel','/welcome','/schedule'];
  if (SKIP.some(p => location.pathname === p || location.pathname.startsWith(p))) return;
  if (location.search.indexOf('no_widget=1') !== -1) return;

  // ───── Tracking helper (uses window.usdprTrack from analytics.js) ────────
  const track = (n, p) => { try { if (window.usdprTrack) window.usdprTrack(n, p); } catch(e){} };

  // ───── CSS ──────────────────────────────────────────────────────────────
  const css = `
    .fw-btn{
      position:fixed;z-index:9990;bottom:22px;right:22px;
      display:inline-flex;align-items:center;gap:10px;
      padding:12px 18px 12px 12px;
      background:#0b0e0f;color:#f6f4ef;border-radius:100px;
      box-shadow:0 10px 28px rgba(11,14,15,.22),0 2px 6px rgba(11,14,15,.12);
      font-family:'Bricolage Grotesque','-apple-system',BlinkMacSystemFont,sans-serif;
      font-size:13.5px;
      font-variation-settings:'opsz' 14,'wdth' 100,'wght' 700;
      letter-spacing:-.005em;
      text-decoration:none;cursor:pointer;border:0;
      transform:translateY(18px);opacity:0;
      transition:transform .32s cubic-bezier(.22,.8,.2,1),
                 opacity .32s cubic-bezier(.22,.8,.2,1),
                 box-shadow .22s cubic-bezier(.22,.8,.2,1);
    }
    .fw-btn:hover{box-shadow:0 14px 34px rgba(11,14,15,.3),0 4px 8px rgba(11,14,15,.16);transform:translateY(-2px)}
    .fw-btn.on{transform:translateY(0);opacity:1}
    .fw-btn.hidden{transform:translateY(30px);opacity:0;pointer-events:none}
    .fw-btn-av{
      width:32px;height:32px;border-radius:50%;flex:none;
      background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);
      color:#0b0e0f;font-size:13px;
      font-variation-settings:'opsz' 14,'wdth' 88,'wght' 800;
      letter-spacing:-.015em;
      display:inline-flex;align-items:center;justify-content:center;
      position:relative;
    }
    .fw-btn-av::after{
      content:'';position:absolute;top:-2px;right:-2px;
      width:9px;height:9px;border-radius:50%;
      background:#4ade80;border:2px solid #0b0e0f;
    }
    .fw-btn-sub{
      font-size:10px;color:rgba(246,244,239,.55);
      letter-spacing:.06em;text-transform:uppercase;
      font-variation-settings:'opsz' 11,'wdth' 100,'wght' 600;
      display:block;margin-top:-1px;
    }
    @media(max-width:520px){
      .fw-btn{padding:10px 14px 10px 10px;font-size:13px;bottom:14px;right:14px;left:auto}
      .fw-btn-av{width:28px;height:28px;font-size:12px}
    }

    .fw-sheet-bg{
      position:fixed;inset:0;z-index:9994;
      background:rgba(11,14,15,.5);
      backdrop-filter:saturate(140%) blur(4px);
      -webkit-backdrop-filter:saturate(140%) blur(4px);
      opacity:0;pointer-events:none;
      transition:opacity .24s cubic-bezier(.22,.8,.2,1);
    }
    .fw-sheet-bg.on{opacity:1;pointer-events:auto}

    .fw-sheet{
      position:fixed;z-index:9995;
      bottom:0;left:0;right:0;
      background:#f6f4ef;color:#0b0e0f;
      border-radius:22px 22px 0 0;
      padding:22px 22px 26px;
      box-shadow:0 -24px 64px rgba(11,14,15,.18);
      max-height:88vh;overflow:auto;
      transform:translateY(100%);
      transition:transform .32s cubic-bezier(.22,.9,.1,1);
      font-family:'Bricolage Grotesque','-apple-system',BlinkMacSystemFont,sans-serif;
    }
    .fw-sheet.on{transform:translateY(0)}
    @media(min-width:720px){
      .fw-sheet{
        left:auto;right:22px;bottom:22px;width:420px;
        border-radius:18px;
      }
    }

    .fw-sheet-hd{
      display:flex;align-items:center;gap:14px;
      padding-bottom:16px;margin-bottom:16px;
      border-bottom:1px solid #e3ddd1;
    }
    .fw-sheet-av{
      width:44px;height:44px;border-radius:50%;flex:none;
      background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);
      color:#0b0e0f;font-size:17px;
      font-variation-settings:'opsz' 18,'wdth' 88,'wght' 800;
      letter-spacing:-.018em;
      display:inline-flex;align-items:center;justify-content:center;
      position:relative;
    }
    .fw-sheet-av::after{
      content:'';position:absolute;top:-1px;right:-1px;
      width:11px;height:11px;border-radius:50%;
      background:#4ade80;border:2.5px solid #f6f4ef;
    }
    .fw-sheet-who{flex:1}
    .fw-sheet-name{
      font-size:14.5px;color:#0b0e0f;line-height:1.25;
      font-variation-settings:'opsz' 15,'wdth' 100,'wght' 700;
      letter-spacing:-.01em;
    }
    .fw-sheet-meta{
      font-size:11px;color:#6b6e70;
      font-variation-settings:'opsz' 12,'wdth' 100,'wght' 600;
      letter-spacing:.06em;text-transform:uppercase;margin-top:2px;
      display:flex;align-items:center;gap:6px;
    }
    .fw-sheet-meta::before{
      content:'';width:6px;height:6px;border-radius:50%;
      background:#15803d;box-shadow:0 0 0 2px rgba(21,128,61,.22);
    }
    .fw-sheet-close{
      width:32px;height:32px;border-radius:50%;
      background:transparent;border:1px solid #d1c9b8;cursor:pointer;
      color:#3a3d3f;display:inline-flex;align-items:center;justify-content:center;
      transition:background .16s,border-color .16s,color .16s;
      flex:none;
    }
    .fw-sheet-close:hover{background:#fff;border-color:#0b0e0f;color:#0b0e0f}
    .fw-sheet-close svg{width:12px;height:12px;stroke:currentColor;stroke-width:2.2;fill:none;stroke-linecap:round}

    .fw-sheet-lede{
      font-size:14px;color:#3a3d3f;line-height:1.55;
      margin-bottom:16px;
      font-variation-settings:'opsz' 14,'wdth' 100,'wght' 500;
    }
    .fw-sheet-lede strong{color:#0b0e0f;font-variation-settings:'opsz' 14,'wdth' 100,'wght' 700}

    .fw-opts{display:grid;gap:8px}
    .fw-opt{
      display:grid;grid-template-columns:40px 1fr auto;gap:14px;
      padding:14px 16px;border-radius:12px;
      background:#fff;border:1.5px solid #e3ddd1;
      text-decoration:none;color:#0b0e0f;
      transition:border-color .18s,transform .18s,box-shadow .18s;
      align-items:center;
    }
    .fw-opt:hover{border-color:#0b0e0f;transform:translateY(-1px);box-shadow:0 4px 14px rgba(11,14,15,.06)}
    .fw-opt-ic{
      width:40px;height:40px;border-radius:10px;
      background:#fff3e7;color:#f97316;
      display:inline-flex;align-items:center;justify-content:center;
    }
    .fw-opt-ic svg{width:18px;height:18px;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round;stroke-linejoin:round}
    .fw-opt-t{
      font-size:14.5px;color:#0b0e0f;line-height:1.25;
      font-variation-settings:'opsz' 15,'wdth' 100,'wght' 700;
      letter-spacing:-.015em;
    }
    .fw-opt-b{
      font-size:12px;color:#6b6e70;margin-top:2px;
      font-variation-settings:'opsz' 12,'wdth' 100,'wght' 500;line-height:1.4;
    }
    .fw-opt-arr{color:#9a9c9d;font-size:14px;line-height:1}
    .fw-opt:hover .fw-opt-arr{color:#f97316}

    .fw-sheet-foot{
      margin-top:14px;padding-top:14px;
      border-top:1px dashed #d1c9b8;
      font-size:11.5px;color:#6b6e70;line-height:1.55;text-align:center;
      font-variation-settings:'opsz' 12,'wdth' 100,'wght' 500;
    }
    .fw-sheet-foot strong{color:#0b0e0f;font-variation-settings:'opsz' 12,'wdth' 100,'wght' 700}
  `;

  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-usdpr-fw', '');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ───── Safe DOM creation ────────────────────────────────────────────────
  // Trigger button
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fw-btn';
  btn.setAttribute('aria-label', 'Talk to Colin, the founder');

  const avatar = document.createElement('span');
  avatar.className = 'fw-btn-av';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.appendChild(document.createTextNode('CS'));
  btn.appendChild(avatar);

  const labelWrap = document.createElement('span');
  labelWrap.style.display = 'flex';
  labelWrap.style.flexDirection = 'column';
  labelWrap.style.alignItems = 'flex-start';
  const subLabel = document.createElement('span');
  subLabel.className = 'fw-btn-sub';
  subLabel.appendChild(document.createTextNode('Online \u2014 replies today'));
  const mainLabel = document.createElement('span');
  mainLabel.appendChild(document.createTextNode('Talk to Colin'));
  labelWrap.appendChild(subLabel);
  labelWrap.appendChild(mainLabel);
  btn.appendChild(labelWrap);

  // Bottom-sheet backdrop
  const bg = document.createElement('div');
  bg.className = 'fw-sheet-bg';

  // Bottom-sheet
  const sheet = document.createElement('div');
  sheet.className = 'fw-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', 'Conversation options with Colin');

  // Header
  const hd = document.createElement('div');
  hd.className = 'fw-sheet-hd';
  const hdAv = document.createElement('span');
  hdAv.className = 'fw-sheet-av';
  hdAv.setAttribute('aria-hidden', 'true');
  hdAv.appendChild(document.createTextNode('CS'));
  const hdWho = document.createElement('div');
  hdWho.className = 'fw-sheet-who';
  const hdName = document.createElement('div');
  hdName.className = 'fw-sheet-name';
  hdName.appendChild(document.createTextNode('Colin Smith'));
  const hdMeta = document.createElement('div');
  hdMeta.className = 'fw-sheet-meta';
  hdMeta.appendChild(document.createTextNode('Founder \u00B7 online now'));
  hdWho.appendChild(hdName);
  hdWho.appendChild(hdMeta);
  const hdClose = document.createElement('button');
  hdClose.type = 'button';
  hdClose.className = 'fw-sheet-close';
  hdClose.setAttribute('aria-label', 'Close');
  const hdCloseSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  hdCloseSvg.setAttribute('viewBox', '0 0 16 16');
  const hdClosePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  hdClosePath.setAttribute('d', 'M4 4l8 8M12 4l-8 8');
  hdCloseSvg.appendChild(hdClosePath);
  hdClose.appendChild(hdCloseSvg);
  hd.appendChild(hdAv); hd.appendChild(hdWho); hd.appendChild(hdClose);

  // Lede
  const lede = document.createElement('p');
  lede.className = 'fw-sheet-lede';
  lede.appendChild(document.createTextNode('I answer every message personally. Pick the channel you want \u2014 '));
  const ledeStrong = document.createElement('strong');
  ledeStrong.appendChild(document.createTextNode('I reply within 2 business hours'));
  lede.appendChild(ledeStrong);
  lede.appendChild(document.createTextNode(', usually much faster.'));

  // Options
  const opts = document.createElement('div');
  opts.className = 'fw-opts';

  function makeOpt(iconSvgD, title, body, href, eventName){
    const a = document.createElement('a');
    a.className = 'fw-opt';
    a.href = href;
    a.addEventListener('click', () => {
      track(eventName, {from_path: location.pathname});
      setTimeout(close, 100);
    });

    const ic = document.createElement('span');
    ic.className = 'fw-opt-ic';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    iconSvgD.forEach(d => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    });
    ic.appendChild(svg);

    const mid = document.createElement('div');
    const t = document.createElement('div');
    t.className = 'fw-opt-t';
    t.appendChild(document.createTextNode(title));
    const b = document.createElement('div');
    b.className = 'fw-opt-b';
    b.appendChild(document.createTextNode(body));
    mid.appendChild(t);
    mid.appendChild(b);

    const arr = document.createElement('span');
    arr.className = 'fw-opt-arr';
    arr.appendChild(document.createTextNode('\u2192'));

    a.appendChild(ic);
    a.appendChild(mid);
    a.appendChild(arr);
    return a;
  }

  const pagePath = encodeURIComponent(location.pathname + location.search);
  const subj = 'Question from ' + location.pathname;
  const bodyTxt = 'Hi Colin \u2014 saw ' + location.pathname + '. My question:\n\n';
  const mailto = 'mailto:colin@usdentalpatientrecovery.com?subject=' +
    encodeURIComponent(subj) + '&body=' + encodeURIComponent(bodyTxt);

  opts.appendChild(makeOpt(
    ['M3 6h14v10H3z', 'M3 7l7 5 7-5'],
    'Email Colin',
    'Reply within 2h \u00B7 pre-filled with your question',
    mailto,
    'Founder contact \u2014 email'
  ));
  opts.appendChild(makeOpt(
    ['M4 3h12v14H4z', 'M4 6h12', 'M8 10h4', 'M8 13h4'],
    'Book a 15-min call',
    'Same-day slots \u00B7 no pitch deck',
    '/schedule.html?from=' + pagePath,
    'Founder contact \u2014 schedule'
  ));
  opts.appendChild(makeOpt(
    ['M10 3a7 7 0 0 0-6.9 5.8L2 14l5.2-1.1A7 7 0 1 0 10 3z'],
    'Start the 14-day trial',
    'No card \u00B7 cancel in one click',
    '/signup?tier=practice_pro&utm_source=founder_widget&utm_medium=widget',
    'Founder contact \u2014 trial'
  ));

  // Foot
  const foot = document.createElement('div');
  foot.className = 'fw-sheet-foot';
  const footStrong = document.createElement('strong');
  footStrong.appendChild(document.createTextNode('No bot. No CSM tier.'));
  foot.appendChild(footStrong);
  foot.appendChild(document.createTextNode(' One founder, checking inbox between coding sessions.'));

  sheet.appendChild(hd);
  sheet.appendChild(lede);
  sheet.appendChild(opts);
  sheet.appendChild(foot);

  // ───── Open / close ─────────────────────────────────────────────────────
  function open(){
    bg.classList.add('on');
    sheet.classList.add('on');
    btn.classList.add('hidden');
    document.addEventListener('keydown', onKey);
    track('Founder widget opened', {from_path: location.pathname});
  }
  function close(){
    bg.classList.remove('on');
    sheet.classList.remove('on');
    btn.classList.remove('hidden');
    document.removeEventListener('keydown', onKey);
  }
  function onKey(ev){ if (ev.key === 'Escape') close(); }

  btn.addEventListener('click', open);
  bg.addEventListener('click', close);
  hdClose.addEventListener('click', close);

  // ───── Boot ─────────────────────────────────────────────────────────────
  function attach(){
    document.body.appendChild(btn);
    document.body.appendChild(bg);
    document.body.appendChild(sheet);
    // Fade button in after a beat
    setTimeout(() => btn.classList.add('on'), 4000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, {once: true});
  } else {
    attach();
  }
})();
