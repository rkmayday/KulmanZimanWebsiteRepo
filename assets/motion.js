// Kulman Ziman — interactive / moving pieces. Everything degrades gracefully and
// respects prefers-reduced-motion. No dependencies.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- 1. Reading progress bar ---------- */
  const bar = $('.progress');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar && bar.style.setProperty('--p', max > 0 ? scrollY / max : 0);
    words(); rail();
  };

  /* ---------- 2. Mission quote: words light up with scroll ---------- */
  const quote = $('.words');
  let wordEls = [];
  if (quote) {
    const cite = quote.querySelector('cite');
    const text = quote.firstChild.textContent;
    quote.firstChild.remove();
    const frag = document.createDocumentFragment();
    text.split(/(\s+)/).forEach(t => {
      if (/^\s+$/.test(t)) return frag.append(t);
      const s = document.createElement('span'); s.className = 'w'; s.textContent = t; frag.append(s);
    });
    quote.insertBefore(frag, cite);
    wordEls = $$('.w', quote);
    if (reduce) wordEls.forEach(w => w.classList.add('on'));
  }
  function words() {
    if (!wordEls.length || reduce) return;
    const r = quote.getBoundingClientRect();
    const t = clamp((innerHeight * .85 - r.top) / (r.height + innerHeight * .35), 0, 1);
    const n = Math.round(t * wordEls.length);
    wordEls.forEach((w, i) => w.classList.toggle('on', i < n));
  }

  /* ---------- 3. Process rail fills as you scroll past the steps ---------- */
  const steps = $('.steps.has-rail');
  function rail() {
    if (!steps) return;
    const r = steps.getBoundingClientRect();
    const t = clamp((innerHeight * .8 - r.top) / (r.height + innerHeight * .2), 0, 1);
    steps.style.setProperty('--rp', reduce ? 1 : t);
    $$('.sheet', steps).forEach((s, i, all) => s.classList.toggle('lit', t >= (i + .5) / all.length || reduce));
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll); onScroll();

  /* ---------- 4. Count-up numbers ---------- */
  const counters = $$('[data-count]');
  const count = el => {
    const end = +el.dataset.count, dur = 1400, t0 = performance.now();
    const step = now => {
      const k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 4);
      el.textContent = Math.round(end * e).toLocaleString();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { count(e.target); io.unobserve(e.target); } }), { threshold: .6 });
    counters.forEach(c => { c.textContent = '0'; io.observe(c); });
  }

  /* ---------- 5. Live data on the hero laptop ---------- */
  const kg = $('[data-live-kg]'), bars = $$('[data-live-bars] i');
  if (kg && !reduce) {
    let v = 12480;
    setInterval(() => {
      v += Math.round(40 + Math.random() * 160);
      kg.textContent = v.toLocaleString() + ' kg';
      bars.forEach((b, i) => { b.style.height = clamp(30 + i * 9 + (Math.random() * 24 - 12), 18, 100) + '%'; b.style.transition = 'height .9s cubic-bezier(.2,.7,.2,1)'; });
    }, 2200);
  }

  /* ---------- 6. Draggable glass cards with momentum ---------- */
  $$('.glass.drag').forEach((card, idx) => {
    if (idx === 0 && fine) { const h = document.createElement('span'); h.className = 'drag-hint'; h.textContent = 'Drag me'; card.append(h); }
    let x = 0, y = 0, vx = 0, vy = 0, sx, sy, lx, ly, lt, raf, down = false;
    const set = () => card.style.translate = `${x}px ${y}px`;
    card.addEventListener('pointerdown', e => {
      down = true; cancelAnimationFrame(raf); card.setPointerCapture(e.pointerId); card.classList.add('dragging');
      sx = e.clientX - x; sy = e.clientY - y; lx = e.clientX; ly = e.clientY; lt = performance.now();
      const hint = $('.drag-hint', card); hint && hint.remove();
    });
    card.addEventListener('pointermove', e => {
      if (!down) return;
      const now = performance.now(), dt = Math.max(1, now - lt);
      vx = (e.clientX - lx) / dt * 16; vy = (e.clientY - ly) / dt * 16; lx = e.clientX; ly = e.clientY; lt = now;
      x = e.clientX - sx; y = e.clientY - sy; set();
    });
    const release = () => {
      if (!down) return; down = false; card.classList.remove('dragging');
      // glide with friction, then spring home
      const glide = () => {
        vx *= .92; vy *= .92; x += vx; y += vy;
        if (Math.abs(vx) + Math.abs(vy) > .4) { set(); raf = requestAnimationFrame(glide); }
        else spring();
      };
      const spring = () => {
        let svx = 0, svy = 0;
        const tick = () => {
          svx = (svx - x * .06) * .82; svy = (svy - y * .06) * .82; x += svx; y += svy; set();
          if (Math.abs(x) + Math.abs(y) + Math.abs(svx) + Math.abs(svy) > .3) raf = requestAnimationFrame(tick);
          else { x = y = 0; set(); }
        };
        setTimeout(() => { raf = requestAnimationFrame(tick); }, 900);
      };
      reduce ? (x = y = 0, set()) : glide();
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
  });

  if (!fine || reduce) { playground(); coins(); return; }

  /* ---------- 7. Magnetic buttons ---------- */
  $$('.btn').forEach(b => {
    b.classList.add('mag');
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / r.width, dy = (e.clientY - r.top - r.height / 2) / r.height;
      b.style.transform = `translate(${dx * 10}px, ${dy * 8}px)`;
    });
    b.addEventListener('pointerleave', () => b.style.transform = '');
  });

  /* ---------- 8. 3D tilt + moving glare on cards ---------- */
  $$('.product, .founder, .stat, .box, .calc, .sheet, .b-cards div').forEach(el => {
    el.classList.add('tilt');
    const g = document.createElement('span'); g.className = 'glare'; el.append(g);
    const max = el.matches('.product, .calc') ? 4 : 8;
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.transition = 'transform .08s linear';
      el.style.transform = `perspective(1000px) rotateY(${(px - .5) * max}deg) rotateX(${(.5 - py) * max}deg) translateY(-4px)`;
      el.style.setProperty('--gx', px * 100 + '%'); el.style.setProperty('--gy', py * 100 + '%');
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .6s cubic-bezier(.2,.7,.2,1)';
      el.style.transform = ''; // back to the stylesheet transform (keeps the sheets' paper rotation)
    });
  });

  /* ---------- 9. Spotlight on dark sections ---------- */
  $$('.proof, .cta-final, .strip').forEach(s => {
    s.classList.add('spot');
    s.addEventListener('pointermove', e => {
      const r = s.getBoundingClientRect();
      s.style.setProperty('--sx', e.clientX - r.left + 'px'); s.style.setProperty('--sy', e.clientY - r.top + 'px');
    });
  });

  /* ---------- 10. Hero parallax depth: each layer moves a different amount ---------- */
  const layers = [['.laptop', 10], ['.phone', 26], ['.mug', 18], ['.leaf-shadow', -24], ['.blinds', -14]]
    .map(([s, d]) => [$(s), d]).filter(([el]) => el);
  let tx = 0, ty = 0, cx = 0, cy = 0;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; });
  (function loop() {
    cx += (tx - cx) * .06; cy += (ty - cy) * .06;
    if (scrollY < innerHeight) layers.forEach(([el, d]) => { el.style.translate = `${(cx * d).toFixed(2)}px ${(cy * d).toFixed(2)}px`; });
    requestAnimationFrame(loop);
  })();

  playground(); coins();

  /* ---------- 11. Homepage playground ---------- */
  function playground() {
    const form = $('#play'); if (!form) return;
    const P = $('#preview');
    const presets = {
      fitness: { kicker: 'Personal training & classes', p: 'Small-group classes and coaching that fit around your life.', links: 'Classes · Coaches · Join', cta: 'Start free week', cards: ['Strength', 'Conditioning', 'Mobility'], shape: 'bars' },
      tech: { kicker: 'Software for growing teams', p: 'Ship faster with tools that connect everything your team already uses.', links: 'Product · Pricing · Docs', cta: 'Start free trial', cards: ['Integrations', 'Analytics', 'Security'], shape: 'grid' },
      local: { kicker: 'Serving your neighbourhood', p: 'Reliable, friendly service with upfront quotes and on-time arrivals.', links: 'Services · Areas · Reviews', cta: 'Get a quote', cards: ['Repairs', 'Installs', 'Emergencies'], shape: 'house' },
      creator: { kicker: 'Courses, coaching & community', p: 'Learn the skills, join the community, and build something of your own.', links: 'Courses · About · Newsletter', cta: 'Join the course', cards: ['Lessons', 'Coaching', 'Community'], shape: 'orbs' }
    };
    const shapes = {
      bars: [[8, 70, 12, 22], [26, 52, 12, 40], [44, 38, 12, 54], [62, 24, 12, 68], [80, 12, 12, 80], [0, 0, 0, 0]],
      grid: [[10, 10, 36, 36], [54, 10, 36, 36], [10, 54, 36, 36], [54, 54, 36, 16], [54, 74, 36, 16], [0, 0, 0, 0]],
      house: [[20, 44, 60, 46], [30, 20, 40, 24], [42, 62, 16, 28], [24, 52, 12, 12], [64, 52, 12, 12], [8, 90, 84, 4]],
      orbs: [[14, 18, 40, 40], [50, 46, 36, 36], [22, 64, 20, 20], [70, 16, 14, 14], [8, 50, 8, 8], [60, 84, 8, 8]]
    };
    const el = id => $('#' + id);
    let typed = null;
    const typeInto = (node, text) => {
      clearTimeout(typed); if (reduce) { node.textContent = text; return; }
      node.classList.add('caret'); let i = node.textContent.length;
      // backspace to common prefix, then type
      let common = 0; while (common < text.length && node.textContent[common] === text[common]) common++;
      const back = () => { if (node.textContent.length > common) { node.textContent = node.textContent.slice(0, -1); typed = setTimeout(back, 18); } else fwd(); };
      const fwd = () => { if (node.textContent.length < text.length) { node.textContent = text.slice(0, node.textContent.length + 1); typed = setTimeout(fwd, 34); } else setTimeout(() => node.classList.remove('caret'), 900); };
      back();
    };
    const render = (flash) => {
      const f = new FormData(form);
      const name = (f.get('name') || 'Your Business').trim() || 'Your Business';
      const pr = presets[f.get('ind')];
      P.classList.toggle('light', f.get('mode') === 'light');
      P.classList.toggle('sans', f.get('font') === 'sans');
      P.style.setProperty('--acc', form.dataset.custom ? f.get('custom') : f.get('accent'));
      el('pv-logo').textContent = name;
      el('pv-url').textContent = name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'yourbusiness';
      el('pv-kicker').textContent = pr.kicker; el('pv-p').textContent = pr.p; el('pv-links').textContent = pr.links; el('pv-cta').textContent = pr.cta;
      $$('#pv-cards span').forEach((s, i) => s.textContent = pr.cards[i]);
      $$('#pv-visual i').forEach((b, i) => { const [l, t, w, h] = shapes[pr.shape][i]; Object.assign(b.style, { left: l + '%', top: t + '%', width: w + '%', height: h + '%', opacity: w ? (i % 2 ? .55 : 1) : 0, borderRadius: pr.shape === 'orbs' ? '50%' : '10px' }); });
      if (flash && !reduce) { P.classList.remove('flash'); void P.offsetWidth; P.classList.add('flash'); }
    };
    form.addEventListener('input', e => {
      if (e.target.name === 'headline') typeInto(el('pv-h'), e.target.value || 'Your headline here.');
      if (e.target.name === 'custom') { $$('[name=accent]', form).forEach(x => { x.checked = false; }); form.dataset.custom = '1'; }
      if (e.target.name === 'accent') delete form.dataset.custom;
      render(e.target.type === 'radio' || e.target.type === 'color');
    });
    $('#play-shuffle').addEventListener('click', () => {
      const pick = a => a[Math.floor(Math.random() * a.length)];
      const heads = { fitness: ['Stronger every week.', 'Train smarter, not longer.', 'Your best shape starts here.'], tech: ['Software that just works.', 'Less busywork. More building.', 'Your stack, finally connected.'], local: ['Fixed right, the first time.', 'Your neighbours already trust us.', 'Quality work, honest prices.'], creator: ['Learn it. Make it. Share it.', 'Turn what you know into a course.', 'Build an audience that cares.'] };
      const ind = pick(Object.keys(presets));
      form.querySelector(`[name=ind][value=${ind}]`).checked = true;
      pick($$('[name=accent]', form)).checked = true; delete form.dataset.custom;
      pick($$('[name=font]', form)).checked = true; pick($$('[name=mode]', form)).checked = true;
      const h = pick(heads[ind]); form.headline.value = h; typeInto(el('pv-h'), h);
      render(true);
    });
    $('#play-send').addEventListener('click', () => {
      const f = new FormData(form);
      const body = `Hi Kulman Ziman,\n\nI sketched this on your site:\n\nBusiness: ${f.get('name')}\nHeadline: ${f.get('headline')}\nIndustry: ${f.get('ind')}\nAccent colour: ${form.dataset.custom ? f.get('custom') : f.get('accent')}\nType: ${f.get('font') === 'sans' ? 'Modern' : 'Classic'}\nMode: ${f.get('mode')}\n\nMore about what I need:\n`;
      location.href = `mailto:info.kulmanziman@gmail.com?subject=${encodeURIComponent('Website sketch — ' + f.get('name'))}&body=${encodeURIComponent(body)}`;
    });
    render(false);
  }

  /* ---------- 12. Affiliate coin stack ---------- */
  function coins() {
    const r = $('#refs'), c = $('#coins'); if (!r || !c) return;
    const draw = () => {
      const n = +r.value, have = c.children.length;
      for (let i = have; i < n; i++) { const k = document.createElement('i'); k.style.bottom = (i * 3.4) + 'px'; k.style.animationDelay = ((i - have) * 30) + 'ms'; k.style.translate = ((i * 37) % 7 - 3) + 'px 0'; c.append(k); }
      while (c.children.length > n) c.lastChild.remove();
    };
    r.addEventListener('input', draw); draw();
  }
})();
