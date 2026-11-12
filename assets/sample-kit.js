// Ziman Sites sample-site kit (v2): menu, progress bar, soft reveals, clean heading lines, count-ups,
// pinned story, horizontal showcase, gentle tilt and magnetic buttons. Respects reduced motion and touch.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // progress bar + stuck header
  const bar = document.createElement('div'); bar.className = 'kp'; bar.setAttribute('aria-hidden', 'true'); document.body.append(bar);

  // hero: a 'scroll down & dive in' pill that jumps to the first section
  { const hero = $('.hero'), next = $('main section.sec[id]');
    if (hero) { const a = document.createElement('a'); a.className = 'dive-pill'; a.href = '#' + ((next && next.id) || 'top');
      a.innerHTML = '<span>Scroll down<br>&amp; dive in</span><i aria-hidden="true">↓</i>'; hero.append(a); } }

  // hero 3D: a hint that it can be played with, which fades after the first touch
  { const h = $('.h3d'); if (h && !reduce) { const hint = document.createElement('span'); hint.className = 'spin-hint';
      hint.innerHTML = '<i aria-hidden="true"></i>Drag to spin · tap to play'; h.append(hint);
      h.addEventListener('kz-touched', () => hint.classList.add('gone'), { once: true }); setTimeout(() => hint.classList.add('gone'), 9000); } }

  // menu (phones)
  const burger = $('.burger');
  burger && burger.addEventListener('click', () => { const open = document.body.classList.toggle('menu-open'); burger.setAttribute('aria-expanded', open); });
  $$('.drawer a').forEach(a => a.addEventListener('click', () => { document.body.classList.remove('menu-open'); burger && burger.setAttribute('aria-expanded', false); }));

  // toast + sample forms (nothing is sent anywhere)
  const toast = msg => { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); };
  $$('form').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); toast('This is a sample site, so nothing was sent.'); f.reset(); }));
  $$('[data-toast]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); toast(b.dataset.toast); }));

  // pricing toggle: [data-price-m] / [data-price-y]
  $$('.toggle').forEach(tg => { const btns = $$('button', tg);
    btns.forEach(b => b.addEventListener('click', () => { btns.forEach(o => o.setAttribute('aria-pressed', o === b));
      const y = b.dataset.period === 'y'; $$('[data-price-m]').forEach(p => { p.firstChild.textContent = y ? p.dataset.priceY : p.dataset.priceM; }); })); });

  // marquee: duplicate the run so it loops
  $$('.lrow > div').forEach(t => { t.innerHTML += t.innerHTML; t.lastElementChild && [...t.children].slice(t.children.length / 2).forEach(c => c.setAttribute('aria-hidden', 'true')); });

  // headings get one clean line reveal
  $$('.sec h2, .band h2').forEach(h => { const inner = document.createElement('span'); while (h.firstChild) inner.append(h.firstChild);
    const lm = document.createElement('span'); lm.className = 'lm'; lm.append(inner); h.append(lm); });

  // reveal groups: children rise in sequence
  $$('[data-stagger]').forEach(g => [...g.children].forEach((c, i) => { c.classList.add('rv'); c.style.setProperty('--d', (i * .08) + 's'); }));
  $$('.sec .k, .sec .lede, .head > p, .band > :not(h2), .split > *, .faq-grid > :first-child').forEach(el => { if (!el.closest('.rv')) el.classList.add('rv'); });

  const count = el => {
    if (el._done) return; el._done = true;
    const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    if (reduce) { el.textContent = end.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }); return; }
    const t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / 1800), e = 1 - Math.pow(1 - k, 4);
      el.textContent = (end * e).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  if (!reduce && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('kit');
    const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return;
      e.target.classList.add('in'); $$('[data-count]', e.target).forEach(count); io.unobserve(e.target); }), { rootMargin: '0px 0px -10% 0px' });
    $$('.rv, .lm, .bar, .stats').forEach(el => io.observe(el));
    const sweep = () => $$('.rv:not(.in), .lm:not(.in)').forEach(el => { if (el.getBoundingClientRect().top < innerHeight * .92) { el.classList.add('in'); $$('[data-count]', el).forEach(count); } });
    setTimeout(sweep, 2500);
  } else { $$('.bar').forEach(b => b.classList.add('in')); $$('[data-count]').forEach(count); }


  // labels decode like a terminal when they first appear
  const decode = el => {
    if (el._dec || el.children.length || reduce) return; el._dec = true;
    const final = el.textContent, G = '01<>/\\[]{}#=+*_-:', N = 26; let f = 0;
    el.setAttribute('aria-label', final);
    const tick = () => { const k = f / N;
      el.textContent = [...final].map((c, i) => c === ' ' || i / final.length < k ? c : G[(Math.random() * G.length) | 0]).join('');
      if (f++ < N) requestAnimationFrame(tick); else { el.textContent = final; el.removeAttribute('aria-label'); } };
    tick();
  };
  if ('IntersectionObserver' in window && !reduce) {
    const dio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { decode(e.target); dio.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('.k, .hs-meta span, .pill').forEach(el => dio.observe(el));
  }

  // pinned story: the step in the middle of the screen picks the scene
  $$('.story').forEach(st => {
    const steps = $$('.story-step', st), scenes = $$('.story-media .scene', st);
    const pick = () => { let best = 0, bd = 1e9; steps.forEach((s, i) => { const r = s.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - innerHeight / 2); if (d < bd) { bd = d; best = i; } });
      steps.forEach((s, i) => s.classList.toggle('on', i === best)); scenes.forEach((s, i) => s.classList.toggle('on', i === best)); };
    addEventListener('scroll', pick, { passive: true }); pick();
  });

  // horizontal showcase: vertical scroll moves the track sideways while the section is pinned
  const hs = $$('.hs');
  const sizeHs = () => hs.forEach(s => { const track = $('.hs-track', s);
    if (reduce || innerWidth <= 860) { s.style.height = ''; s._dist = 0; return; }
    s._dist = Math.max(0, track.scrollWidth - innerWidth); s.style.height = (innerHeight + s._dist) + 'px'; });
  const realResize = (() => { let w = innerWidth, h = innerHeight; return () => { const W = innerWidth, H = innerHeight; if (W === w && Math.abs(H - h) < Math.max(160, h * .25)) return false; w = W; h = H; return true; }; })();
  addEventListener('resize', () => { if (realResize()) sizeHs(); }); sizeHs(); document.fonts && document.fonts.ready.then(sizeHs);

  // parallax for [data-par], closing band glow, chips in the hero
  const pars = $$('[data-par]'), band = $('.band');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? scrollY / max : 0);
    document.body.classList.toggle('stuck', scrollY > 30);
    hs.forEach(s => { if (!s._dist) return; const r = s.getBoundingClientRect(), p = clamp(-r.top / s._dist);
      $('.hs-track', s).style.transform = `translate3d(${-p * s._dist}px,0,0)`; const pr = $('.hs-progress', s); pr && pr.style.setProperty('--hp', p); });
    if (reduce) return;
    pars.forEach(el => { const r = el.getBoundingClientRect(), c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; el.style.transform = `translate3d(0,${c * parseFloat(el.dataset.par) * -100}px,0)`; });
    if (band) { const r = band.getBoundingClientRect(); band.style.setProperty('--bp', clamp(1 - r.top / innerHeight)); }
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  if (!fine || reduce) return;
  // gentle tilt toward the cursor, with a soft sheen
  $$('.tilt').forEach(c => {
    c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--rx', ((.5 - y) * 6).toFixed(2) + 'deg'); c.style.setProperty('--ry', ((x - .5) * 7).toFixed(2) + 'deg');
      c.style.setProperty('--gx', (x * 100) + '%'); c.style.setProperty('--gy', (y * 100) + '%'); });
    c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
  });
  // buttons lean toward the cursor a little
  $$('.btn').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * .18).toFixed(1) + 'px'); b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * .25).toFixed(1) + 'px'); });
    b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
  });
  // hero chips drift with the pointer at different depths
  const chips = $$('.h3d .chip');
  if (chips.length) addEventListener('pointermove', e => { const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    chips.forEach((c, i) => { const d = 10 + (i % 3) * 8; c.style.transform = `translate3d(${x * d}px,${y * d}px,0)`; }); }, { passive: true });
})();
