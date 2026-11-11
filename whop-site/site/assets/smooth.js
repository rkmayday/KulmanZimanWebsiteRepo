// Smooth, slightly slower scrolling for mouse wheels and trackpads on computers.
// Phones and tablets keep their own native momentum scrolling, and it is switched off for "reduce motion".
(() => {
  const mq = q => matchMedia(q).matches;
  if (mq('(prefers-reduced-motion: reduce)') || !mq('(hover: hover) and (pointer: fine)')) return;

  const EASE = .075;   // how quickly the page catches up each frame (lower = smoother, longer glide)
  const SPEED = .85;   // distance per wheel step compared with the browser's normal amount (lower = slower)
  const root = document.documentElement;
  let target = scrollY, cur = scrollY, raf = 0, last = 0, held = false, heldUntil = 0, lastAbs = 0, lastWheel = 0;

  const max = () => root.scrollHeight - innerHeight;
  const go = y => scrollTo({ top: y, behavior: 'instant' });

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
    if (held) { const fresh = gap > 320 || (abs > lastAbs * 2 + 12 && abs > 24) || now > heldUntil; lastAbs = Math.min(lastAbs || abs, abs); if (!fresh) return; held = false; }
    lastAbs = abs;
    if (!raf) { cur = target = scrollY; }
    const from = target;
    target = Math.max(0, Math.min(max(), target + dy * SPEED));
    // stop points: one scroll plays an opening animation and stops when it is done, instead of flying past it
    for (const el of document.querySelectorAll('[data-stop-y]')) {
      if (el.__refreshStop) el.__refreshStop();                       // always use the stop point for the page as it is now
      const s = +el.dataset.stopY;
      if (dy > 0 && from < s - 2 && target > s) { target = s; held = true; heldUntil = now + 6000; }
      // scrolling back up (demos): stop at the finished headline instead of rewinding the whole animation
      if (dy < 0 && el.dataset.stopUp && from > s + 2 && target < s) { target = s; held = true; heldUntil = now + 6000; }
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: false });

  // Keyboard, scrollbar dragging and link jumps scroll natively: keep up with them
  addEventListener('scroll', () => { if (!raf) cur = target = scrollY; }, { passive: true });
  addEventListener('resize', () => { target = Math.min(target, max()); });
})();
