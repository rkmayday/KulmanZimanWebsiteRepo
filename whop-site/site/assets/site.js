// Kulman Ziman — small, dependency-free enhancements. The site works without this file.
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
      const r = await fetch('https://formsubmit.co/ajax/info.kulmanziman@gmail.com', {
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
      const to = 'info.kulmanziman@gmail.com', body = [`Name: ${g('name')}`, `Email: ${g('email')}`, `Business: ${g('business')}`, `Industry: ${g('industry')}`,
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

  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
