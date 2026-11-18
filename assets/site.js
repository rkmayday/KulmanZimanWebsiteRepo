// Ziman Sites — small, dependency-free enhancements. The site works without this file.
/* Open Gmail's compose window with everything filled in (falls back to a normal link if pop-ups are blocked) */
window.kzGmail = (to, subject = '', body = '') => {
  const url = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to) + (subject ? '&su=' + encodeURIComponent(subject) : '') + (body ? '&body=' + encodeURIComponent(body) : '');
  const w = window.open(url, '_blank', 'noopener');
  if (!w) location.href = url;
};

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Links to another page of this site: remember to open that page at the top (see the head script)
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.hash || u.pathname === location.pathname) return;
    try { sessionStorage.setItem('kz-top', '1'); } catch (err) {}
  }, true);

  // Opening animation: the top-left logo replays it; every other link to a page of this site does not
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin) return;
    const brand = !!a.closest('.nav .brand'), loader = !!a.closest('footer .brand');
    if (!brand && !loader && u.pathname === location.pathname && u.hash) return;   // in-page section jumps
    try { sessionStorage.setItem('kz-from', loader || brand ? 'loader' : 'link'); } catch (err) {}   // both Ziman Sites logos replay the Intro Loader
  }, true);

  // Nav: glass background once scrolled, mobile menu toggle
  const nav = $('.nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const menu = $('.menu-btn');
  menu && menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', open);
  });
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

  // Reveal on scroll. Hidden state only exists under .js, and a timer guarantees nothing stays hidden.
  const items = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    items.forEach(el => io.observe(el));
    // safety net: anything on screen that the observer missed is shown; sections further down still animate when reached
    let sweepRaf = 0;
    const sweep = () => { sweepRaf = 0; items.forEach(el => { if (!el.classList.contains('in') && el.getBoundingClientRect().top < innerHeight * .95) el.classList.add('in'); }); };
    setTimeout(sweep, 2500);
    addEventListener('scroll', () => { if (!sweepRaf) sweepRaf = requestAnimationFrame(sweep); }, { passive: true });
  } else items.forEach(el => el.classList.add('in'));

  // Hero: the desk scene tilts gently with the pointer, like looking at real objects
  const scene = $('.scene'), rig = $('.rig');
  if (scene && rig && !reduce && matchMedia('(pointer: fine)').matches) {
    let raf;
    addEventListener('pointermove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
        rig.style.transform = `rotateY(${x * 6}deg) rotateX(${-y * 4}deg)`;
      });
    });
  }

  // Industry tabs (ARIA tabs pattern)
  $$('[role=tablist]').forEach(list => {
    const tabs = $$('[role=tab]', list);
    const select = t => tabs.forEach(o => {
      const on = o === t;
      o.setAttribute('aria-selected', on); o.tabIndex = on ? 0 : -1;
      const p = document.getElementById(o.getAttribute('aria-controls'));
      p.hidden = !on;
      if (on && !reduce) { p.classList.remove('swing'); void p.offsetWidth; p.classList.add('swing'); }
    });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; select(n); n.focus(); }
      });
    });
  });

  // 3D flip card (product)
  $$('.flip-btn').forEach(b => b.addEventListener('click', () => {
    const card = document.getElementById(b.getAttribute('aria-controls'));
    const flipped = card.classList.toggle('flipped');
    $$('.flip-btn', card).forEach(x => x.setAttribute('aria-pressed', flipped));
    $$('.flip-face', card).forEach(f => { f.inert = f.classList.contains('flip-back') ? !flipped : flipped; });
  }));
  $$('.flip').forEach(card => $$('.flip-back', card).forEach(f => { f.inert = true; }));

  // Help: search + category filter
  const q = $('#faq-search'), faq = $('.faq');
  if (q && faq) {
    let cat = 'All';
    const run = () => {
      const term = q.value.trim().toLowerCase(); let shown = 0;
      $$('details', faq).forEach(d => {
        const ok = (cat === 'All' || d.dataset.cat === cat) && d.textContent.toLowerCase().includes(term);
        d.hidden = !ok; if (ok) shown++;
      });
      $('.empty').hidden = shown > 0;
    };
    q.addEventListener('input', run);
    $$('.faq-filter .tab').forEach(b => b.addEventListener('click', () => {
      cat = b.dataset.cat;
      $$('.faq-filter .tab').forEach(o => o.setAttribute('aria-selected', o === b));
      run();
    }));
  }

  // Affiliate calculator
  const r = $('#refs');
  if (r) {
    let rate = 113.6;
    const money = v => '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const upd = () => { $('#refs-n').textContent = r.value; $('#refs-out').textContent = money(r.value * rate); };
    $$('.calc-pkgs [data-commission]').forEach(btn => btn.addEventListener('click', () => {
      rate = parseFloat(btn.dataset.commission);
      $$('.calc-pkgs [data-commission]').forEach(o => o.setAttribute('aria-pressed', o === btn));
      const lab = $('#refs-pkg'), rt = $('#refs-rate'); lab && (lab.textContent = btn.dataset.label); rt && (rt.textContent = money(rate));
      upd();
    }));
    r.addEventListener('input', upd); upd();
  }

  // Copy email buttons
  const toast = msg => {
    let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200);
  };
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('Email copied'); } catch { window.kzGmail(b.dataset.copy); }
  }));

  // Project brief: sent straight to our inbox (FormSubmit, no account needed). If that service is unreachable,
  // it falls back to opening a pre-filled Gmail draft, so a brief is never lost.
  const brief = $('#brief');
  brief && brief.addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(brief), g = k => (f.get(k) || '').toString().trim();
    if (g('_honey')) return;                                         // spam bots fill the hidden field
    const em = brief.querySelector('[name=email]');                 // never send a brief we can't reply to
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g('email'))) { if (em) { em.setCustomValidity('Please enter your email so we can reply.'); em.reportValidity(); em.addEventListener('input', () => em.setCustomValidity(''), { once: true }); } return; }
    const subject = 'Website brief — ' + (g('business') || g('name'));
    const btn = $('button[type=submit]', brief), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending…';
    let sent = false;
    try {
      const r = await fetch('https://formsubmit.co/ajax/zimansites@gmail.com', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: g('name'), email: g('email'), business: g('business') || '-', industry: g('industry'),
          domain: g('domain') || 'Not sure yet', details: g('details'), _subject: subject, _replyto: g('email'), _template: 'table', _captcha: 'false' })
      });
      const d = await r.json().catch(() => ({}));
      sent = r.ok && String(d.success) === 'true';
    } catch (err) { sent = false; }
    btn.disabled = false; btn.textContent = label;
    if (sent) {
      const done = $('.brief-done', brief); $('[data-brief-email]', done).textContent = g('email') || 'your email';
      [...brief.children].forEach(c => { if (c !== done) c.hidden = true; }); done.hidden = false; toast('Brief sent');
    } else {
      // browsers block pop-ups that don't come straight from a click, so offer one-click links instead of opening Gmail ourselves
      const to = 'zimansites@gmail.com', body = [`Name: ${g('name')}`, `Email: ${g('email')}`, `Business: ${g('business')}`, `Industry: ${g('industry')}`,
        `Domain I'd like: ${g('domain') || 'Not sure yet'}`, '', 'What I need:', g('details')].join('\n');
      const fail = $('.brief-fail', brief);
      $('[data-brief-gmail]', fail).href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to) + '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      $('[data-brief-app]', fail).href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      fail.hidden = false; fail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });

  // "Use your usual email app": the same brief as a plain mailto: link
  $$('[data-brief-mailto]').forEach(a => a.addEventListener('click', () => {
    const form = a.closest('form'); if (!form) return;
    const f = new FormData(form), g = k => f.get(k) || '';
    const body = [`Name: ${g('name')}`, `Business: ${g('business')}`, `Industry: ${g('industry')}`, `Domain I'd like: ${g('domain') || 'Not sure yet'}`, '', 'What I need:', g('details')].join('\n');
    a.href = 'mailto:' + a.getAttribute('href').replace(/^mailto:/, '').split('?')[0] + '?subject=' + encodeURIComponent('Website brief — ' + (g('business') || g('name'))) + '&body=' + encodeURIComponent(body);
  }));

  // proof: fan the stacked screens out as they scroll into view
  const stack = $('.stack');
  if (stack && !reduce) {
    let raf = 0;
    const fan = () => { raf = 0; const r = stack.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * .75)));
      stack.style.setProperty('--sp', (p * p * (3 - 2 * p)).toFixed(3)); };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(fan); }, { passive: true }); fan();
  }


  // labels decode like a terminal when they first appear
  const decode = el => {
    if (el._dec || el.children.length || reduce || document.querySelector('link[href*="mono.css"]')) return; el._dec = true;
    const final = el.textContent, G = '01<>/\\[]{}#=+*_-:', N = 26; let f = 0;
    el.setAttribute('aria-label', final);
    const tick = () => { const k = f / N;
      el.textContent = [...final].map((c, i) => c === ' ' || i / final.length < k ? c : G[(Math.random() * G.length) | 0]).join('');
      if (f++ < N) requestAnimationFrame(tick); else { el.textContent = final; el.removeAttribute('aria-label'); } };
    tick();
  };
  if ('IntersectionObserver' in window && !reduce) {
    const dio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { decode(e.target); dio.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('.eyebrow, .hero-tags li, .s-ind').forEach(el => dio.observe(el));
  }

  // "Get started" and every checkout button open the package pop-up over the current page
  const pm = $('#pkg-modal');
  if (pm && typeof pm.showModal === 'function') {
    let opener = null;
    const close = () => { pm.classList.remove('open'); setTimeout(() => { if (pm.open) pm.close(); }, reduce ? 0 : 220); };
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || pm.contains(a)) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || !/\/get-started(\.html)?$/.test(u.pathname)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      nav && nav.classList.remove('open');
      opener = a; pm.showModal(); requestAnimationFrame(() => pm.classList.add('open'));
    }, true);
    pm.addEventListener('click', e => { if (e.target === pm || (e.target.closest && e.target.closest('[data-pm-close]'))) close(); });
    pm.addEventListener('cancel', e => { e.preventDefault(); close(); });
    pm.addEventListener('close', () => { opener && opener.focus({ preventScroll: true }); });
  }

  // Ordering: any checkout link opens a short form first (package, name, email, business, domain, what they need).
  // It is emailed to us (FormSubmit, like the brief), then the visitor continues to the Whop checkout they picked.
  // If sending fails they can still continue. Without JavaScript the links go straight to checkout, as before.
  const om = $('#order-modal');
  if (om && typeof om.showModal === 'function') {
    const form = $('#order-form', om); let pkgEl = $('[data-om-pkg]', om);
    let plans = {}; try { plans = JSON.parse(om.dataset.plans || '{}'); } catch (err) {}
    let target = '', label = '';
    const closeOrder = () => { om.classList.remove('open'); setTimeout(() => { if (om.open) om.close(); }, reduce ? 0 : 220); };
    // two modes: an order (then checkout) or a custom quote (no checkout: we reply with a quote and a Whop invoice)
    const q = s => $(s, om), T = { eyebrow: q('[data-om-eyebrow]'), title: q('[data-om-title]'), lede: q('[data-om-lede]'), det: q('[data-om-detlabel]'), btn: q('[data-om-btn]'), fine: q('[data-om-fine]'), done: q('[data-om-done]') };
    const ORDER_TXT = { eyebrow: T.eyebrow.textContent, title: T.title.textContent, lede: T.lede.innerHTML, det: T.det.textContent, btn: T.btn.textContent, fine: T.fine.textContent };
    let quote = false;
    const setMode = isQuote => {
      quote = isQuote; T.done.hidden = true; [...form.children].forEach(c => { if (c !== T.done && !c.classList.contains('hp')) c.hidden = false; });
      T.eyebrow.textContent = isQuote ? 'Custom quote' : ORDER_TXT.eyebrow;
      T.title.textContent = isQuote ? 'Tell us what you need' : ORDER_TXT.title;
      if (isQuote) T.lede.textContent = 'We reply with a quote. Once you approve it, we send you an invoice through Whop to pay. Nothing is charged before that.'; else T.lede.innerHTML = ORDER_TXT.lede;
      T.det.textContent = isQuote ? 'What do you need?' : ORDER_TXT.det;
      $('textarea', form).placeholder = isQuote ? 'More pages, a domain over $20, or anything else' : 'Your business, pages you need, sites you like';
      T.btn.textContent = isQuote ? 'Request my quote' : ORDER_TXT.btn;
      T.fine.textContent = isQuote ? 'Your request goes straight to our inbox. No payment now.' : ORDER_TXT.fine;
    };
    const openOrder = href => {
      setMode(href === 'QUOTE');
      target = href === 'QUOTE' ? '' : href;
      const k = Object.keys(plans).find(p => href.indexOf(p) === 0); label = href === 'QUOTE' ? 'Custom quote' : (k ? plans[k] : 'your package');
      if (!quote) pkgEl = $('[data-om-pkg]', om), pkgEl.textContent = label;
      const pmo = $('#pkg-modal'); if (pmo && pmo.open) { pmo.classList.remove('open'); pmo.close(); }
      nav && nav.classList.remove('open');
      om.showModal(); requestAnimationFrame(() => om.classList.add('open'));
    };
    document.addEventListener('click', e => {
      const qa = e.target.closest && e.target.closest('[data-quote]');
      if (qa && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.button) { e.preventDefault(); e.stopImmediatePropagation(); openOrder('QUOTE'); return; }
      const a = e.target.closest && e.target.closest('a[href^="https://whop.com/checkout/"]');
      if (!a || om.contains(a) || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault(); e.stopImmediatePropagation();
      openOrder(a.href);
    }, true);
    om.addEventListener('click', e => { if (e.target === om || (e.target.closest && e.target.closest('[data-om-close]'))) closeOrder(); });
    om.addEventListener('cancel', e => { e.preventDefault(); closeOrder(); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(form), g = k => (f.get(k) || '').toString().trim();
      if (g('_honey')) return;
      const need = [['name', 'Please enter your name.'], ['email', 'Please enter your email so we can reply.'], ['details', 'Please tell us a little about the site you need.']];
      for (const [k, msg] of need) {
        const el = form.querySelector('[name=' + k + ']');
        const bad = k === 'email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g(k)) : !g(k);
        if (bad) { el.setCustomValidity(msg); el.reportValidity(); el.addEventListener('input', () => el.setCustomValidity(''), { once: true }); return; }
      }
      const btn = $('button[type=submit]', form), html = btn.innerHTML;
      btn.disabled = true; btn.textContent = 'Sending…';
      // inside a frame (a preview, or another app's built-in browser) Whop's checkout refuses to load and the frame goes blank,
      // so there checkout opens in a new tab instead. The tab is opened now, during the click, so pop-up blockers allow it.
      let tab = null;
      if (!quote && window.top !== window) { try { tab = window.open('', '_blank'); } catch (err) { tab = null; } }
      const fields = { package: label, name: g('name'), email: g('email'), business: g('business') || '-', domain: g('domain') || 'Not sure yet',
        details: g('details'), _subject: (quote ? 'Quote request — ' : 'New order — ' + label + ' — ') + (g('business') || g('name')), _replyto: g('email'), _template: 'table', _captcha: 'false' };
      let sent = false;
      try {
        const ctl = 'AbortController' in window ? new AbortController() : null, timer = ctl && setTimeout(() => ctl.abort(), 8000);
        const r = await fetch('https://formsubmit.co/ajax/zimansites@gmail.com', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(fields), signal: ctl ? ctl.signal : undefined
        });
        timer && clearTimeout(timer);
        const d = await r.json().catch(() => ({}));
        sent = r.ok && String(d.success) === 'true';
      } catch (err) { sent = false; }
      // never show the customer an error: if the normal send fails, try a simpler background send, then go to checkout either way
      if (!sent) { try { navigator.sendBeacon && navigator.sendBeacon('https://formsubmit.co/zimansites@gmail.com', new URLSearchParams(fields)); } catch (err) {} }
      if (quote) {   // a quote request: thank them, no checkout
        btn.disabled = false; btn.innerHTML = html; $('[data-om-email]', om).textContent = g('email');
        [...form.children].forEach(c => { if (c !== T.done) c.hidden = true; }); T.done.hidden = false; form.reset(); return;
      }
      if (tab) { tab.location.href = target; btn.disabled = false; btn.innerHTML = html; closeOrder(); return; }
      btn.textContent = 'Opening checkout…'; location.href = target;
    });
  }

  // portfolio clips: all four have the same length and timeline, so they start together and loop in sync;
  // they play only while on screen, and reduced motion keeps the still picture (the poster)
  const clips = $$('video[data-autoplay]');
  if (clips.length && !reduce && 'IntersectionObserver' in window) {
    const seen = new Set(); let playing = false;
    const startAll = () => {
      playing = true;
      clips.forEach(v => { v.preload = 'auto'; v.defaultPlaybackRate = v.playbackRate = 1; try { v.currentTime = 0; } catch (e) {} });
      clips.forEach(v => { const pr = v.play(); pr && pr.catch(() => {}); });
    };
    const stopAll = () => { playing = false; clips.forEach(v => v.pause()); };
    const vio = new IntersectionObserver(es => {
      es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target));
      if (seen.size && !playing) startAll(); else if (!seen.size && playing) stopAll();
    }, { threshold: .6 });
    clips.forEach(v => vio.observe(v));
    // keep them together: every so often, nudge any clip that has drifted back to the first one's time
    setInterval(() => {
      if (!playing) return; const lead = clips[0], t = lead.currentTime;
      clips.forEach(v => { if (v !== lead && !v.paused && Math.abs(v.currentTime - t) > .08) v.currentTime = t; });
    }, 1000);
  }
  // ---------- headings light up word by word as you scroll past them ----------
  // Each word starts faint and turns solid as the heading moves up the screen. Plain text stays in the page,
  // so screen readers and search engines read it as normal. Off for "reduce motion".
  const swTargets = $$('.section-head h2, .mission blockquote').filter(el => !el.hasAttribute('data-no-sw'));
  if (swTargets.length && !reduce && 'IntersectionObserver' in window) {
    const groups = swTargets.map(el => {
      const words = [];
      const walk = node => [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/); if (!n.textContent.trim()) return;
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.append(p); return; }
            const w = document.createElement('span'); w.className = 'sw-word'; w.textContent = p; frag.append(w); words.push(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'CITE' && n.tagName !== 'BR') walk(n);
      });
      walk(el);
      return { el, words, last: -1 };
    });
    const live = new Set();
    // a steady screen height: a phone's address bar sliding in and out changes innerHeight while you scroll, which made the
    // words flicker back and forth. Only a real resize (a new width, or rotating the phone) updates it.
    let swVH = innerHeight, swW = innerWidth;
    addEventListener('resize', () => { if (innerWidth !== swW) { swW = innerWidth; swVH = innerHeight; groups.forEach(g => g.last = -1); } });
    const paint = () => {
      swRaf = 0; const vh = swVH;
      live.forEach(g => {
        const top = g.el.getBoundingClientRect().top;
        const p = Math.min(1, Math.max(0, (vh * .9 - top) / (vh * .42)));   // from 90% down the screen to 48%
        if (Math.abs(p - g.last) < .002) return; g.last = p;
        const n = g.words.length;
        g.words.forEach((w, i) => { const k = Math.min(1, Math.max(0, p * (n + 2) - i)); w.style.setProperty('--wo', (.14 + .86 * k).toFixed(3)); });
      });
    };
    let swRaf = 0;
    const ask = () => { if (!swRaf) swRaf = requestAnimationFrame(paint); };
    const swio = new IntersectionObserver(es => { es.forEach(e => { const g = groups.find(x => x.el === e.target); e.isIntersecting ? live.add(g) : live.delete(g); }); ask(); }, { rootMargin: '10% 0px 10% 0px' });
    groups.forEach(g => swio.observe(g.el));
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask);
  }

  // ---------- home: watch a homepage build itself ----------
  const bd = $('.bd');
  if (bd) {
    const page = $('.bd-page', bd), browser = $('.bd-browser', bd), H = $('.bd-h span', bd);
    const SITES = {
      gym: { name: 'Northside Fitness', domain: 'northsidefitness.com', links: 'Classes · Coaches · Join', pill: 'Join now', kick: 'Personal training & classes',
        h: 'Stronger every week.', p: 'Small-group classes and coaching that fit around your life.', cta: 'Start a free week', ghost: 'See timetable', cards: ['Strength', 'Conditioning', 'Mobility'] },
      cafe: { name: 'Harbour Coffee', domain: 'harbourcoffee.com', links: 'Menu · Visit · Order', pill: 'Order ahead', kick: 'Small-batch roastery & café',
        h: 'Coffee worth the walk.', p: 'Roasted in-house every morning and poured by people who care.', cta: 'See the menu', ghost: 'Find us', cards: ['Espresso', 'Pour-over', 'Pastries'] },
      tech: { name: 'Lumen Cloud', domain: 'lumencloud.io', links: 'Product · Pricing · Docs', pill: 'Sign in', kick: 'Infrastructure for small teams',
        h: 'Ship faster, sleep better.', p: 'Deploys, monitoring and backups in one calm dashboard.', cta: 'Start free trial', ghost: 'Book a demo', cards: ['Deploy', 'Monitor', 'Scale'] },
      coach: { name: 'Maya Reyes Coaching', domain: 'mayareyes.com', links: 'About · Programs · Book', pill: 'Book a call', kick: 'Career & life coaching',
        h: 'Your next chapter starts here.', p: 'One-to-one coaching for people ready for a change.', cta: 'Book a free call', ghost: 'Read stories', cards: ['Clarity', 'Confidence', 'Momentum'] }
    };
    const STEPS = ['s-bg', 's-nav', 's-kick', 's-p', 's-btn', 's-vis', 's-cards'];
    let kind = 'gym', timers = [], built = false;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const fill = d => {
      $('.bd-logo', bd).textContent = d.name; $('.bd-links', bd).textContent = d.links; $('.bd-pill', bd).textContent = d.pill;
      $('.bd-kicker', bd).textContent = d.kick; $('.bd-p', bd).textContent = d.p; $('.bd-btn', bd).textContent = d.cta; $('.bd-ghost', bd).textContent = d.ghost;
      $$('.bd-cards span', bd).forEach((el, i) => el.textContent = d.cards[i]);
    };
    const build = () => {
      timers.forEach(clearTimeout); timers = [];
      const d = SITES[kind]; fill(d); page.dataset.kind = kind; built = true;
      page.classList.remove(...STEPS, 'typing'); browser.classList.remove('typing-url');
      const dom = $('.bd-domain', bd);
      if (reduce) { dom.textContent = d.domain; H.textContent = d.h; page.classList.add(...STEPS); return; }
      dom.textContent = ''; H.textContent = '';
      // 1. the address types itself, 2. the page fills in block by block while the headline types out
      browser.classList.add('typing-url');
      [...d.domain].forEach((c, i) => later(() => { dom.textContent += c; }, 120 + i * 32));
      let t = 160 + d.domain.length * 32;
      later(() => browser.classList.remove('typing-url'), t);
      later(() => page.classList.add('s-bg', 's-nav'), t += 60);
      later(() => page.classList.add('s-kick', 'typing'), t += 280);
      [...d.h].forEach((c, i) => later(() => { H.textContent += c; }, t + 120 + i * 42));
      t += 120 + d.h.length * 42;
      later(() => page.classList.add('s-p'), t += 60);
      later(() => page.classList.add('s-btn'), t += 220);
      later(() => page.classList.add('s-vis'), t += 160);
      later(() => page.classList.add('s-cards'), t += 260);
      later(() => page.classList.remove('typing'), t + 1400);
    };
    const press = (sel, btn) => $$(sel, bd).forEach(b => b.setAttribute('aria-pressed', b === btn));
    $$('[data-kind]', bd).forEach(b => b.addEventListener('click', () => { kind = b.dataset.kind; press('[data-kind]', b); build(); }));
    $$('[data-color]', bd).forEach(b => b.addEventListener('click', () => { browser.style.setProperty('--ac', b.dataset.color); press('[data-color]', b); if (!built) build(); }));
    $('.bd-again', bd).addEventListener('click', build);
    fill(SITES[kind]);
    if ('IntersectionObserver' in window) {
      const bio = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { bio.disconnect(); if (!built) build(); } }, { threshold: .35 });
      bio.observe(browser);
    } else build();
  }

  // home industries (Expanded Cards): all even at first; hovering or focusing a card widens it on computers
  const xcs = $$('.xc');
  xcs.forEach(c => c.addEventListener('click', () => { try { sessionStorage.setItem('kz-slide', c.getAttribute('href').split('#slide-')[1] || ''); } catch (e) {} }));
  if (xcs.length && matchMedia('(hover: hover) and (min-width: 861px)').matches) {
    const pick = c => xcs.forEach(x => x.classList.toggle('on', x === c));
    xcs.forEach(c => { c.addEventListener('mouseenter', () => pick(c)); c.addEventListener('focus', () => pick(c)); });
    // leaving the row (or tabbing out of it) puts all four back to even
    const rail = xcs[0].parentNode;
    rail.addEventListener('mouseleave', () => pick(null));
    rail.addEventListener('focusout', e => { if (!rail.contains(e.relatedTarget)) pick(null); });
  }

  // ---------- Portfolio: demo slider. One screen tall: the scroll stops on it once, and the arrows (or the arrow keys,
  // or a sideways swipe) move between the demos, lined up side by side. The giant name swaps letter by letter. ----------
  const ss = $('.stack-show');
  if (ss && !reduce) {
    const demos = $$('.samples .sample').map(a => {
      const st = getComputedStyle(a), vid = a.querySelector('video');
      return { name: a.querySelector('b').textContent.trim(), ind: (a.querySelector('.s-ind') || {}).textContent || '', desc: (a.querySelector('b + span') || {}).textContent || '',
        href: a.getAttribute('href'), ac: st.getPropertyValue('--s1').trim() || '#888', bg: st.getPropertyValue('--s2').trim() || '#111',
        video: vid ? vid.getAttribute('src') : '', poster: vid ? vid.getAttribute('poster') : '' };
    });
    if (demos.length) {
      ss.hidden = false;
      const pin = $('.ss-pin', ss), word = $('.ss-word', ss), cardsEl = $('.ss-cards', ss), dots = $('.ss-dots', ss),
        info = { count: $('.ss-count b', ss), ind: $('.ss-ind', ss), desc: $('.ss-desc', ss), open: $('.ss-open', ss) };
      $('.ss-count', ss).lastChild.textContent = ' / ' + String(demos.length).padStart(2, '0');
      const phone = matchMedia('(max-width: 860px), (hover: none)').matches;   // lighter effects (no blur) on phones and touch screens
      const narrow = () => matchMedia('(max-width: 860px)').matches;
      const light = hex => { const h = hex.replace('#', ''); if (h.length < 6) return false; const [r, g, b] = [0, 2, 4].map(k => parseInt(h.substr(k, 2), 16)); return (r * 299 + g * 587 + b * 114) / 1000 > 150; };
      const cards = demos.map((d, i) => {
        const c = document.createElement('a'); c.className = 'ss-card'; c.href = d.href; c.setAttribute('aria-label', 'Open the ' + d.name + ' sample');
        c.innerHTML = `<img src="${d.poster}" alt="" loading="${i ? 'lazy' : 'eager'}">` + (d.video ? `<video muted loop playsinline preload="none" src="${d.video}" aria-hidden="true"></video>` : '');
        cardsEl.append(c); return c;
      });
      dots.innerHTML = demos.map(() => '<i></i>').join('');
      let active = -1, playing = -1, onScreen = false;
      const RATE = 1;   // clips play at the speed they were recorded
      const fit = () => { word.style.fontSize = ''; const cs = getComputedStyle(word), avail = word.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), w = word.scrollWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        if (w > avail && avail > 0) word.style.fontSize = (parseFloat(cs.fontSize) * avail / w * .97).toFixed(1) + 'px'; };
      addEventListener('resize', () => { if (active >= 0) fit(); });
      const setActive = i => {
        if (i === active) return; active = i; const d = demos[i], lt = light(d.bg);
        pin.style.setProperty('--bg', d.bg); pin.style.setProperty('--ac', d.ac);
        pin.style.setProperty('--tx', lt ? '#141414' : '#f5f4f2'); pin.style.setProperty('--mu', lt ? 'rgba(20,20,20,.62)' : 'rgba(245,244,242,.7)');
        word.innerHTML = [...d.name].map((ch, k) => ch === ' ' ? '<span class="sp" style="--i:' + k + '"></span>' : `<span style="--i:${k}">${ch}</span>`).join('');
        fit();
        info.count.textContent = String(i + 1).padStart(2, '0'); info.ind.textContent = d.ind; info.desc.textContent = d.desc; info.open.href = d.href;
        cards.forEach((c, k) => c.classList.toggle('on', k === i));
        [...dots.children].forEach((e, k) => e.classList.toggle('on', k === i));
        play();
      };
      // only the demo in front plays, from the start, and only while the slider is in view
      const play = () => {
        const want = onScreen ? active : -1; if (want === playing) return; playing = want;
        cards.forEach((c, k) => { const v = c.querySelector('video'); if (!v) return;
          if (k === want) { v.preload = 'auto'; v.defaultPlaybackRate = v.playbackRate = RATE; try { v.currentTime = 0; } catch (e) {} const pr = v.play(); pr && pr.catch(() => {}); }
          else v.pause(); });
      };
      // the cards glide to the chosen demo
      let f = 0, target = 0, raf = 0;
      const draw = () => {
        const sx = narrow() ? 74 : 62;
        cards.forEach((c, k) => {
          const d = k - f, ad = Math.abs(d);
          c.style.transform = `translate3d(calc(${narrow() ? '0%' : '-50%'} + ${(d * sx).toFixed(2)}%),-50%,${(-ad * 170).toFixed(1)}px) rotateY(${(d * -16).toFixed(2)}deg) scale(${(1 - Math.min(ad, 2) * .14).toFixed(3)})`;
          c.style.opacity = Math.max(0, 1 - ad * (phone ? .9 : .6)).toFixed(3);
          if (!phone) c.style.filter = ad < .02 ? 'none' : `blur(${Math.min(10, ad * 6).toFixed(1)}px)`;
          c.style.zIndex = String(100 - Math.round(ad * 10));
          c.style.pointerEvents = ad < .5 ? 'auto' : 'none';
        });
      };
      const tick = () => { raf = 0; f += (target - f) * .16; if (Math.abs(target - f) < .002) f = target; draw(); if (f !== target) raf = requestAnimationFrame(tick); };
      const go = i => { const n = demos.length; target = ((i % n) + n) % n; setActive(target); if (!raf) raf = requestAnimationFrame(tick); };
      $('.ss-prev', ss).addEventListener('click', () => go(active - 1));
      $('.ss-next', ss).addEventListener('click', () => go(active + 1));
      addEventListener('keydown', e => { if (!onScreen || e.target.closest && e.target.closest('input,textarea,select')) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); } });
      // sideways swipe on touch screens (up and down still scrolls the page)
      let tx = 0, ty = 0, swiped = false;
      pin.addEventListener('touchstart', e => { const t = e.touches[0]; tx = t.clientX; ty = t.clientY; swiped = false; }, { passive: true });
      pin.addEventListener('touchmove', e => { if (swiped) return; const t = e.touches[0], dx = t.clientX - tx, dy = t.clientY - ty;
        if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.4) { swiped = true; go(active + (dx < 0 ? 1 : -1)); } }, { passive: true });
      // computers (mouse or trackpad): the scroll stops once, with the whole slider in view (smooth.js). Phones scroll straight past it.
      const stopAt = () => Math.round(ss.getBoundingClientRect().top + scrollY - 72);
      const fineStop = matchMedia('(hover: hover) and (pointer: fine)').matches;
      const refresh = () => { if (fineStop) ss.dataset.stops = String(stopAt()); };
      ss.__refreshStop = refresh; refresh(); addEventListener('load', refresh);
      new IntersectionObserver(es => { onScreen = es[0].intersectionRatio > .55; play(); }, { threshold: [0, .55, .8] }).observe(ss);
      let pickSlug = /^#slide-/.test(location.hash) ? location.hash.slice(7) : '';
      try { pickSlug = pickSlug || sessionStorage.getItem('kz-slide') || ''; sessionStorage.removeItem('kz-slide'); } catch (e) {}
      const want = pickSlug ? demos.findIndex(d => d.href.replace(/\.html$/, '').split('/').pop() === pickSlug) : -1;
      if (want > 0) { f = target = want; setActive(want); } else setActive(0);
      draw();
      if (want >= 0) {
        const land = () => { refresh(); scrollTo({ top: stopAt(), behavior: 'instant' }); };
        land(); requestAnimationFrame(land); addEventListener('load', () => setTimeout(land, 30), { once: true });
        history.replaceState(null, '', location.pathname);
      }
    }
  }

  if ((!ss || reduce) && /^#slide-/.test(location.hash)) { const el = document.getElementById(location.hash.slice(7)); if (el) el.scrollIntoView(); }

  // pricing folders: on touch screens they open as they scroll into view (computers open them on hover)
  const folders = $$('.folder');
  if (folders.length && 'IntersectionObserver' in window && !matchMedia('(hover: hover)').matches) {
    const fio = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('open', e.isIntersecting)), { threshold: .7 });
    folders.forEach(f => fio.observe(f));
  }

  // ---------- page transitions ----------
  // A link to another page of this site: the page fades out quickly and the next one fades in (see the head script).
  // Pop-ups, new tabs, the top-left logo (it has its own opening animation) and the sample sites are left alone.
  if (!reduce) {
    const html = document.documentElement;
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || /^\/samples\//.test(u.pathname) || /\/get-started(\.html)?$/.test(u.pathname)) return;
      if (u.pathname === location.pathname) return;                 // same page (section links)
      if (a.closest('.nav .brand') || a.closest('footer .brand')) return;   // these replay an opening instead
      e.preventDefault();
      html.classList.add('pt-out');
      try { sessionStorage.setItem('kz-pt', '1'); } catch (err) {}
      setTimeout(() => { location.href = a.href; }, 150);
      setTimeout(() => html.classList.remove('pt-out'), 3000);       // safety: never leave the page blank
    });
    // coming back with the back button (page restored from memory): show it straight away
    addEventListener('pageshow', e => { if (e.persisted) { html.classList.remove('pt-out', 'pt-in'); try { sessionStorage.removeItem('kz-pt'); } catch (err) {} } });
  }

  // blend cursor: a circle that inverts whatever it is over, and grows over links and buttons.
  // Only with a real mouse or trackpad; phones, tablets and "reduce motion" keep the normal cursor.
  // A small notch on the right edge pulls out a switch to turn it off (remembered on this browser).
  if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const cur = document.createElement('div'); cur.className = 'blend-cursor'; cur.setAttribute('aria-hidden', 'true');
    document.body.append(cur);
    const html = document.documentElement;
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0, on = false, off = false;
    try { off = localStorage.getItem('kz-cursor') === 'off'; } catch (e) {}
    const tick = () => {
      cx += (x - cx) * .4; cy += (y - cy) * .4;
      cur.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
      raf = Math.abs(x - cx) + Math.abs(y - cy) > .2 ? requestAnimationFrame(tick) : 0;
    };
    const show = v => { if (v !== on) { on = v; cur.classList.toggle('on', v); html.classList.toggle('blend-on', v); } };
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      if (off) return;
      if (!on) { cx = x; cy = y; show(true); }
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    const HOT = 'a,button,summary,label,select,[role=tab],[role=button],[role=switch],.sample,.cur-notch,input[type=range],input[type=checkbox],input[type=radio]';
    document.addEventListener('pointerover', e => {
      const t = e.target instanceof Element ? e.target : null;
      cur.classList.toggle('big', !!(t && t.closest(HOT)));
      cur.classList.toggle('text', !!(t && t.closest('input:not([type=range]):not([type=checkbox]):not([type=radio]),textarea,[contenteditable]')));
    }, { passive: true });
    html.addEventListener('mouseleave', () => show(false));
    addEventListener('blur', () => show(false));
    addEventListener('pointerdown', () => cur.classList.add('down'), { passive: true });
    addEventListener('pointerup', () => cur.classList.remove('down'), { passive: true });

    // the notch and its switch
    const box = document.createElement('div'); box.className = 'cur-ctl';
    box.innerHTML = '<button class="cur-notch" type="button" aria-expanded="false" aria-controls="cur-panel" aria-label="Cursor settings"><i class="cur-dot"></i>'
      + '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
      + '<div class="cur-panel" id="cur-panel"><span>Custom cursor</span><button class="cur-sw" type="button" role="switch" aria-checked="true"><i></i><b></b></button></div>';
    document.body.append(box);
    const notch = box.querySelector('.cur-notch'), sw = box.querySelector('.cur-sw');
    const setOff = v => {
      off = v; sw.setAttribute('aria-checked', String(!v)); sw.querySelector('b').textContent = v ? 'Off' : 'On';
      try { v ? localStorage.setItem('kz-cursor', 'off') : localStorage.removeItem('kz-cursor'); } catch (e) {}
      if (v) show(false); else { cx = x; cy = y; if (x || y) { show(true); if (!raf) raf = requestAnimationFrame(tick); } }
    };
    setOff(off);
    const open = v => { box.classList.toggle('open', v); notch.setAttribute('aria-expanded', String(v)); };
    // pull the notch out towards the page (or just click it) to open; push it back (or click again) to close
    let sx = null, moved = false;
    notch.addEventListener('pointerdown', e => { sx = e.clientX; moved = false; notch.setPointerCapture(e.pointerId); });
    notch.addEventListener('pointermove', e => {
      if (sx === null) return; const dx = e.clientX - sx;
      if (Math.abs(dx) > 6) moved = true;
      if (dx > 18 && !box.classList.contains('open')) { open(true); sx = e.clientX; }
      else if (dx < -18 && box.classList.contains('open')) { open(false); sx = e.clientX; }
    });
    notch.addEventListener('pointerup', () => { if (!moved) open(!box.classList.contains('open')); sx = null; });
    notch.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(!box.classList.contains('open')); } });
    sw.addEventListener('click', () => setOff(!off));
    document.addEventListener('pointerdown', e => { if (box.classList.contains('open') && !box.contains(e.target)) open(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
  }
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();

// "How it works" (home). Computers (wide window, mouse): the section holds while the three steps slide sideways with
// the scroll; the step nearest the focus line is sharp, the others dim back. Phones, tablets and narrow windows: the
// steps glide sideways by themselves as the section passes up the screen (no holding, no swiping needed). Resizing
// across the line switches between the two at once. Reduced motion keeps the plain layout.
(() => {
  const sec = document.getElementById('selling-points');
  if (!sec) return;
  const steps = sec.querySelector('.steps'), head = sec.querySelector('.section-head'), wrap = sec.querySelector('.wrap');
  if (!steps || !head || !wrap) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ok = matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const cards = [...steps.querySelectorAll('.sheet')], home = [...wrap.children];
  cards.forEach(c => c.classList.remove('reveal'));

  const reel = sig => {
    const run = document.createElement('div'); run.className = 'reel-run';
    const pin = document.createElement('div'); pin.className = 'reel-pin';
    const meta = document.createElement('div'); meta.className = 'reel-meta'; meta.setAttribute('aria-hidden', 'true');
    meta.innerHTML = '<span><b>01</b> / 0' + cards.length + '</span><i><i></i></i>';
    head.after(run); run.append(pin); pin.append(head, steps); head.append(meta);
    sec.classList.add('reel-on');
    const count = meta.querySelector('b'), fill = meta.querySelector('i i');
    let travel = 0, last = -1, fx = 0;
    const measure = () => {
      // the reel stops when the last step sits exactly where step 1 sat at the start (same on every screen width)
      const lastC = cards[cards.length - 1];
      travel = Math.max(0, lastC.offsetLeft - cards[0].offsetLeft);
      fx = steps.offsetLeft + cards[0].offsetLeft + cards[0].offsetWidth / 2;   // the focus line: that spot
      run.style.height = Math.round(pin.offsetHeight + travel * 1.5) + 'px';
      last = -1; update();
    };
    const update = () => {
      const r = run.getBoundingClientRect(), top = parseFloat(getComputedStyle(pin).top) || 0;
      if (r.bottom < 0 || r.top > innerHeight) return;
      const span = Math.max(1, r.height - pin.offsetHeight);
      const p = clamp((top - r.top) / span);
      if (Math.abs(p - last) < .00005) return;
      last = p;
      const k = clamp((p - .06) / .94);                 // a short hold at the start, none at the end
      steps.style.transform = `translate3d(${(-k * travel).toFixed(1)}px,0,0)`;
      const vw = innerWidth;
      cards.forEach(c => {
        const b = c.getBoundingClientRect(), off = (b.left + b.width / 2 - fx) / vw, a = clamp(Math.abs(off) * 1.6);
        c.style.opacity = (1 - a * .55).toFixed(3); c.style.scale = (1 - a * .07).toFixed(4);
      });
      count.textContent = '0' + (Math.round(k * (cards.length - 1)) + 1); fill.style.transform = `scaleX(${k.toFixed(4)})`;
    };
    // hover: a soft light follows the cursor inside the step, and the step leans a little toward it
    cards.forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        c.style.translate = `${((x - .5) * 14).toFixed(1)}px ${((y - .5) * 14 - 6).toFixed(1)}px`;
      }, { signal: sig });
      c.addEventListener('pointerleave', () => { c.style.translate = '0 0'; }, { signal: sig });
    });
    addEventListener('scroll', update, { passive: true, signal: sig });
    addEventListener('resize', measure, { signal: sig });
    addEventListener('load', measure, { signal: sig });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!sig.aborted) measure(); });
    measure();
    return () => { sec.classList.remove('reel-on'); meta.remove(); };
  };

  // phones, tablets and narrow windows: the row glides left while the section rises up the screen
  const glide = sig => {
    sec.classList.add('glide');
    let travel = 0, raf = 0;
    const measure = () => { steps.style.transform = 'none'; const lastC = cards[cards.length - 1];
      travel = Math.max(0, lastC.offsetLeft + lastC.offsetWidth - steps.clientWidth + 20); update(); };
    const update = () => {
      raf = 0;
      const r = steps.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const p = clamp((innerHeight * .6 - r.top) / (innerHeight * .48)), k = p * p * (3 - 2 * p);   // starts once the steps are fully on screen
      steps.style.transform = `translate3d(${(-k * travel).toFixed(1)}px,0,0)`;
      // the step nearest the middle of the screen is the bright one
      const mid = innerWidth / 2;
      cards.forEach(c => { const b = c.getBoundingClientRect(), a = clamp(Math.abs(b.left + b.width / 2 - mid) / (b.width * 1.1));
        c.style.opacity = (1 - a * .45).toFixed(3); c.style.scale = (1 - a * .05).toFixed(4); });
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true, signal: sig });
    addEventListener('resize', measure, { signal: sig });
    addEventListener('load', measure, { signal: sig });
    measure();
    return () => { sec.classList.remove('glide'); };
  };

  let ctl = null, undo = null, mode = '';
  const pick = () => {
    const want = ok.matches ? 'reel' : 'glide'; if (want === mode) return;
    if (ctl) ctl.abort(); if (undo) undo();
    wrap.replaceChildren(...home);   // the section as the page wrote it, then the other layout on top
    steps.style.transform = ''; cards.forEach(c => { c.style.opacity = ''; c.style.scale = ''; c.style.translate = ''; });
    mode = want; ctl = new AbortController(); undo = (want === 'reel' ? reel : glide)(ctl.signal);
  };
  ok.addEventListener ? ok.addEventListener('change', pick) : ok.addListener(pick);
  pick();
})();

