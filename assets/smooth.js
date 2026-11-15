// Smooth, slightly slower scrolling for mouse wheels and trackpads on computers.
// Phones and tablets keep their own native momentum scrolling, and it is switched off for "reduce motion".
(() => {
  const mq = q => matchMedia(q).matches;
  if (mq('(prefers-reduced-motion: reduce)')) return;
  // every stop point on the page, freshly measured: [{ y, up }] (up = it also stops on the way back up)
  const stops = () => {
    const out = [];
    for (const el of document.querySelectorAll('[data-stop-y], [data-stops]')) {
      if (el.__refreshStop) el.__refreshStop();
      if (el.dataset.stopY) out.push({ y: +el.dataset.stopY, up: !!el.dataset.stopUp });
      if (el.dataset.stops) el.dataset.stops.split(',').forEach(v => out.push({ y: +v, up: true }));
    }
    return out.filter(o => o.y > 0).sort((a, b) => a.y - b.y);
  };
  if (!mq('(hover: hover) and (pointer: fine)')) {
    // Phones and tablets scroll natively (no snapping). A flick that would carry past a stop point (the end of an opening, or a Portfolio slide)
    // opening stops right there, with the headline fully in: only once the finger has left the screen (never
    // fighting the finger), and the rest of that flick is dropped. The next swipe scrolls on as normal.
    if (!document.querySelector('[data-stop-y], [data-stops], .stage[data-stop], .kz-stage')) return;
    const root = document.documentElement;
    let y0 = 0, touching = false, target = null, stopping = false;
    addEventListener('touchstart', () => { touching = true; y0 = scrollY; target = null; }, { passive: true });
    const lift = () => {
      touching = false;
      // the first stop this flick would cross: the next one down, or (if it allows it) the next one up
      const list = stops(), down = list.find(o => o.y > y0 + 4), up = [...list].reverse().find(o => o.up && o.y < y0 - 4);
      target = { down: down ? down.y : null, up: up ? up.y : null };
      check();
    };
    addEventListener('touchend', lift, { passive: true }); addEventListener('touchcancel', lift, { passive: true });
    const stopAt = y => {
      target = null; stopping = true;
      root.style.overflow = 'hidden';              // ends the momentum
      scrollTo(0, y);
      setTimeout(() => { root.style.overflow = ''; scrollTo(0, y); stopping = false; }, 120);
    };
    const check = () => {
      if (!target || touching || stopping) return;
      if (target.down !== null && scrollY >= target.down) stopAt(target.down);
      else if (target.up !== null && scrollY <= target.up) stopAt(target.up);
    };
    addEventListener('scroll', check, { passive: true });
    return;
  }

  const EASE = .075;   // how quickly the page catches up each frame (lower = smoother, longer glide)
  const SPEED = .85;   // distance per wheel step compared with the browser's normal amount (lower = slower)
  const root = document.documentElement;
  let target = scrollY, cur = scrollY, raf = 0, last = 0, held = false, heldUntil = 0, lastAbs = 0, lastWheel = 0;

  const max = () => root.scrollHeight - innerHeight;
  let lastSet = scrollY;
  const go = y => { lastSet = y; scrollTo({ top: y, behavior: 'instant' }); };

  function frame(t) {
    const dt = last ? Math.min(50, t - last) : 16.7; last = t;
    cur += (target - cur) * (1 - Math.pow(1 - EASE, dt / 16.7));   // same feel at 60 Hz and 120 Hz
    if (Math.abs(target - cur) < .5) { cur = target; raf = 0; last = 0; } else raf = requestAnimationFrame(frame);
    go(Math.round(cur * 2) / 2);
  }

  // Let the browser handle anything that scrolls on its own: open pop-ups, the mobile menu, scrollable boxes
  const ownScroller = (e, dy) => {
    if (document.querySelector('dialog[open]')) return true;
    for (const el of e.composedPath()) {
      if (!(el instanceof Element) || el === root || el === document.body) break;
      const st = getComputedStyle(el);
      if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 1 &&
          (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
    }
    return false;
  };

  addEventListener('wheel', e => {
    if (e.ctrlKey || e.defaultPrevented) return;                          // pinch-zoom
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;                  // sideways swipes
    let dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (!dy || ownScroller(e, dy) || getComputedStyle(document.body).overflow === 'hidden') return;
    e.preventDefault();
    // after stopping at the end of an opening animation, the rest of that flick (trackpad momentum) is ignored
    const now = performance.now(), gap = now - lastWheel, abs = Math.abs(dy); lastWheel = now;
    // ...but only briefly: any new swipe (a pause, a stronger push, or after 6 seconds) scrolls on as normal
    // (trackpad momentum only ever slows down, so a clearly stronger push is a new swipe; small jitters are not)
    // a mouse-wheel click moves in fixed steps (100 or 120); trackpad momentum is a smooth run of uneven values
    const notch = e.deltaMode !== 0 || (Number.isInteger(e.deltaY) && abs >= 100 && (abs % 100 === 0 || abs % 120 === 0));
    if (held) { const fresh = gap > 320 || (abs > lastAbs * 2 + 12 && abs > 24) || (notch && gap > 100) || now > heldUntil; lastAbs = Math.min(lastAbs || abs, abs); if (!fresh) return; held = false; }
    lastAbs = abs;
    if (!raf) { cur = target = scrollY; }
    const from = target;
    target = Math.max(0, Math.min(max(), target + dy * SPEED));
    // stop points: one scroll plays an opening animation and stops when it is done, instead of flying past it;
    // stepped sections (the Portfolio stack slider) stop at every slide, in both directions
    const list = stops();
    if (dy > 0) { const o = list.find(o => from < o.y - 2 && target > o.y); if (o) { target = o.y; held = true; heldUntil = now + 6000; } }
    else { const o = [...list].reverse().find(o => o.up && from > o.y + 2 && target < o.y); if (o) { target = o.y; held = true; heldUntil = now + 6000; } }
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: false });

  // Keyboard, scrollbar dragging and other jumps: if something else moved the page, stop gliding and follow it
  addEventListener('scroll', () => {
    if (raf && Math.abs(scrollY - lastSet) > 60) { cancelAnimationFrame(raf); raf = 0; last = 0; held = false; }
    if (!raf) cur = target = scrollY;
  }, { passive: true });
  // in-page menu links glide to their section (just below the menu bar) in one click
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.getAttribute('href').length < 2) return;
    const el = document.getElementById(a.getAttribute('href').slice(1)); if (!el) return;
    e.preventDefault();
    const nav = document.querySelector('.nav'), off = nav ? nav.getBoundingClientRect().height : 0;
    if (raf) cancelAnimationFrame(raf);
    cur = scrollY; held = false; target = Math.max(0, Math.min(max(), el.getBoundingClientRect().top + scrollY - off));
    raf = requestAnimationFrame(frame);
    if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
  });
  addEventListener('resize', () => { target = Math.min(target, max()); });
})();
