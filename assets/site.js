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
    const brand = !!a.closest('.nav .brand');
    if (!brand && u.pathname === location.pathname && u.hash) return;   // in-page section jumps
    try { sessionStorage.setItem('kz-from', brand ? 'brand' : 'link'); } catch (err) {}
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

  // portfolio clips: all four have the same length and timeline, so they start together and loop in sync;
  // they play only while on screen, and reduced motion keeps the still picture (the poster)
  const clips = $$('video[data-autoplay]');
  if (clips.length && !reduce && 'IntersectionObserver' in window) {
    const seen = new Set(); let playing = false;
    const startAll = () => {
      playing = true;
      clips.forEach(v => { v.preload = 'auto'; try { v.currentTime = 0; } catch (e) {} });
      clips.forEach(v => { const pr = v.play(); pr && pr.catch(() => {}); });
    };
    const stopAll = () => { playing = false; clips.forEach(v => v.pause()); };
    const vio = new IntersectionObserver(es => {
      es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target));
      if (seen.size && !playing) startAll(); else if (!seen.size && playing) stopAll();
    }, { threshold: .2 });
    clips.forEach(v => vio.observe(v));
    // keep them together: every so often, nudge any clip that has drifted back to the first one's time
    setInterval(() => {
      if (!playing) return; const lead = clips[0], t = lead.currentTime;
      clips.forEach(v => { if (v !== lead && !v.paused && Math.abs(v.currentTime - t) > .08) v.currentTime = t; });
    }, 1000);
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

  // ---------- portfolio: before and after slider ----------
  const cmp = $('.cmp');
  if (cmp) {
    const line = $('.cmp-line', cmp), vid = $('.cmp-after', cmp);
    const TEMPLATE = {
      ironpath: ['Ironpath', 'Welcome to Ironpath', 'We are a gym in your area. We offer many services. Contact us today for more information.'],
      synthra: ['Synthra', 'Welcome to Synthra', 'We are a technology company. We provide IT solutions for businesses. Contact us today to learn more.'],
      'ember-roast': ['Ember Roast', 'Welcome to Ember Roast', 'We are a coffee shop. We sell coffee and other drinks. Come visit us today.'],
      deduction: ['Deduction', 'Welcome to Deduction', 'We offer online coding courses. Sign up today to start learning.']
    };
    let x = 50, dragging = false;
    const set = v => {
      x = Math.max(0, Math.min(100, v)); cmp.style.setProperty('--x', x + '%'); line.setAttribute('aria-valuenow', Math.round(x));
      cmp.toggleAttribute('data-x-low', x < 22); cmp.toggleAttribute('data-x-high', x > 78);
    };
    const fromEvent = e => { const r = cmp.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    cmp.addEventListener('pointerdown', e => {
      if (e.button) return; dragging = true; cmp.classList.add('dragging'); fromEvent(e);
      if (e.pointerType === 'mouse') cmp.setPointerCapture(e.pointerId);
    });
    cmp.addEventListener('pointermove', e => { if (dragging) fromEvent(e); });
    // on touch screens, a sideways drag moves the line; scrolling up and down still scrolls the page
    let tx = 0, ty = 0, lock = '';
    cmp.addEventListener('touchstart', e => { const t = e.touches[0]; tx = t.clientX; ty = t.clientY; lock = ''; }, { passive: true });
    cmp.addEventListener('touchmove', e => {
      const t = e.touches[0];
      if (!lock) lock = Math.abs(t.clientX - tx) > Math.abs(t.clientY - ty) ? 'x' : 'y';
      if (lock === 'x') { e.preventDefault(); fromEvent(t); }
    }, { passive: false });
    const up = () => { dragging = false; cmp.classList.remove('dragging'); };
    cmp.addEventListener('pointerup', up); cmp.addEventListener('pointercancel', up); cmp.addEventListener('lostpointercapture', up);
    line.addEventListener('keydown', e => {
      const step = e.shiftKey ? 10 : 4;
      const k = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step, Home: -100, End: 100 }[e.key];
      if (k !== undefined) { e.preventDefault(); set(x + k); }
    });
    // switch sample
    $$('[data-cmp]').forEach(b => b.addEventListener('click', () => {
      const slug = b.dataset.cmp, d = TEMPLATE[slug];
      $$('[data-cmp]').forEach(o => o.setAttribute('aria-pressed', o === b));
      $('.tp-name', cmp).textContent = d[0]; $('.tp-h', cmp).textContent = d[1]; $('.tp-p', cmp).textContent = d[2];
      vid.poster = '/assets/shots/' + slug + '.jpg'; vid.src = '/assets/shots/' + slug + '.mp4?v=3';
      if (!reduce && onScreen) { const pr = vid.play(); pr && pr.catch(() => {}); }
    }));
    // the clip plays only while on screen; the first time it appears, the line sweeps once to show it can be dragged
    let onScreen = false, hinted = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => {
        onScreen = e.isIntersecting;
        if (onScreen && !reduce) { vid.preload = 'auto'; const pr = vid.play(); pr && pr.catch(() => {}); } else vid.pause();
        if (onScreen && !hinted && !reduce) {
          hinted = true; const t0 = performance.now();
          const sweep = now => {
            if (dragging) return; const k = Math.min(1, (now - t0) / 1600);
            set(50 + Math.sin(k * Math.PI * 2) * 22 * (1 - k)); if (k < 1) requestAnimationFrame(sweep);
          };
          setTimeout(() => requestAnimationFrame(sweep), 400);
        }
      }), { threshold: .4 }).observe(cmp);
    }
  }

  // ---------- page transitions ----------
  // A link to another page of this site: a black panel sweeps up over the page, then the next page opens and the
  // panel carries on up and off it (see the head script). Pop-ups, new tabs, the top-left logo (it has its own
  // opening animation) and the sample sites are left alone. Off for "reduce motion".
  if (!reduce) {
    const pt = document.createElement('div'); pt.className = 'pt'; pt.setAttribute('aria-hidden', 'true'); document.body.append(pt);
    const html = document.documentElement;
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || /^\/samples\//.test(u.pathname) || /\/get-started(\.html)?$/.test(u.pathname)) return;
      if (u.pathname === location.pathname) return;                 // same page (section links)
      if (a.closest('.nav .brand')) return;                          // the logo replays the opening instead
      e.preventDefault();
      html.classList.add('pt-out');
      try { sessionStorage.setItem('kz-pt', '1'); } catch (err) {}
      setTimeout(() => { location.href = a.href; }, 430);
      setTimeout(() => html.classList.remove('pt-out'), 4000);       // safety: never leave the page covered
    });
    // coming back with the back button (page restored from memory): uncover it
    addEventListener('pageshow', e => { if (e.persisted) { html.classList.remove('pt-out', 'pt-in'); try { sessionStorage.removeItem('kz-pt'); } catch (err) {} } });
  }

  // blend cursor: a circle that inverts whatever it is over, and grows over links and buttons.
  // Only with a real mouse or trackpad; phones, tablets and "reduce motion" keep the normal cursor.
  if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const cur = document.createElement('div'); cur.className = 'blend-cursor'; cur.setAttribute('aria-hidden', 'true');
    document.body.append(cur);
    const html = document.documentElement;
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0, on = false;
    const tick = () => {
      cx += (x - cx) * .4; cy += (y - cy) * .4;
      cur.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
      raf = Math.abs(x - cx) + Math.abs(y - cy) > .2 ? requestAnimationFrame(tick) : 0;
    };
    const show = v => { if (v !== on) { on = v; cur.classList.toggle('on', v); html.classList.toggle('blend-on', v); } };
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      if (!on) { cx = x; cy = y; show(true); }
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    const HOT = 'a,button,summary,label,select,[role=tab],[role=button],.sample,input[type=range],input[type=checkbox],input[type=radio]';
    document.addEventListener('pointerover', e => {
      const t = e.target instanceof Element ? e.target : null;
      cur.classList.toggle('big', !!(t && t.closest(HOT)));
      cur.classList.toggle('text', !!(t && t.closest('input:not([type=range]):not([type=checkbox]):not([type=radio]),textarea,[contenteditable]')));
    }, { passive: true });
    html.addEventListener('mouseleave', () => show(false));
    addEventListener('blur', () => show(false));
    addEventListener('pointerdown', () => cur.classList.add('down'), { passive: true });
    addEventListener('pointerup', () => cur.classList.remove('down'), { passive: true });
  }
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
