#!/usr/bin/env python3
"""Builds the static site: wraps each page in src/pages with the shared head, nav and footer.

    python3 build.py        -> writes *.html into ./dist

Each page file starts with a front-matter block:
    ---
    title: Page title
    description: Meta description
    path: /products
    nav: products
    ---
"""
import json, pathlib, re, shutil

ROOT = pathlib.Path(__file__).parent
SRC, DIST = ROOT / "src", ROOT / "dist"
SITE = "https://kulmanziman.shop"
CHECKOUT = "https://whop.com/checkout/plan_PI6FfWmjEqWBP/"
EMAIL = "info.kulmanziman@gmail.com"

NAV = [("home", "/", "Home"), ("products", "/products", "Pricing"), ("about", "/about", "About"),
       ("affiliates", "/affiliates", "Affiliates"), ("help", "/help", "Help")]

ORG = {
    "@context": "https://schema.org", "@type": "Organization", "name": "Kulman Ziman", "url": SITE,
    "logo": f"{SITE}/assets/wordmark.png", "email": EMAIL, "foundingDate": "2026-08-24",
    "founder": [{"@type": "Person", "name": "Rex Kulman"}, {"@type": "Person", "name": "Ryder Ziman"}],
}


def head(meta):
    title = meta["title"]
    canonical = SITE + meta["path"]
    ld = [ORG] + json.loads(meta.get("jsonld", "[]"))
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{meta['description']}">
<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#f7f2ee">
<meta name="google-site-verification" content="5wKKFu7Au6tRw0wMbycFva9GoaTk3sH9IX6nqa0HNWA">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Kulman Ziman">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{meta['description']}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE}/og-kulman-ziman.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%232a1f1a'/%3E%3Ctext x='32' y='43' font-family='Georgia,serif' font-size='30' fill='%23e7cfa4' text-anchor='middle'%3EKZ%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..600,0..100,0..1;1,9..144,300..600,0..100,0..1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
<script>document.documentElement.classList.add('js')</script>
<script type="application/ld+json">{json.dumps(ld if len(ld) > 1 else ORG)}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="progress" aria-hidden="true"></div>
"""


def nav(active):
    links = "".join(
        f'<li><a href="{href}"{" aria-current=page" if key == active else ""}>{label}</a></li>'
        for key, href, label in NAV)
    return f"""<header class="nav">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Kulman Ziman home"><img src="/assets/wordmark.png" alt="Kulman Ziman" width="1024" height="76"></a>
    <nav aria-label="Main"><ul class="nav-links">{links}</ul></nav>
    <div class="nav-cta">
      <a class="btn small" href="{CHECKOUT}">Get your website · $300</a>
      <button class="menu-btn" aria-label="Menu" aria-expanded="false"><span></span><span></span></button>
    </div>
  </div>
</header>
"""


FOOTER = f"""<footer>
  <div class="wrap">
    <div class="grid">
      <div>
        <a class="brand" href="/"><img src="/assets/wordmark.png" alt="Kulman Ziman" width="1024" height="76"></a>
        <p>Custom websites and software, built to order.</p>
        <p style="margin-top:14px"><a href="mailto:{EMAIL}">{EMAIL}</a></p>
      </div>
      <div><h4>Site</h4><ul><li><a href="/">Home</a></li><li><a href="/products">Products &amp; Pricing</a></li><li><a href="/about">About &amp; Contact</a></li><li><a href="/affiliates">Affiliate Program</a></li><li><a href="/help">Help</a></li></ul></div>
      <div><h4>Founders</h4><ul><li><a href="/about#team">Ryder Ziman</a></li><li><a href="/about#team">Rex Kulman</a></li></ul></div>
      <div><h4>Order</h4><ul><li><a href="{CHECKOUT}">Checkout</a></li><li><a href="/legal#refund">Refund policy</a></li><li><a href="/legal#terms">Terms</a></li><li><a href="/legal">Legal</a></li></ul></div>
    </div>
    <div class="base-row"><span>© <span data-year>2026</span> Kulman Ziman. All rights reserved.</span><span>Payments processed securely by Whop.</span></div>
  </div>
</footer>
<script src="/assets/site.js" defer></script>
<script src="/assets/motion.js" defer></script>
</body>
</html>
"""


def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(ROOT / "assets", DIST / "assets")
    shutil.copy(ROOT / "assets" / "og.jpg", DIST / "og-kulman-ziman.jpg")
    for page in sorted((SRC / "pages").glob("*.html")):
        text = page.read_text()
        m = re.match(r"---\n(.*?)\n---\n", text, re.S)
        meta = dict(line.split(": ", 1) for line in m.group(1).splitlines())
        body = text[m.end():].replace("{{CHECKOUT}}", CHECKOUT).replace("{{EMAIL}}", EMAIL)
        html = head(meta) + nav(meta.get("nav", "")) + body + FOOTER
        # /products -> dist/products/index.html so clean URLs work on any static host
        out = DIST / ("index.html" if page.stem == "index" else f"{page.stem}/index.html")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html)
        print("built", out.relative_to(ROOT))
    urls = "".join(f"<url><loc>{SITE}{'/' if p.stem == 'index' else '/' + p.stem}</loc></url>"
                   for p in sorted((SRC / "pages").glob("*.html")))
    (DIST / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>')
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n")


if __name__ == "__main__":
    build()
