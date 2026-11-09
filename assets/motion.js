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

  /* ---------- 3b. Section dock with a sliding highlight (scrollspy) ---------- */
  const docked = $$('[data-dock]');
  if (docked.length >= 3) {
    const dock = document.createElement('nav');
    dock.className = 'dock'; dock.setAttribute('aria-label', 'Sections');
    const pill = document.createElement('span'); pill.className = 'pill'; pill.setAttribute('aria-hidden', 'true'); dock.append(pill);
    const links = docked.map(sec => {
      if (!sec.id) sec.id = sec.dataset.dock.toLowerCase().replace(/[^a-z]+/g, '-');
      const a = document.createElement('a'); a.href = '#' + sec.id; a.textContent = sec.dataset.dock; dock.append(a); return a;
    });
    document.body.append(dock);
    let current = -1;
    const place = i => {
      if (i === current) return; current = i;
      links.forEach((a, j) => { a.classList.toggle('on', j === i); if (j === i) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
      const a = links[i]; pill.style.width = a.offsetWidth + 'px'; pill.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    const spy = () => {
      let i = 0;
      docked.forEach((sec, j) => { if (sec.getBoundingClientRect().top < innerHeight * 0.45) i = j; });
      place(i);
    };
    // show the dock only between the hero and the footer, so it never covers the hero or the footer links
    const foot = document.querySelector('footer');
    const vis = () => { const past = scrollY > innerHeight * .6, nearFoot = foot && foot.getBoundingClientRect().top < innerHeight - 40; dock.classList.toggle('show', past && !nearFoot); };
    addEventListener('scroll', vis, { passive: true }); vis();
    addEventListener('scroll', spy, { passive: true }); addEventListener('resize', () => { current = -1; spy(); });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { current = -1; spy(); });
    spy();
  }

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
  $$('.product, .founder, .stat, .box, .calc, .sheet, .cell, .profile-card, .b-cards div').forEach(el => {
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

  /* ---------- 9. Extruded headings follow the pointer ---------- */
  const root = document.documentElement;
  if (!document.querySelector('link[href*="theme-noir"]')) addEventListener('pointermove', e => {
    root.style.setProperty('--ex', ((e.clientX / innerWidth - .5) * -3).toFixed(2));
    root.style.setProperty('--ey', ((e.clientY / innerHeight - .5) * -3 + .6).toFixed(2));
  }, { passive: true });

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
      window.kzGmail('info.kulmanziman@gmail.com', 'Website sketch — ' + f.get('name'), body);
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

/* ---------- Hero headline: letters rise in on load, then lift and fan apart as you scroll ---------- */
(() => {
  const h1 = document.querySelector('.hero h1');
  if (!h1 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
  const letters = [];
  const splitText = (textNode, inEm) => {
    const frag = document.createDocumentFragment();
    textNode.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.append(' '); return; }
      const word = document.createElement('span'); word.className = 'hw'; word.setAttribute('aria-hidden', 'true');
      [...part].forEach(ch => {
        const l = document.createElement('span'); l.className = 'hl' + (inEm ? ' hl-em' : ''); l.textContent = ch;
        l.style.setProperty('--i', letters.length); letters.push(l); word.append(l);
      });
      frag.append(word);
    });
    textNode.replaceWith(frag);
  };
  const walk = (node, inEm) => [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) splitText(n, inEm);
    else if (n.nodeType === 1) walk(n, inEm || n.tagName === 'EM');
  });
  walk(h1, false);
  h1.classList.add('split');

  // group letters into visual lines so each line moves at its own pace
  let meta = [];
  const measure = () => {
    const tops = [...new Set(letters.map(l => l.offsetTop))].sort((a, b) => a - b);
    meta = letters.map((l, i) => {
      const line = tops.indexOf(l.offsetTop);
      const inLine = letters.filter(o => o.offsetTop === l.offsetTop);
      const k = inLine.length > 1 ? inLine.indexOf(l) / (inLine.length - 1) : .5;
      return { line, k, wave: Math.sin(k * Math.PI) };   // smooth arc across each line
    });
  };
  let raf = 0;
  const update = () => {
    raf = 0;
    const p = Math.min(1, Math.max(0, scrollY / (innerHeight * .75)));
    const e = p * p * (3 - 2 * p);
    letters.forEach((l, i) => {
      const m = meta[i]; if (!m) return;
      if (e === 0) { l.style.transform = ''; l.style.opacity = ''; return; }
      const ty = -e * (50 + m.line * 45) * (.72 + .28 * m.wave);
      const tx = (m.k - .5) * e * (30 + m.line * 18);
      const rx = e * (22 + m.wave * 14);
      l.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) rotateX(${rx.toFixed(1)}deg)`;
      l.style.opacity = Math.max(0, 1 - e * (1.05 + m.line * .12)).toFixed(3);
    });
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { measure(); update(); });
  measure(); update();
})();

/* ---------- Life: headings rise word by word, labels draw in, panels arrive in sequence ---------- */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  root.classList.add('anim');   // hidden start states only apply once this script is running

  // 1. headings: every word slides up from behind its own edge
  const heads = [...document.querySelectorAll('main h2, .page-head h1')];
  heads.forEach(h => {
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    let n = 0;
    const split = el => [...el.childNodes].forEach(node => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const m = document.createElement('span'); m.className = 'wm'; m.setAttribute('aria-hidden', 'true');
          const i = document.createElement('span'); i.className = 'wi'; i.style.setProperty('--wi', n++); i.textContent = part;
          m.append(i); frag.append(m);
        });
        node.replaceWith(frag);
      } else if (node.nodeType === 1 && !node.classList.contains('wm')) split(node);
    });
    split(h);
    h.classList.add('h-split');
  });

  // 2. index children so they can cascade in when their card is revealed
  const KIDS = '.ticks, .proof-links, .facts, .timeline, .faq, .tabs';
  document.querySelectorAll(KIDS).forEach(list => [...list.children].forEach((c, i) => c.style.setProperty('--si', i)));

  // 3. sibling panels arrive one after another
  document.querySelectorAll('.reveal').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    const i = sibs.indexOf(el);
    if (sibs.length > 1 && i > 0) {
      el.style.transitionDelay = (i * 110) + 'ms';
      el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
    }
  });

  // 4. trigger headings and labels when they come into view
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add(e.target.classList.contains('eyebrow') ? 'e-in' : 'h-in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -10% 0px', threshold: .2 });
  heads.forEach(h => io.observe(h));
  document.querySelectorAll('main .eyebrow').forEach(e => io.observe(e));
})();
