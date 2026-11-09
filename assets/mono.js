// Kulman Ziman "Mono" theme. The one big interactive moment: the KZ logo stage on the home page.
// A solid 3D KZ (stacked layers) turns as you scroll, then the K and the Z slide apart to reveal the headline.
// Everything else on the site stays calm. Respects reduced motion.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };

  // thin reading-progress line
  const bar = $('.progress');
  let barRaf = 0;
  const onBar = () => { barRaf = 0; const max = document.documentElement.scrollHeight - innerHeight; bar && bar.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0); };
  addEventListener('scroll', () => { if (!barRaf) barRaf = requestAnimationFrame(onBar); }, { passive: true }); onBar();

  const stage = $('.kz-stage');
  if (!stage) return;
  const logo = $('.kz-logo', stage), copy = $('.kz-copy', stage), word = $('.kz-word', stage), grid = $('.kz-grid', stage), cue = $('.kz-cue', stage);

  // the headline, text and buttons live in the page's hero; move them into the stage (one copy of the content)
  const heroCopy = $('.hero .hero-copy'), heroTags = $('.hero .hero-tags');
  if (heroCopy) [...heroCopy.children].forEach(n => copy.append(n));
  if (heroTags) copy.append(heroTags);

  // build the solid logo: a stack of logo-shaped layers, black on the front and lighter toward the back
  const phone = matchMedia('(max-width: 720px)').matches;
  const N = reduce ? 1 : (phone ? 18 : 30);
  const fronts = [];
  const build = half => {
    for (let i = N - 1; i >= 0; i--) {
      const l = document.createElement('div'); l.className = 'kz-layer' + (i === 0 ? ' front' : '');
      const k = i / Math.max(1, N - 1);
      const c = Math.round(26 + k * 120);                       // #1a1a1a .. #929292
      l.style.setProperty('--c', i === 0 ? '#0a0a0a' : `rgb(${c},${c},${c})`);
      l.dataset.i = i; half.append(l); if (!i) fronts.push(l);
    }
  };
  build($('.kz-k', stage)); build($('.kz-z', stage));
  const depth = () => logo.offsetWidth * (phone ? .06 : .075);
  const setDepth = () => { const d = depth(); stage.querySelectorAll('.kz-layer').forEach(l => l.style.setProperty('--z', (-(+l.dataset.i) * d / Math.max(1, N - 1)).toFixed(2) + 'px')); };
  setDepth();
  let lastW = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; setDepth(); } });

  if (reduce) { document.documentElement.classList.add('no-kz'); return; }

  // scroll + pointer drive the scene
  let target = 0, prog = 0, px = 0, py = 0, tpx = 0, tpy = 0, running = false;
  const readScroll = () => { const r = stage.getBoundingClientRect(); target = clamp(-r.top / Math.max(1, r.height - innerHeight)); kick(); };
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; tpx = e.clientX / innerWidth - .5; tpy = e.clientY / innerHeight - .5; kick(); }, { passive: true });

  const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
  function frame() {
    prog += (target - prog) * .14; px += (tpx - px) * .08; py += (tpy - py) * .08;
    const p = prog;
    const a = smooth(p / .42);                    // turn: shows the depth
    const b = smooth((p - .36) / .38);            // split: K and Z slide apart
    const ry = -24 + a * 44 - b * 20 + px * 14;
    const rx = 12 - a * 16 + b * 4 - py * 10;
    const spread = innerWidth * (phone ? .62 : .45);
    logo.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    logo.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    logo.style.setProperty('--ls', (1 - b * .3).toFixed(4));
    logo.style.setProperty('--ly', (-b * 24).toFixed(1) + 'px');
    logo.style.setProperty('--kx', (-b * spread).toFixed(1) + 'px');
    logo.style.setProperty('--zx', (b * spread).toFixed(1) + 'px');
    logo.style.setProperty('--ho', (1 - smooth(b * 1.6)).toFixed(3));                 // the sides fade away first
    logo.style.setProperty('--fv', Math.round(10 + b * 218));                         // the face turns light grey, staying crisp
    fronts.forEach(f => f.style.setProperty('--sx', (25 + a * 45 + px * 25).toFixed(1) + '%'));
    // the name spells out under the logo, then makes room
    word.style.setProperty('--wl', (1.2 - a * .8).toFixed(3) + 'em');
    word.style.setProperty('--wo', (1 - smooth((p - .28) / .14)).toFixed(3));
    cue.style.setProperty('--co', (1 - smooth(p / .06)).toFixed(3));
    grid.style.setProperty('--gy', (-p * 140).toFixed(1) + 'px');
    // the headline rises into the gap
    const o = smooth((p - .5) / .24);
    copy.style.setProperty('--o2', o.toFixed(3));
    copy.style.setProperty('--y2', ((1 - o) * 40).toFixed(1) + 'px');
    copy.classList.toggle('live', o > .6);
    if (Math.abs(target - prog) > .0005 || Math.abs(tpx - px) > .001 || Math.abs(tpy - py) > .001) requestAnimationFrame(frame); else running = false;
  }
  readScroll(); prog = target; frame();
})();
