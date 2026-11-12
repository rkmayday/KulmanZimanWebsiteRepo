// Smooth, slightly slower scrolling for mouse wheels and trackpads on computers.
// Phones and tablets keep their own native momentum scrolling, and it is switched off for "reduce motion".
(() => {
  const mq = q => matchMedia(q).matches;
  if (mq('(prefers-reduced-motion: reduce)')) return;
  if (!mq('(hover: hover) and (pointer: fine)')) {
    // Phones and tablets keep native scrolling, but a flick still stops right after the opening animation:
    // the page snaps to the top or to the finished headline, and everything below the headline scrolls freely.
    const stage = document.querySelector('[data-stop-y]') || document.querySelector('.stage,.kz-stage'); if (!stage) return;
    const root = document.documentElement, top = document.createElement('div'), after = document.createElement('div');
    top.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;pointer-events:none;scroll-snap-align:start';
    after.style.cssText = 'position:absolute;left:0;width:1px;pointer-events:none;scroll-snap-align:start;scroll-snap-stop:always';
    top.setAttribute('aria-hidden', 'true'); after.setAttribute('aria-hidden', 'true');
    document.body.append(top, after);
    const place = () => { if (stage.__refreshStop) stage.__refreshStop(); const s = +stage.dataset.stopY; if (!s) return;
      const h = Math.max(1, root.scrollHeight - s - 2); after.style.top = s + 'px'; after.style.height = h + 'px'; root.style.scrollSnapType = 'y mandatory'; };
    addEventListener('load', place); addEventListener('resize', place); setTimeout(place, 300); setTimeout(place, 1500);
    if (window.ResizeObserver) new ResizeObserver(() => place()).observe(document.body);
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
