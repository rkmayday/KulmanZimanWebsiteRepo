/* Home page reviews: read live from the Ziman Sites Whop store (public, no key needed).
   The section stays hidden until the store has at least one published review. */
(() => {
  const sec = document.getElementById('reviews');
  if (!sec) return;
  const API = 'https://api.whop.com/api/v1/reviews?first=100&';
  const store = sec.dataset.store, products = (sec.dataset.products || '').split(/\s+/).filter(Boolean);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const get = q => fetch(API + q, { cache: 'no-store' }).then(r => r.ok ? r.json() : { data: [] }).then(j => j.data || []).catch(() => []);
  const star = on => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${on ? 'on' : ''}"><path d="M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.5l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>`;
  const stars = n => Array.from({ length: 5 }, (_, i) => star(i < n)).join('');
  const date = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); };

  Promise.all([get('account_id=' + store), ...products.map(p => get('product_id=' + p))]).then(lists => {
    const seen = new Set(), all = [];
    for (const r of lists.flat()) if (r && r.id && !seen.has(r.id) && r.stars >= 1) { seen.add(r.id); all.push(r); }
    if (!all.length) return;                                   // no reviews yet: keep the section hidden
    all.sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at));
    const avg = all.reduce((s, r) => s + r.stars, 0) / all.length;
    sec.querySelector('.rv-avg').innerHTML =
      `<b>${avg.toFixed(1)}</b><span class="rv-stars" role="img" aria-label="${avg.toFixed(1)} out of 5 stars">${stars(Math.round(avg))}</span>` +
      `<span>from ${all.length} review${all.length === 1 ? '' : 's'} on Whop</span>`;
    sec.querySelector('.rv-grid').innerHTML = all.slice(0, 6).map(r => {
      const who = (r.user && (r.user.name || r.user.username)) || 'Whop customer';
      return `<figure class="rv-card">
        <span class="rv-stars" role="img" aria-label="${r.stars} out of 5 stars">${stars(r.stars)}</span>
        ${r.title ? `<h3>${esc(r.title)}</h3>` : ''}
        ${r.description ? `<blockquote>${esc(r.description)}</blockquote>` : ''}
        <figcaption><b>${esc(who)}</b>${r.paid_for_product ? '<span class="rv-ver">Verified buyer</span>' : ''}<span class="rv-date">${date(r.published_at || r.created_at)}</span></figcaption>
      </figure>`;
    }).join('');
    sec.hidden = false;
  });
})();
