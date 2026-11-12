// Smooth, slightly slower scrolling for mouse wheels and trackpads on computers.
// Phones and tablets keep their own native momentum scrolling, and it is switched off for "reduce motion".
(() => {
  const mq = q => matchMedia(q).matches;
  if (mq('(prefers-reduced-motion: reduce)')) return;
  if (!mq('(hover: hover) and (pointer: fine)')) {
    // Phones and tablets keep native scrolling, but a flick still stops right after the opening animation:
    // the page snaps to the top or to the finished headline, and everything below the headline scrolls freely.
    const stage = document.querySelector('[data-stop-y]') || document.querySelector('.stage,.kz-stage'); if (!stage) return;
    // Snapping is only switched on while the page is inside the opening, so a flick lands on the top or on the
    // finished headline. Below the headline it is off, so normal scrolling stays completely native (no nudges).
    const root = document.documentElement, mk = css => { const d = document.createElement('div'); d.setAttribute('aria-hidden', 'true');
      d.style.cssText = 'position:absolute;left:0;width:1px;pointer-events:none;' + css; document.body.append(d); return d; };
    const top = mk('top:0;height:1px;scroll-snap-align:start'), stop = mk('height:1px;scroll-snap-align:start;scroll-snap-stop:always');
    let S = 0, on = false, touching = false, lastY = scrollY, idle = 0, liftY = -1;
    const snap = v => { if (v !== on) { on = v; root.style.scrollSnapType = v ? 'y mandatory' : 'none'; } };
    const fresh = () => { const s = +stage.dataset.stopY; if (s && s !== S) { S = s; stop.style.top = s + 'px'; } };   // the page keeps it up to date
    const place = () => { if (stage.__refreshStop) stage.__refreshStop(); fresh(); if (!touching) settle(); };
    const settle = () => { fresh(); if (S) snap(scrollY < S - 4); };     // resting inside the opening: snap; below it: free
    let startY = 0;
    const glide = y => { root.style.overflow = 'hidden';                 // cut the flick's own momentum, then glide there
      requestAnimationFrame(() => { root.style.overflow = ''; scrollTo({ top: y, behavior: 'smooth' }); }); };
    addEventListener('touchstart', () => { touching = true; liftY = -1; startY = scrollY; fresh(); if (S && scrollY >= S - 4) snap(false); }, { passive: true });
    const lift = () => { touching = false; liftY = scrollY;
      // one swipe inside the opening plays it: down glides to the finished headline, up goes back to the top
      if (S && on && startY < S - 4) { const d = scrollY - startY; if (d > 12) glide(S); else if (d < -12) glide(0); } };
    addEventListener('touchend', lift, { passive: true }); addEventListener('touchcancel', lift, { passive: true });
    addEventListener('scroll', () => {
      const y = scrollY; fresh();
      // a flick back up from below the headline (demos) glides to a stop at the headline instead of rewinding the opening
      // (only the flick's own momentum is caught: dragging up past it with a finger still works)
      // (as it nears the headline the flick's momentum is cut, so the page glides the last bit and stops on it)
      const v = lastY - y;
      if (S && stage.dataset.stopUp && !touching && liftY >= S - 2 && v > 0 && y < S + Math.max(30, v * 5)) {
        liftY = -1; snap(true); glide(S);
      }
      lastY = y; clearTimeout(idle); idle = setTimeout(() => { if (!touching) settle(); }, 160);
    }, { passive: true });
    addEventListener('load', place); setTimeout(place, 300); setTimeout(place, 1500);
    let lw = innerWidth; addEventListener('resize', () => { if (innerWidth !== lw) { lw = innerWidth; place(); } });
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
