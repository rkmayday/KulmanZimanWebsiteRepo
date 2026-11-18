// Ziman Sites demos: the "film". One continuous frame sequence plays behind the whole page as you scroll,
// from the very top to the very bottom. Wide screens and tall (phone) screens each get their own frame set,
// so neither is cropped badly. Frames load coarse-to-fine, so the film is watchable right away.
//   <div class="film" data-base="../assets/x/" data-n="180" data-wide="w/" data-tall="p/" data-ext="webp"></div>
(() => {
  const el = document.querySelector('.film'); if (!el) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = +el.dataset.n, base = el.dataset.base, ext = el.dataset.ext || 'webp';
  const cv = document.createElement('canvas'); el.append(cv); const g = cv.getContext('2d');
  let set = '', frames = [], want = 0, drawn = -1, cur = 0;
  const pick = () => (innerHeight > innerWidth * 1.05 ? el.dataset.tall : el.dataset.wide);
  const load = s => {
    set = s; frames = new Array(N); drawn = -1; const mine = frames;
    const one = i => new Promise(res => { const im = new Image(); im.decoding = 'async';
      im.onload = () => { if (mine === frames) { frames[i] = im; if (Math.abs(i - want) < 8) draw(true); } res(); }; im.onerror = res;
      im.src = base + s + String(i + 1).padStart(3, '0') + '.' + ext; });
    (async () => { for (let st = 16; st >= 1; st >>= 1) { const jobs = []; for (let i = 0; i < N; i += st) if (!frames[i]) jobs.push(one(i)); await Promise.all(jobs); if (mine !== frames) return; } })();
  };
  const size = () => { const d = Math.min(2, devicePixelRatio || 1), w = Math.round(innerWidth * d), h = Math.round(innerHeight * d);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; drawn = -1; } };
  function draw(force) {
    let k = Math.round(cur); let a = k, b = k; while (a >= 0 && !frames[a]) a--; while (b < N && !frames[b]) b++;
    k = a >= 0 && (b >= N || k - a <= b - k) ? a : b; const im = frames[k]; if (!im) return;
    if (k === drawn && !force) return; size();
    const s = Math.max(cv.width / im.width, cv.height / im.height), w = im.width * s, h = im.height * s;
    g.drawImage(im, (cv.width - w) / 2, (cv.height - h) / 2, w, h); drawn = k;
  }
  // the film follows the scroll, eased slightly so a flick glides instead of jumping
  let raf = 0;
  const tick = () => { raf = 0; const d = want - cur; cur += Math.abs(d) < .3 ? d : d * .22; draw(); if (Math.abs(want - cur) > .01) raf = requestAnimationFrame(tick); };
  const read = () => { const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    want = reduce ? 0 : Math.min(1, Math.max(0, scrollY / max)) * (N - 1);
    document.documentElement.style.setProperty('--film', (want / (N - 1)).toFixed(4));
    if (!raf) raf = requestAnimationFrame(tick); };
  load(pick()); size(); read(); cur = want;
  addEventListener('scroll', read, { passive: true });
  let lw = innerWidth, lh = innerHeight;
  addEventListener('resize', () => { const s = pick(); if (s !== set) load(s);
    if (innerWidth !== lw || Math.abs(innerHeight - lh) > 120) { lw = innerWidth; lh = innerHeight; drawn = -1; draw(true); } read(); });
})();

// the big words in the open stretches drift across as their stretch passes
(() => {
  const gaps = [...document.querySelectorAll('.fl-gap')]; if (!gaps.length) return;
  const up = () => gaps.forEach(g => { const r = g.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    g.style.setProperty('--gk', Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height))).toFixed(4)); });
  addEventListener('scroll', up, { passive: true }); up();
})();
