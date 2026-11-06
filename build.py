#!/usr/bin/env python3
"""Builds the static site: wraps each page in src/pages with the shared head, nav and footer.

    python3 build.py             -> ./dist     (production: /products is served from dist/products.html, no trailing slash)
    python3 build.py --preview   -> ./preview  (flat files + relative links, for a private preview page)
    add --theme noir             -> ./dist-noir / ./preview-noir (black, white and lime; "fly through the gates" 3D world)

Each page file starts with a front-matter block:
    ---
    title: Page title
    description: Meta description
    path: /products
    nav: products
    jsonld: [optional JSON array]
    ---
"""
import json, pathlib, re, shutil, sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
SITE = "https://kulmanziman.shop"
CHECKOUT = "https://whop.com/checkout/plan_PI6FfWmjEqWBP/"
EMAIL = "info.kulmanziman@gmail.com"
THREE = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
FONTS = ("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800"
         "&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap")
# Pages that live on the current site but are not part of this rebuild
EXTERNAL = {"/fitness-sample": f"{SITE}/fitness-sample", "/ironpath-app": f"{SITE}/ironpath-app"}

NAV = [("home", "/", "Home"), ("products", "/products", "Pricing"), ("about", "/about", "About"),
       ("affiliates", "/affiliates", "Affiliates"), ("help", "/help", "Help")]

ORG = {
    "@context": "https://schema.org", "@type": "Organization", "name": "Kulman Ziman", "url": SITE,
    "logo": f"{SITE}/assets/wordmark.png", "email": EMAIL, "foundingDate": "2026-08-24",
    "founder": [{"@type": "Person", "name": "Rex Kulman"}, {"@type": "Person", "name": "Ryder Ziman"}],
}
ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' "
        "fill='%23071648'/%3E%3Ctext x='32' y='43' font-family='Georgia,serif' font-size='30' fill='%23d4af37' text-anchor='middle'%3EKZ%3C/text%3E%3C/svg%3E")

ICON_NOIR = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' "
             "fill='%23050505'/%3E%3Ctext x='32' y='42' font-family='Arial,sans-serif' font-weight='800' font-size='26' fill='%23c6ff3d' text-anchor='middle'%3EKZ%3C/text%3E%3C/svg%3E")

# Themes share every page and feature; they differ in colours, the 3D world and a few lines of copy.
THEMES = {
    "royal": {"out": "dist", "preview": "preview", "replace": {}},
    "noir": {
        "out": "dist-noir", "preview": "preview-noir", "preview_title": "Kulman Ziman Noir",
        "replace": {
            '<meta name="theme-color" content="#030820">': '<meta name="theme-color" content="#050505">',
            ICON: ICON_NOIR,
            '<link rel="stylesheet" href="/assets/site.css">': '<link rel="stylesheet" href="/assets/site.css">\n<link rel="stylesheet" href="/assets/theme-noir.css">',
            '/assets/world.js': '/assets/world-noir.js',
            'Scroll down<br>&amp; dive in': 'Scroll to<br>fly through',
            'Drag the crown · Click it · Pop the bubbles': 'Drag the crown · Click it · Shatter the shapes',
            'value="#d4af37" checked aria-label="Gold"><span style="--c:linear-gradient(135deg,#8a6a1c,#f6e3a1,#d4af37)">':
                'value="#c6ff3d" checked aria-label="Lime"><span style="--c:#c6ff3d">',
            'value="#c9ced8" aria-label="Silver"><span style="--c:linear-gradient(135deg,#7d8496,#f4f6fa,#c9ced8)">':
                'value="#ffffff" aria-label="White"><span style="--c:#ffffff">',
        },
    },
}


def head_tags(meta):
    title = meta["title"]
    canonical = SITE + meta["path"]
    ld = [ORG] + json.loads(meta.get("jsonld", "[]"))
    return f"""<title>{title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="{meta['description']}">
<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#030820">
<meta name="google-site-verification" content="5wKKFu7Au6tRw0wMbycFva9GoaTk3sH9IX6nqa0HNWA">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Kulman Ziman">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{meta['description']}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE}/og-kulman-ziman.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{ICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS}" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
<script>document.documentElement.classList.add('js')</script>
<script type="application/ld+json">{json.dumps(ld if len(ld) > 1 else ORG)}</script>
"""


