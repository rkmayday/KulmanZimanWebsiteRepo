// Shared motion for the sample sites: progress bar, glass nav, reveals, word-by-word headings,
// count-ups, filling step lines, marquee loop and cursor light on cards. Respects reduced motion.
(() => {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bar = document.createElement('div'); bar.className = 'kp'; bar.setAttribute('aria-hidden', 'true'); document.body.append(bar);
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? scrollY / max : 0);
    document.body.classList.toggle('stuck', scrollY > 40);
    $$('.ksteps').forEach(s => { const r = s.getBoundingClientRect(); s.style.setProperty('--f', Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .3)))); });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // marquee: duplicate the run so it loops seamlessly
  $$('.kmq > div').forEach(t => { t.innerHTML += t.innerHTML; });

  // cursor light on cards
  $$('.kcard, .kstep, .kstat').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect(); c.style.setProperty('--gx', (e.clientX - r.left) + 'px'); c.style.setProperty('--gy', (e.clientY - r.top) + 'px');
  }));
  if (reduce || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('kit');

  // headings below the hero rise word by word
  $$('section h2').forEach(h => {
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    let n = 0;
    const walk = el => [...el.childNodes].forEach(node => {
      if (node.nodeType === 3) {
        const f = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(p => {
          if (!p) return; if (/^\s+$/.test(p)) { f.append(' '); return; }
          const w = document.createElement('span'); w.className = 'kw'; w.setAttribute('aria-hidden', 'true');
          const i = document.createElement('span'); i.style.setProperty('--i', n++); i.textContent = p; w.append(i); f.append(w);
        });
        node.replaceWith(f);
      } else if (node.nodeType === 1) walk(node);
    });
    walk(h); h.classList.add('ks');
  });

  // everything else reveals in sequence
  const groups = '.kstats, .kgrid, .ksteps, .plans, .grid3, .menu, .courses, .visit, .kfaq, .chart, .ksplit, .play';
  $$(groups).forEach(g => [...g.children].forEach((c, i) => { c.classList.add('rv'); c.style.setProperty('--d', (i * .09) + 's'); }));
  $$('section .k, section .lede, .khead > p, .kcta, .kmq, .cta').forEach(el => { if (!el.closest('.rv')) el.classList.add('rv'); });

  const count = el => {
    const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length, t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / 1600), e = 1 - Math.pow(1 - k, 4);
      el.textContent = (end * e).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach(count);
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv, .ks').forEach(el => io.observe(el));
  $$('[data-count]').forEach(el => { if (!el.closest('.rv')) { el.closest('.kstat') && io.observe(el.closest('.kstat')); } });
  // nothing that is on screen stays hidden
  const sweep = () => $$('.rv:not(.in), .ks:not(.in)').forEach(el => { if (el.getBoundingClientRect().top < innerHeight * .95) { el.classList.add('in'); $$('[data-count]', el).forEach(count); } });
  setTimeout(sweep, 2500); addEventListener('scroll', () => requestAnimationFrame(sweep), { passive: true });
})();
