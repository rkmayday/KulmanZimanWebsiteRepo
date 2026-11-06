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
    const upd = () => { $('#refs-n').textContent = r.value; $('#refs-out').textContent = '$' + (r.value * 60).toLocaleString(); };
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

  // Project brief: turns the "contact us before you pay" step into a 30-second form that opens a pre-filled email
  const brief = $('#brief');
  brief && brief.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(brief);
    const body = [
      `Name: ${f.get('name')}`, `Business: ${f.get('business')}`, `Industry: ${f.get('industry')}`,
      `Domain I'd like: ${f.get('domain') || 'Not sure yet'}`, '', 'What I need:', f.get('details')
    ].join('\n');
    window.kzGmail('info.kulmanziman@gmail.com', 'Website brief — ' + (f.get('business') || f.get('name')), body);
    toast('Opening Gmail…');
  });

  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