BODY_START = """<a class="skip" href="#main">Skip to content</a>
<canvas id="world" aria-hidden="true"></canvas>
<div class="vignette" aria-hidden="true"></div>
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
      <a class="btn ghost" href="/#start">Send a brief</a>
      <a class="btn small" href="{CHECKOUT}">Get started · $300</a>
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
      <div><h4>Founders</h4><ul><li><a href="/ryderziman">Ryder Ziman</a></li><li><a href="/rexkulman">Rex Kulman</a></li></ul></div>
      <div><h4>Order</h4><ul><li><a href="{CHECKOUT}">Checkout</a></li><li><a href="/legal#refund">Refund policy</a></li><li><a href="/legal#terms">Terms</a></li><li><a href="/legal">Legal</a></li></ul></div>
    </div>
    <div class="base-row"><span>© <span data-year>2026</span> Kulman Ziman. All rights reserved.</span><span>Payments processed securely by Whop.</span></div>
  </div>
</footer>
<script src="{THREE}"></script>
<script src="/assets/world.js" defer></script>
<script src="/assets/site.js" defer></script>
<script src="/assets/motion.js" defer></script>
"""


def relativize(html):
    """Preview mode: flat files and relative links (index.html, products.html, assets/...)."""
    def fix(m):
        attr, url = m.group(1), m.group(2)
        path, _, frag = url.partition("#")
        frag = "#" + frag if frag else ""
        if path in EXTERNAL:
            return f'{attr}="{EXTERNAL[path]}{frag}"'
        if path.startswith("/assets/"):
            return f'{attr}="{path[1:]}{frag}"'
        if path == "/":
            return f'{attr}="index.html{frag}"'
        if path == "" and frag:
            return m.group(0)
        return f'{attr}="{path.strip("/")}.html{frag}"'
    return re.sub(r'(href|src)="(/[^"/][^"]*|/|/#[^"]*)"', fix, html)


def build(preview=False, theme="royal"):
    th = THEMES[theme]
    out_dir = ROOT / (th["preview"] if preview else th["out"])
    if out_dir.exists():
        shutil.rmtree(out_dir)
    shutil.copytree(ROOT / "assets", out_dir / "assets")
    if not preview:
        shutil.copy(ROOT / "assets" / "og.jpg", out_dir / "og-kulman-ziman.jpg")
    pages = sorted((SRC / "pages").glob("*.html"))
    for page in pages:
        text = page.read_text()
        m = re.match(r"---\n(.*?)\n---\n", text, re.S)
        meta = dict(line.split(": ", 1) for line in m.group(1).splitlines())
        body = text[m.end():].replace("{{CHECKOUT}}", CHECKOUT).replace("{{EMAIL}}", EMAIL)
        inner = nav(meta.get("nav", "")) + body + FOOTER
        if preview and page.stem == "index":
            # the preview host adds the document skeleton around its main page; it gets a short name
            html = head_tags(dict(meta, title=th.get("preview_title", "Kulman Ziman Preview"))) + BODY_START + inner
        else:
            html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
                    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                    + head_tags(meta) + "</head>\n<body>\n" + BODY_START + inner + "</body>\n</html>\n")
        for a, b in th["replace"].items():
            html = html.replace(a, b)
        if preview:
            html = relativize(html)
            out = out_dir / f"{page.stem}.html"
        else:
            # flat files: Vercel (cleanUrls), Netlify, Cloudflare Pages and GitHub Pages all serve
            # products.html at /products with no trailing slash
            out = out_dir / f"{page.stem}.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html)
        print("built", out.relative_to(ROOT))
    if not preview:
        urls = "".join(f"<url><loc>{SITE}{'/' if p.stem == 'index' else '/' + p.stem}</loc></url>" for p in pages)
        (out_dir / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>')
        (out_dir / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n")
        (out_dir / "vercel.json").write_text('{"cleanUrls": true, "trailingSlash": false}\n')


if __name__ == "__main__":
    args = sys.argv[1:]
    theme = args[args.index("--theme") + 1] if "--theme" in args else "royal"
    build(preview="--preview" in args, theme=theme)