// Computers only: boxes light up around the cursor and lean toward it a little, and buttons lean toward the cursor.
// Movement eases (no jumps), and nothing runs on touch screens or with reduced motion.
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = [];
  const add = (el, amt, lift, glow) => {
    if (glow) el.classList.add('glow-card');
    const s = { el, x: 0, y: 0, tx: 0, ty: 0 }; items.push(s);
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      if (glow) { el.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--my', (y * 100).toFixed(1) + '%'); }
      s.tx = (x - .5) * amt; s.ty = (y - .5) * amt - lift; kick();
    });
    el.addEventListener('pointerleave', () => { s.tx = 0; s.ty = 0; kick(); });
  };
  document.querySelectorAll('.pkg, .box, .sample, .calc, .steps .sheet, .stat, .faq details').forEach(el => { if (!el.closest('#selling-points, #connections, #refinement-process')) add(el, el.matches('.faq details') ? 3 : 8, el.matches('.faq details') ? 0 : 2, true); });
  document.querySelectorAll('.btn').forEach(el => add(el, 6, 0, false));
  let running = false;
  const kick = () => { if (!running) { running = true; requestAnimationFrame(tick); } };
  const tick = () => {
    let moving = false;
    items.forEach(s => {
      s.x += (s.tx - s.x) * .16; s.y += (s.ty - s.y) * .16;
      if (Math.abs(s.tx - s.x) > .05 || Math.abs(s.ty - s.y) > .05) moving = true; else { s.x = s.tx; s.y = s.ty; }
      s.el.style.translate = (s.x || s.y) ? `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px` : '';
    });
    if (moving) requestAnimationFrame(tick); else running = false;
  };
})();


