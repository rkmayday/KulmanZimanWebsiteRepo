// Checkout on zimansites.com: every link to a Whop checkout opens Whop's embedded checkout in a pop-up on the page,
// so customers pay without leaving the site. Payments still run through Whop (affiliates, refunds, receipts).
// If the embed can't load, the link works as before and opens Whop's own checkout page.
(() => {
  const PLANS = {
    plan_PI6FfWmjEqWBP: ['Starter', 284, '1-page interactive website'],
    plan_nhAPjhAm2Hdoo: ['Professional', 568, '2–3-page interactive website'],
    plan_kayas42uF3j2w: ['Premium', 994, '4–7-page interactive website'],
  };
  const LOADER = '/assets/whop-checkout/loader.js';

  // affiliates can share any zimansites.com link with ?a=their-code (or ?ref=); it is remembered for 30 days
  const AFF_KEY = 'zs-aff';
  try {
    const q = new URLSearchParams(location.search), code = (q.get('a') || q.get('ref') || '').trim();
    if (/^[\w.-]{2,64}$/.test(code)) localStorage.setItem(AFF_KEY, JSON.stringify({ code, until: Date.now() + 30 * 864e5 }));
  } catch (e) {}
  const affiliate = () => { try { const v = JSON.parse(localStorage.getItem(AFF_KEY) || 'null'); return v && v.until > Date.now() ? v.code : ''; } catch (e) { return ''; } };

  if (typeof HTMLDialogElement !== 'function') return;          // very old browsers: links go to Whop as before
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let dlg, slot, title, priceEl, fallback, loaded = false, lastHref = '';
  const build = () => {
    dlg = document.createElement('dialog');
    dlg.className = 'pkg-modal co-modal';
    dlg.setAttribute('aria-labelledby', 'co-title');
    dlg.innerHTML = `<div class="pm-box co-box">
      <button class="pm-x" type="button" aria-label="Close" data-co-close>×</button>
      <span class="eyebrow">Secure checkout</span>
      <h2 id="co-title"></h2>
      <p class="co-price"></p>
      <div class="co-slot"></div>
      <p class="pm-fine co-fine">Payments are processed securely by Whop. One-time payment, no subscription.
        <a class="co-fallback" href="#" target="_blank" rel="noopener">Having trouble? Open checkout on Whop ↗</a></p>
    </div>`;
    document.body.appendChild(dlg);
    slot = dlg.querySelector('.co-slot'); title = dlg.querySelector('#co-title'); priceEl = dlg.querySelector('.co-price'); fallback = dlg.querySelector('.co-fallback');
    const close = () => { dlg.classList.remove('open'); setTimeout(() => { if (dlg.open) dlg.close(); slot.innerHTML = ''; }, reduce ? 0 : 220); };
    dlg.addEventListener('click', e => { if (e.target === dlg || (e.target.closest && e.target.closest('[data-co-close]'))) close(); });
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
  };

  // after a successful payment (called by Whop's checkout)
  window.zsCheckoutDone = () => {
    if (!slot) return;
    slot.innerHTML = `<div class="co-done"><b>Payment received. Thank you!</b>
      <p>Your receipt is on its way to your email. Next, send us your brief at
      <a href="mailto:zimansites@gmail.com?subject=My%20website%20brief">zimansites@gmail.com</a> so we can confirm your specifications and your domain.</p></div>`;
  };

  const open = (planId, href) => {
    if (!dlg) build();
    const p = PLANS[planId] || ['Your package', null, ''];
    title.textContent = p[0] + (p[2] ? ' · ' + p[2] : '');
    priceEl.textContent = p[1] ? '$' + p[1] + ', paid once' : '';
    lastHref = href;
    const aff = affiliate();
    let fb = href; try { const u = new URL(href); if (aff) u.searchParams.set('a', aff); fb = u.toString(); } catch (e) {}
    fallback.href = fb;
    slot.innerHTML = '<div class="co-loading">Loading secure checkout…</div>';
    const box = document.createElement('div');
    box.setAttribute('data-whop-checkout-plan-id', planId);
    box.setAttribute('data-whop-checkout-theme', 'light');
    box.setAttribute('data-whop-checkout-on-complete', 'zsCheckoutDone');
    if (aff) box.setAttribute('data-whop-checkout-affiliate-code', aff);
    slot.appendChild(box);
    if (!loaded) { loaded = true; const s = document.createElement('script'); s.src = LOADER; s.async = true; s.onerror = () => { location.href = fb; }; document.head.appendChild(s); }
    // the loading note goes away once Whop's frame is in place; if nothing appears, send them to Whop's page
    const t0 = Date.now(), iv = setInterval(() => {
      const ready = box.querySelector('iframe');
      if (ready) { clearInterval(iv); const l = slot.querySelector('.co-loading'); l && l.remove(); }
      else if (Date.now() - t0 > 12000) { clearInterval(iv); if (dlg.open && slot.contains(box)) location.href = fb; }
    }, 250);
    const pm = document.getElementById('pkg-modal'); if (pm && pm.open) { pm.classList.remove('open'); pm.close(); }
    dlg.showModal(); requestAnimationFrame(() => dlg.classList.add('open'));
  };

  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href*="whop.com/checkout/plan_"]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    const m = a.href.match(/checkout\/(plan_[A-Za-z0-9]+)/); if (!m) return;
    e.preventDefault(); e.stopImmediatePropagation();
    open(m[1], a.href);
  }, true);
})();
