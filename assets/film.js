// Ziman Sites demos: the "film". One continuous video plays behind the page as you scroll (scrubbed, not played),
// from the top of its range to the bottom. Wide screens and tall (phone) screens each get their own video.
// The browser decodes one frame at a time, so it stays light on memory and smooth on phones.
//   <div class="film" data-wide="../x/film-w.mp4" data-tall="../x/film-p.mp4" [data-start="#id"] [data-end="#id"]></div>
// data-start / data-end: the film runs between these elements instead of the whole page.
(() => {
  const el = document.querySelector('.film'); if (!el) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto'; v.disablePictureInPicture = true;
  el.append(v);
  let set = '', dur = 0, want = 0, cur = 0, raf = 0;
  // the video follows the shape of the film's own box (full screen, a side panel or a band)
  const pick = () => { const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight; return h > w * 1.05 ? el.dataset.tall : el.dataset.wide; };
  const load = s => {
    set = s; dur = 0; v.src = s; v.load();
    v.addEventListener('loadedmetadata', () => { dur = v.duration || 0; seek(true); }, { once: true });
    // iPhones show a frame only after the video has played once: a muted play then pause unlocks scrubbing
    v.addEventListener('loadeddata', () => { const p = v.play(); if (p && p.then) p.then(() => { v.pause(); seek(true); }).catch(() => {}); else v.pause(); }, { once: true });
  };
  const range = () => {
    const doc = document.documentElement, max = Math.max(1, doc.scrollHeight - innerHeight);
    const a = el.dataset.start && document.querySelector(el.dataset.start), b = el.dataset.end && document.querySelector(el.dataset.end);
    const y0 = a ? a.getBoundingClientRect().top + scrollY : 0, y1 = b ? b.getBoundingClientRect().bottom + scrollY - innerHeight : max;
    return [y0, Math.max(y0 + 1, y1)];
  };
  const read = () => { const [y0, y1] = range(); want = reduce ? 0 : Math.min(1, Math.max(0, (scrollY - y0) / (y1 - y0)));
    document.documentElement.style.setProperty('--film', want.toFixed(4)); if (!raf) raf = requestAnimationFrame(tick); };
  function seek(force) {
    if (!dur) return; const t = Math.min(dur - .05, cur * dur);
    if (force || (!v.seeking && Math.abs(v.currentTime - t) > 1 / 48)) { try { v.currentTime = t; } catch (e) {} }
  }
  const tick = () => { raf = 0; const d = want - cur; cur += Math.abs(d) < .0005 ? d : d * .18; seek(); if (Math.abs(want - cur) > .0005 || v.seeking) raf = requestAnimationFrame(tick); };
  v.addEventListener('seeked', () => { if (Math.abs(want - cur) > .0005 && !raf) raf = requestAnimationFrame(tick); });
  load(pick()); read(); cur = want;
  addEventListener('scroll', read, { passive: true });
  addEventListener('resize', () => { const s = pick(); if (s !== set) load(s); read(); });
})();

// the big words in the open stretches drift across as their stretch passes
(() => {
  const gaps = [...document.querySelectorAll('.fl-gap')]; if (!gaps.length) return;
  const up = () => gaps.forEach(g => { const r = g.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    g.style.setProperty('--gk', Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height))).toFixed(4)); });
  addEventListener('scroll', up, { passive: true }); up();
})();