// Computers only: bigger 3D moments. Each one eases toward the cursor (no jumps) and settles back when the cursor leaves.
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const all = (s, r = document) => [...r.querySelectorAll(s)];
  const live = new Set(); let raf = 0;
  const loop = () => { raf = 0; live.forEach(f => { if (!f()) live.delete(f); }); if (live.size) raf = requestAnimationFrame(loop); };
  const run = f => { live.add(f); if (!raf) raf = requestAnimationFrame(loop); };
  // tilt(el): el turns in 3D toward the cursor, with a glare; `layers` move by depth for parallax; `area` is what listens
  const tilt = (el, o = {}) => {
    const area = o.area || el, max = o.max || 8, layers = (o.layers || []).map(([s, d]) => [all(s, el), d]);
    const glare = document.createElement('span'); glare.className = 'tilt-glare'; glare.setAttribute('aria-hidden', 'true'); el.append(glare);
    el.classList.add('tilt3d');
    let x = 0, y = 0, tx = 0, ty = 0, on = 0, ton = 0, t0 = performance.now();
    const step = () => {
      if (o.idle && !ton) { const s = (performance.now() - t0) / 1000; tx = Math.sin(s * .5) * .35; ty = Math.cos(s * .37) * .3; }
      const damp = o.calm && o.calm() ? .3 : 1;
      x += (tx * damp - x) * .09; y += (ty * damp - y) * .09; on += (ton - on) * .1;
      el.style.transform = `perspective(${o.persp || 1100}px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateZ(0)`;
      glare.style.setProperty('--gx', (50 + x * 50).toFixed(1) + '%'); glare.style.setProperty('--gy', (50 + y * 50).toFixed(1) + '%');
      glare.style.opacity = (on * (o.glare ?? .9)).toFixed(3);
      layers.forEach(([els, d]) => els.forEach(n => { n.style.translate = `${(x * d).toFixed(2)}px ${(y * d).toFixed(2)}px`; }));
      const busy = o.idle || Math.abs(tx - x) > .002 || Math.abs(ty - y) > .002 || Math.abs(ton - on) > .01;
      if (!busy && !ton) el.style.transform = '';
      return busy;
    };
    area.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2));
      ton = 1; run(step);
    });
    area.addEventListener('pointerleave', () => { tx = 0; ty = 0; ton = 0; t0 = performance.now(); run(step); });
    if (o.idle) run(step);
  };

  // Home and About: the brief form drifts with the cursor anywhere in its section, and floats gently on its own; calmer while typing
  all('form.brief').forEach(f => {
    const sec = f.closest('section'); if (!sec) return;
    f.classList.add('drift');
    tilt(f, { area: sec, max: 9, idle: true, glare: .7, calm: () => f.contains(document.activeElement) });
    // the light inside the box follows the cursor
    f.addEventListener('pointermove', e => { const r = f.getBoundingClientRect(); f.style.setProperty('--mx', (e.clientX - r.left) + 'px'); f.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
  });

  // Ryder's profile: the photo card drifts toward the cursor while the cursor is on it, with a soft glare and glow; the grid behind the page lights up around the cursor
  all('main.rz .profile-card .portrait.big').forEach(ph => tilt(ph, { max: 9, glare: .6 }));   // still until the cursor is on the photo itself
  const lit = document.querySelector('main.rz .rz-lit');
  if (lit) {
    addEventListener('pointermove', e => { lit.style.setProperty('--lx', e.clientX + 'px'); lit.style.setProperty('--ly', e.clientY + 'px'); lit.style.setProperty('--lo', 1); }, { passive: true });
    document.addEventListener('pointerleave', () => lit.style.setProperty('--lo', 0));
  }

  // About: the founder card in full 3D (portrait pops forward, text drifts behind it)
  all('.founder').forEach(c => { tilt(c, { max: 10 }); c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); }); });

  // Portfolio: sample cards tilt, and the clip inside shifts against the card like a window

  // Pricing: one light sweeps across all six tool boxes; each box lights up by how close the cursor is, and its number floats
  all('#connections .steps, #refinement-process .steps').forEach(g => {
    const boxes = all('.sheet', g); boxes.forEach(b => b.classList.add('sweep'));
    const st = boxes.map(b => ({ b, x: 0, y: 0, tx: 0, ty: 0 }));
    const step = () => {
      let busy = false;
      st.forEach(s => {
        s.x += (s.tx - s.x) * .12; s.y += (s.ty - s.y) * .12;
        if (Math.abs(s.tx - s.x) > .03 || Math.abs(s.ty - s.y) > .03) busy = true;
        s.b.style.translate = `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px`;
      });
      return busy;
    };
    g.addEventListener('pointermove', e => {
      st.forEach(s => {
        const r = s.b.getBoundingClientRect();
        s.b.style.setProperty('--mx', (e.clientX - r.left) + 'px'); s.b.style.setProperty('--my', (e.clientY - r.top) + 'px');
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy), k = Math.max(0, 1 - d / 420);
        s.tx = dx / Math.max(1, d) * k * 7; s.ty = dy / Math.max(1, d) * k * 7 - k * 3;
      });
      g.classList.add('lit'); run(step);
    });
    g.addEventListener('pointerleave', () => { st.forEach(s => { s.tx = 0; s.ty = 0; }); g.classList.remove('lit'); run(step); });
  });
})();


