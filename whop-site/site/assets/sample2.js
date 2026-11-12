// Kulman Ziman sample sites, v3 engine: always open at the top, the logo stage, menu, reveals, toasts.
// The stage exposes CSS variables that each page's CSS uses to animate its own logo:
//   --i  intro, 0 -> 1 over the first moment after the page opens
//   --p  scroll progress through the stage, 0 -> 1
//   --a  first phase (0 -> 1 over the first ~40%), --b second phase, --c the headline reveal
//   --mx --my  pointer position, -0.5 .. 0.5 (eased)
(() => {
  // open at the very top, every time (no restored scroll position)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) { scrollTo(0, 0); addEventListener('load', () => scrollTo(0, 0)); }
  // ...also when the browser brings the page back from its memory (tapping the sample again after going back)
  addEventListener('pageshow', e => { if (e.persisted && !location.hash) { scrollTo(0, 0); location.reload(); } });

  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
  const root = document.documentElement;
  root.classList.add('js');

  // menu
  const burger = $('.burger');
  burger && burger.addEventListener('click', () => { const o = document.body.classList.toggle('menu-open'); burger.setAttribute('aria-expanded', o); });
  $$('.drawer a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));
  addEventListener('scroll', () => document.body.classList.toggle('stuck', scrollY > 10), { passive: true });

  // toast + sample forms (nothing is sent)
  const toast = msg => { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); };
  $$('form').forEach(f => f.addEventListener('submit', e => { if (e.defaultPrevented) return; e.preventDefault(); toast('This is a sample site, so nothing was sent.'); f.reset(); }));
  $$('[data-toast]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); toast(b.dataset.toast); }));

  // reveals
  $$('[data-stagger]').forEach(g => [...g.children].forEach((c, i) => { c.classList.add('rv'); c.style.setProperty('--d', (i * .08) + 's'); }));
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.rv').forEach(el => io.observe(el));
  } else $$('.rv').forEach(el => el.classList.add('in'));

  // ---------- the stage ----------
  const stage = $('.stage');
  if (!stage) return;
  const pin = $('.pin', stage), copy = $('.copy', stage);
  if (reduce) { root.classList.add('no-stage'); stage.style.cssText += ';--i:1;--p:1;--a:1;--b:1;--c:1'; return; }
  const navH = () => parseFloat(getComputedStyle(pin).top) || 0;
  let nh = navH(), target = 0, prog = 0, mx = 0, my = 0, tmx = 0, tmy = 0, running = false, last = 0;
  let t0 = performance.now(); const INTRO = 1600;
  const HOLD = parseFloat(stage.dataset.hold) || .86;
  // where one scroll gesture stops (smooth.js): right after the opening animation, with the headline fully in.
  // Pages set data-stop to the point on their timeline where that happens.
  const STOP = Math.min(HOLD, parseFloat(stage.dataset.stop) || .76);
  let lastMb = null, VH = innerHeight;   // screen height, kept steady while a phone's address bar slides in and out
  const read = () => {
    const r = stage.getBoundingClientRect(), range = Math.max(1, r.height - (VH - nh));
    target = clamp((nh - r.top) / range);
    // after the reveal, the scene speeds up gradually into normal scrolling (no jolt at the hand-off)
    const H = (1 - HOLD) * range, h = clamp(target - HOLD, 0, 1 - HOLD) * range;
    // from the stop at the headline, the scene moves exactly with the page: no slow or dead scroll at all
    const Rm = 0, f = h;
    pin.style.transform = h > 0 ? `translate3d(0,${(-f).toFixed(1)}px,0)` : '';
    // the next section follows right behind the headline (no empty band)
    const mb = Math.round(Rm / 2 - H); if (mb !== lastMb) { lastMb = mb; stage.style.marginBottom = mb + 'px'; }
    stage.dataset.stopY = Math.round(scrollY + r.top - nh + STOP * range); stage.dataset.stopUp = '1';   // also stops here on the way back up
    kick();
  };
  addEventListener('scroll', read, { passive: true });
  stage.__refreshStop = read;                                   // smooth.js asks for a fresh stop point before every wheel step
  if (window.ResizeObserver) new ResizeObserver(read).observe(stage);   // e.g. the 3D version makes the stage taller after it loads
  let lw = innerWidth; addEventListener('resize', () => { if (innerWidth !== lw || Math.abs(innerHeight - VH) > (matchMedia('(hover: hover) and (pointer: fine)').matches ? 0 : 160)) { lw = innerWidth; VH = innerHeight; nh = navH(); read(); } });
  addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; kick(); }, { passive: true });
  // phones: a gentle tilt follows the device instead of a cursor (only where allowed without a prompt)
  addEventListener('deviceorientation', e => { if (e.gamma == null) return; tmx = clamp(e.gamma / 60, -.5, .5); tmy = clamp((e.beta - 45) / 90, -.5, .5); kick(); }, { passive: true });
  let onScreen = true;
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; if (onScreen) kick(); }).observe(stage);
  const set = (k, v) => stage.style.setProperty(k, v);
  const kick = () => { if (!running && onScreen) { running = true; last = 0; requestAnimationFrame(frame); } };
  function frame(now) {
    const dt = last ? now - last : 16.7; last = now;
    const f = Math.max(1, dt / 16.7), k1 = 1 - Math.pow(.62, f), k2 = 1 - Math.pow(.92, f);
    prog += (target - prog) * k1; mx += (tmx - mx) * k2; my += (tmy - my) * k2;
    const i = smooth((now - t0) / INTRO), p = prog;
    set('--i', i.toFixed(4)); set('--p', p.toFixed(4));
    set('--a', smooth(p / .42).toFixed(4)); set('--b', smooth((p - .36) / .36).toFixed(4));
    const c = smooth((p - .5) / .26); set('--c', c.toFixed(4)); copy && copy.classList.toggle('live', c > .6);
    set('--mx', mx.toFixed(4)); set('--my', my.toFixed(4));
    if (i < 1 || Math.abs(target - prog) > .0004 || Math.abs(tmx - mx) > .001 || Math.abs(tmy - my) > .001) requestAnimationFrame(frame); else running = false;
  }
  read(); prog = target; kick();

  // the top-left logo replays the opening, like the Kulman Ziman logo does on the main site: a frame closes in,
  // the logo pops up in a badge, and the page opens again from the top with its animation
  const brand = $('.nav .brand');
  brand && brand.addEventListener('click', e => {
    e.preventDefault();
    if ($('.sx-intro')) return;
    const ov = document.createElement('div'); ov.className = 'sx-intro'; ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML = '<div class="sx-frame"></div><div class="sx-fill"></div><div class="sx-badge"></div>';
    const logo = brand.querySelector('svg'); if (logo) ov.querySelector('.sx-badge').appendChild(logo.cloneNode(true));
    document.body.appendChild(ov);
    setTimeout(() => { scrollTo({ top: 0, behavior: 'instant' }); read(); prog = target; t0 = performance.now(); kick(); }, 1050);
    setTimeout(() => ov.remove(), 2450);
  });
})();