// The floating chrome shape: a 144-frame turntable (rendered ahead of time, so phones get it at no cost), drawn on a canvas
// from frames decoded in advance, at a steady 30 frames a second. It only plays while on screen.
(() => {
  const k1 = document.querySelector('.g-knot.k1'), rp = document.querySelector('#selling-points .reel-pin'); if (k1 && rp) rp.prepend(k1);   // stays in view while How it works holds
  const imgs = [...document.querySelectorAll('.g-knot img')]; if (!imgs.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const base = imgs[0].getAttribute('src').replace(/knot\/000\.webp.*$/, 'ks/'), N = 144, K = 36, FPS = 30, sheets = [];
  const cvs = imgs.map((im, i) => { const c = document.createElement('canvas'); c.width = c.height = 360; c.className = 'g-knot-cv'; if (i) c.style.transform = 'scaleX(-1)'; im.after(c); return c; });
  let loading = false;
  // 144 frames packed in 4 sheets of 36 (fewer downloads); each sheet is decoded once, then frames are cut from it
  const load = () => { if (loading) return; loading = true;
    for (let k = 0; k < N / K; k++) { const im = new Image(); im.src = base + k + '.webp';
      (im.decode ? im.decode() : new Promise(r => im.onload = r)).then(() => { sheets[k] = im; }).catch(() => {}); } };
  const frames = { get: f => { const sh = sheets[Math.floor(f / K)]; return sh ? { sh, row: f % K } : null; } };
  const live = new Set(); let raf = 0, t0 = 0, last = -1;
  const tick = t => { raf = 0; if (!live.size) return; if (!t0) t0 = t;
    const f = Math.floor((t - t0) / 1000 * FPS) % N;
    if (f !== last) { let k = f; while (k > 0 && !frames.get(k)) k--; const fr = frames.get(k);
      if (fr) { live.forEach(c => { const g = c.getContext('2d'); g.clearRect(0, 0, 360, 360); g.drawImage(fr.sh, 0, fr.row * 360, 360, 360, 0, 0, 360, 360); c.classList.add('on'); }); last = f; } }
    raf = requestAnimationFrame(tick); };
  const io = new IntersectionObserver(es => es.forEach(e => { const c = e.target.parentNode.querySelector('.g-knot-cv'); if (e.isIntersecting) { load(); live.add(c); } else live.delete(c); if (live.size && !raf) raf = requestAnimationFrame(tick); }), { rootMargin: '200px' });
  imgs.forEach(im => io.observe(im));
})();
