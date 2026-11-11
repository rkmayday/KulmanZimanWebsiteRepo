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
import json, pathlib, re, shutil, sys, urllib.parse

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
SITE = "https://kulmanziman.com"
CHECKOUT = "/get-started"   # every "buy"/"Get started" button opens the package picker; each package card goes to its own Whop checkout

# Website packages. Each "checkout" is that package's Whop checkout link.
# Until a package has its own Whop plan, its button opens the project brief instead (so nobody is charged the wrong amount).
PACKAGES = [
    # key, name, price, scope, best-for, checkout link (None = not set up in Whop yet)
    ("starter", "Starter", 284, "1-page interactive website", "A single page that introduces your business and gets people in touch.", "https://whop.com/checkout/plan_PI6FfWmjEqWBP/"),
    ("professional", "Professional", 568, "2–3-page interactive website", "A home page plus your services and a contact or booking page.", "https://whop.com/checkout/plan_nhAPjhAm2Hdoo/"),
    ("premium", "Premium", 994, "4–7-page interactive website", "A full business site: services, about, gallery, pricing and more.", "https://whop.com/checkout/plan_kayas42uF3j2w/"),
]
PACKAGE_COMMON = ["Interactive, animated website experience", "Mobile-friendly design tailored to your industry", "Three rounds of refinement with you",
                  "Fast turnaround: on time, or a full refund", "First-year domain paid by us when under $30",
                  "Fully handed over to you: yours to own"]


def package_modal():
    """The "choose your package" pop-up. Any link to /get-started opens it (site.js); the page stays as a no-JS fallback."""
    rows = []
    for key, name, price, scope, best, link in PACKAGES:
        popular = key == "professional"
        rows.append(f"""      <a class="pm-opt{' best' if popular else ''}" href="{link or '/#start'}">
        <span class="pm-name">{name}{'<em>Most popular</em>' if popular else ''}</span>
        <span class="pm-price"><sup>$</sup>{price}</span>
        <span class="pm-scope">{scope}</span>
        <span class="pm-go" aria-hidden="true">Choose →</span>
      </a>""")
    return f"""<dialog class="pkg-modal" id="pkg-modal" aria-labelledby="pm-title">
  <div class="pm-box">
    <button class="pm-x" type="button" aria-label="Close" data-pm-close>×</button>
    <span class="eyebrow">Get started</span>
    <h2 id="pm-title">Choose your package</h2>
    <p class="pm-lede">You will go to a secure Whop checkout for the package you pick.</p>
    <div class="pm-opts">
{chr(10).join(rows)}
    </div>
    <p class="pm-fine">One-time payment. Three rounds of refinement, delivered on time or a full refund. Not sure? <a href="/#start" data-pm-close>Send a brief first</a>.</p>
  </div>
</dialog>
"""


def packages_html():
    cards = []
    for key, name, price, scope, best, link in PACKAGES:
        popular = key == "professional"
        href = link or "/#start"
        label = f"Choose {name} · ${price}" if link else f"Start with {name}"
        ticks = "".join(f"<li>{t}</li>" for t in [scope] + PACKAGE_COMMON)
        cards.append(f"""      <article class="pkg reveal{' best' if popular else ''}" id="pkg-{key}">
        {'<span class="pkg-badge">Most popular</span>' if popular else ''}
        <span class="eyebrow">{name}</span>
        <div class="pkg-price"><sup>$</sup>{price}</div>
        <p class="pkg-scope"><b>{scope}</b><br>{best}</p>
        <ul class="ticks">{ticks}</ul>
        <a class="btn{'' if popular else ' ghost'}" href="{href}">{label}</a>
      </article>""")
    return ('<div class="pkgs" id="packages">\n' + "\n".join(cards) + '\n    </div>\n'
            '    <p class="muted reveal pkg-note">One-time payment, no subscription. Hosting and maintenance after delivery are not included. '
            'Domains costing $30 or more carry a 20% markup on the registrar’s cost. <a href="/legal#terms">See the terms</a>.</p>')

EMAIL = "info.kulmanziman@gmail.com"
THREE = "/assets/three.min.js"  # self-hosted Three.js r128, no third-party CDN to fail
FONTS = ("https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300..700&family=Bricolage+Grotesque:opsz,wght@12..96,400..800"
         "&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap")
# Pages that live on the current site but are not part of this rebuild
EXTERNAL = {}

NAV = [("home", "/", "Home"), ("products", "/products", "Pricing"), ("about", "/about", "About"),
       ("affiliates", "/affiliates", "Affiliates"), ("help", "/help", "Help"), ("legal", "/legal", "Legal")]

ORG = {
    "@context": "https://schema.org", "@type": "Organization", "name": "Kulman Ziman", "url": SITE,
    "logo": f"{SITE}/logo-512.png", "email": EMAIL, "foundingDate": "2026-08-24",
    "founder": [{"@type": "Person", "name": "Rex Kulman"}, {"@type": "Person", "name": "Ryder Ziman"}],
}
ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' "
        "fill='%23071648'/%3E%3Ctext x='32' y='43' font-family='Georgia,serif' font-size='30' fill='%23d4af37' text-anchor='middle'%3EKZ%3C/text%3E%3C/svg%3E")

ICON_NOIR = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' "
             "fill='%23050505'/%3E%3Ctext x='32' y='42' font-family='Arial,sans-serif' font-weight='800' font-size='26' fill='%23c6ff3d' text-anchor='middle'%3EKZ%3C/text%3E%3C/svg%3E")

# Icon files (static/ is copied to the site root): Google search results only use an icon that is a real file at a fixed address
ICON_FILES = ('<link rel="icon" href="/favicon.ico" sizes="48x48">\n'
              '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n'
              '<link rel="icon" href="/favicon-192.png" type="image/png" sizes="192x192">\n'
              '<link rel="apple-touch-icon" href="/apple-touch-icon.png">')
# Mono tab icon: the real KZ logo shape on a transparent background, black (white when the browser is in dark mode)
ICON_MONO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cstyle%3Epath%7Bfill:%230a0a0a%7D@media (prefers-color-scheme:dark)%7Bpath%7Bfill:%23ffffff%7D%7D%3C/style%3E%3Cpath transform='translate(1 14.69) scale(0.1033)' d='M0.00,0.00 L76.00,0.00 L76.00,137.42 L191.48,0.00 L283.45,0.00 L148.67,158.72 L303.05,333.19 L467.61,67.03 L325.06,66.99 L324.97,0.02 L488.00,0.00 L600.65,0.03 L434.59,268.00 L590.03,268.00 L589.94,335.00 L200.04,335.00 L76.00,192.20 L76.00,335.00 L0.00,335.00 Z'/%3E%3C/svg%3E"
MONO_STAGE = """<section class="kz-stage" aria-label="Kulman Ziman">
  <div class="kz-pin">
    <div class="kz-grid" aria-hidden="true"></div>
    <div class="kz-scene" aria-hidden="true"><div class="kz-logo"></div></div>
    <img class="kz-word" src="/assets/wordmark.png" alt="" width="1013" height="82" aria-hidden="true">
    <div class="kz-copy"></div>
    <div class="kz-cue" aria-hidden="true"><span>Scroll</span><i></i></div>
  </div>
</section>
"""

# Themes share every page and feature; they differ in colours, the 3D world and a few lines of copy.
THEMES = {
    "royal": {"out": "dist", "preview": "preview", "replace": {}},
    "mono": {
        "out": "dist-mono", "preview": "preview-mono", "preview_title": "Kulman Ziman Mono",
        # leftovers from the earlier designs (royal / noir) and retired experiments: not shipped with the white site
        "prune": ["site.css", "motion.js", "world.js", "world-noir.js", "theme-noir.css", "kz-logo.png",
                  "sample-3d.js", "sample-kit.css", "sample-kit.js", "og.jpg", "email"],
        "strip_comments": True,
        "replace": {
            '<meta name="theme-color" content="#030820">': '<meta name="theme-color" content="#ffffff">',
            '<link rel="icon" href="' + ICON + '">': ICON_FILES,
            '<link rel="stylesheet" href="/assets/site.css">': '<link rel="stylesheet" href="/assets/mono.css">',
            '<script src="/assets/three.min.js"></script>\n': '',
            '<script src="/assets/world.js" defer></script>\n': '',
            '<script src="/assets/motion.js" defer></script>': '<script src="/assets/mono.js" defer></script>\n<script src="/assets/smooth.js" defer></script>',
            '<h1 class="extrude">Your business, <em>crowned</em> online.</h1>': '<h1 class="extrude">Websites made to <br><em>level up</em> your business.</h1>',
            '<section class="hero" data-dock="Home" id="top">': MONO_STAGE + '<section class="hero" data-dock="Home" id="top">',
        },
    },

    "noir": {
        "out": "dist-noir", "preview": "preview-noir", "preview_title": "Kulman Ziman Noir",
        "replace": {
            '<meta name="theme-color" content="#030820">': '<meta name="theme-color" content="#050505">',
            ICON: ICON_NOIR,
            '<link rel="stylesheet" href="/assets/site.css">': '<link rel="stylesheet" href="/assets/site.css">\n<link rel="stylesheet" href="/assets/theme-noir.css">',
            '/assets/world.js': '/assets/world-noir.js',
            
            '<canvas id="world"': '<div class="dots" aria-hidden="true"></div>\n<canvas id="world"',
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
<meta name="google-site-verification" content="yGr2c2aswouMfP4rX4NCS5or-65btTR6U0RR6o_cVeE">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Kulman Ziman">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{meta['description']}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE}/og-kz.jpg">
<meta property="og:image:width" content="2400">
<meta property="og:image:height" content="1260">
<meta property="og:image:alt" content="Kulman Ziman: custom websites, built to order.">
<meta name="twitter:image" content="{SITE}/og-kz.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{ICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS}" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
<script>document.documentElement.classList.add('js')</script>
<script>/* opening animation: plays when you enter the site, or click the top-left logo; never for menu/section links, reloads or back/forward */
(function(){{var r=document.documentElement,play=false,nav=performance.getEntriesByType?performance.getEntriesByType('navigation')[0]:null,type=nav?nav.type:'navigate',same=false;
try{{same=!!document.referrer&&new URL(document.referrer).origin===location.origin;}}catch(e){{}}
var from=null;try{{from=sessionStorage.getItem('kz-from');sessionStorage.removeItem('kz-from');}}catch(e){{}}
if(from==='brand')play=true;else if(from==='link')play=false;else play=type==='navigate'&&!same;
if(location.hash==='#intro')play=true;
if(play&&!matchMedia('(prefers-reduced-motion: reduce)').matches){{r.classList.add('intro','intro-hold');
setTimeout(function(){{r.classList.remove('intro-hold');}},1150);setTimeout(function(){{r.classList.remove('intro');}},2400);}}}})();</script>
<script>
/* Arriving from another page of the site: start at the top (links to a spot on the page, back/forward and reload are left alone) */
(function () {{
  var nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  if (location.hash || (nav && nav.type !== 'navigate')) return;
  var fromSite = false;
  try {{ fromSite = sessionStorage.getItem('kz-top') === '1'; sessionStorage.removeItem('kz-top'); }} catch (e) {{}}
  var moved = false, root = document.documentElement;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {{ addEventListener(ev, function () {{ moved = true; }}, {{ once: true, passive: true }}); }});
  function top() {{
    if (moved || (window.scrollY === 0 && !fromSite)) return;
    var b = root.style.scrollBehavior; root.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); root.style.scrollBehavior = b;
  }}
  top(); addEventListener('DOMContentLoaded', top); addEventListener('load', top); addEventListener('pageshow', top);
  [60, 200, 500, 1000].forEach(function (ms) {{ setTimeout(top, ms); }});
  // a viewer that scrolls the whole frame keeps its own position, so bring the top of this page into view there too
  if (fromSite && window.top !== window) addEventListener('load', function () {{ if (!moved) try {{ root.scrollIntoView({{ block: 'start' }}); }} catch (e) {{}} }});
}})();
</script>
<script type="application/ld+json">{json.dumps(ld if len(ld) > 1 else ORG)}</script>
"""


BODY_START = """<a class="skip" href="#main">Skip to content</a>
<div id="kz-intro" aria-hidden="true"><div class="ki-frame"></div><div class="ki-fill"></div><div class="ki-badge"><i></i></div></div>
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
    <nav aria-label="Main"><ul class="nav-links">{links}<li class="nav-get"><a class="btn" href="{CHECKOUT}">Get started</a></li></ul></nav>
    <div class="nav-cta">
      <a class="btn ghost" href="/#start">Send a brief</a>
      <a class="btn small" href="{CHECKOUT}">Get started</a>
      <button class="menu-btn" aria-label="Menu" aria-expanded="false"><span></span><span></span></button>
    </div>
  </div>
</header>
"""


FOOTER = f"""<footer>
  <div class="wrap">
    <div class="grid">
      <div class="reveal">
        <a class="brand" href="/"><img src="/assets/wordmark.png" alt="Kulman Ziman" width="1024" height="76"></a>
        <p>Custom websites, built to order.</p>
        <p style="margin-top:14px"><a href="mailto:{EMAIL}">{EMAIL}</a></p>
      </div>
      <div class="reveal"><h4>Site</h4><ul><li><a href="/">Home</a></li><li><a href="/products">Products &amp; Pricing</a></li><li><a href="/about">About &amp; Contact</a></li><li><a href="/affiliates">Affiliate Program</a></li><li><a href="/help">Help</a></li></ul></div>
      <div class="reveal"><h4>Founders</h4><ul><li><a href="/ryderziman">Ryder Ziman</a></li><li><a href="/rexkulman">Rex Kulman</a></li></ul></div>
      <div class="reveal"><h4>Order</h4><ul><li><a href="https://whop.com/checkout/plan_PI6FfWmjEqWBP/">Starter Website (1 page)</a></li><li><a href="https://whop.com/checkout/plan_nhAPjhAm2Hdoo/">Professional Website (2–3 pages)</a></li><li><a href="https://whop.com/checkout/plan_kayas42uF3j2w/">Premium Website (4–7 pages)</a></li><li><a href="/legal#refund">Refund policy</a></li><li><a href="/legal">Legal</a></li></ul></div>
    </div>
    <div class="base-row"><span>© <span data-year>2026</span> Kulman Ziman. All rights reserved.</span><span>Payments processed securely by Whop.</span></div>
  </div>
</footer>
<script src="{THREE}"></script>
<script src="/assets/world.js" defer></script>
<script src="/assets/site.js" defer></script>
<script src="/assets/motion.js" defer></script>
<script src="/assets/founder-field.js" defer></script>
"""


def gmail_links(html):
    """mailto: links open Gmail's compose window (new tab) with the address, subject and body filled in."""
    def fix(m):
        rest = m.group(1).replace("&amp;", "&")
        to, _, query = rest.partition("?")
        q = dict(urllib.parse.parse_qsl(query))
        params = {"view": "cm", "fs": "1", "to": to}
        if "subject" in q:
            params["su"] = q["subject"]
        if "body" in q:
            params["body"] = q["body"]
        url = "https://mail.google.com/mail/?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
        return f'href="{url.replace("&", "&amp;")}" target="_blank" rel="noopener"'
    return re.sub(r'href="mailto:([^"]+)"', fix, html)


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
        if "." in path.rsplit("/", 1)[-1]:
            return f'{attr}="{path.lstrip("/")}{frag}"'
        return f'{attr}="{path.strip("/")}.html{frag}"'
    return re.sub(r'(href|src)="(/[^"/][^"]*|/|/#[^"]*)"', fix, html)


def bust(html):
    """Add ?v=<content hash> to /assets/*.css and *.js links, so browsers never mix an old cached file with a new page."""
    import hashlib
    def fix(m):
        f = ROOT / m.group(1).lstrip("/")
        return m.group(0) if not f.exists() else f'{m.group(1)}?v={hashlib.md5(f.read_bytes()).hexdigest()[:8]}"'
    return re.sub(r'(/assets/[\w./-]+\.(?:css|js))"', fix, html)


def build(preview=False, theme="royal"):
    th = THEMES[theme]
    out_dir = ROOT / (th["preview"] if preview else th["out"])
    if out_dir.exists():
        shutil.rmtree(out_dir)
    shutil.copytree(ROOT / "assets", out_dir / "assets")
    for f in sorted((ROOT / "static").glob("*")):
        shutil.copy(f, out_dir / f.name)
    for name in th.get("prune", []):
        t = out_dir / "assets" / name
        shutil.rmtree(t) if t.is_dir() else t.unlink(missing_ok=True)
    if not preview:
        shutil.copy(ROOT / "assets" / "og-kz.jpg", out_dir / "og-kz.jpg")              # link-preview image
    pages = sorted((SRC / "pages").glob("*.html"))
    for page in pages:
        text = page.read_text()
        m = re.match(r"---\n(.*?)\n---\n", text, re.S)
        meta = dict(line.split(": ", 1) for line in m.group(1).splitlines())
        body = text[m.end():].replace("{{PACKAGES}}", packages_html()).replace("{{CHECKOUT}}", CHECKOUT).replace("{{EMAIL}}", EMAIL)
        inner = nav(meta.get("nav", "")) + body + package_modal() + FOOTER
        if preview and page.stem == "index":
            # the preview host adds the document skeleton around its main page; it gets a short name
            html = head_tags(dict(meta, title=th.get("preview_title", "Kulman Ziman Preview"))) + BODY_START + inner
        else:
            html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
                    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                    + head_tags(meta) + "</head>\n<body>\n" + BODY_START + inner + "</body>\n</html>\n")
        for a, b in th["replace"].items():
            html = html.replace(a, b)
        html = gmail_links(html)
        if th.get("strip_comments"):
            html = re.sub(r"<!--(?!\[).*?-->\n?", "", html, flags=re.S)
        html = relativize(html) if preview else bust(html)
        # flat files: Vercel (cleanUrls), Netlify, Cloudflare Pages, GitHub Pages and Whop all serve
        # products.html at /products with no trailing slash
        out = out_dir / f"{page.stem}.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html)
        print("built", out.relative_to(ROOT))
    # the four sample sites: standalone pages with their own branding
    for sp in sorted((SRC / "samples").glob("*.html")):
        html = gmail_links(sp.read_text().replace("{{HOME}}", "../index.html" if preview else "/").replace("{{THREE}}", "{{ASSETS}}three.min.js").replace("{{ASSETS}}", "../assets/" if preview else "/assets/"))
        if not preview:
            html = bust(html)
        out = out_dir / "samples" / sp.name
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html)
        print("built", out.relative_to(ROOT))
    if not preview:
        urls = "".join(f"<url><loc>{SITE}{'/' if p.stem == 'index' else '/' + p.stem}</loc></url>" for p in pages)
        urls += "".join(f"<url><loc>{SITE}/samples/{sp.stem}</loc></url>" for sp in sorted((SRC / "samples").glob("*.html")))
        (out_dir / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>')
        (out_dir / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n")
        (out_dir / "vercel.json").write_text('{"cleanUrls": true, "trailingSlash": false}\n')
        # Netlify / Cloudflare Pages: serve each page at its clean address, and forward old links
        rules = ["/fitness-sample /samples/ironpath 301", "/ironpath-app /samples/ironpath 301"]
        rules += [f"/{p.stem}/ /{p.stem} 301" for p in pages if p.stem != "index"]
        rules += [f"/{p.stem} /{p.stem}.html 200" for p in pages if p.stem != "index"]
        rules += [f"/samples/{sp.stem} /samples/{sp.stem}.html 200" for sp in sorted((SRC / "samples").glob("*.html"))]
        (out_dir / "_redirects").write_text("\n".join(rules) + "\n")
        (out_dir / "vercel.json").write_text(json.dumps({"cleanUrls": True, "trailingSlash": False, "redirects": [
            {"source": "/fitness-sample", "destination": "/samples/ironpath", "permanent": True},
            {"source": "/ironpath-app", "destination": "/samples/ironpath", "permanent": True}]}, indent=2) + "\n")


if __name__ == "__main__":
    args = sys.argv[1:]
    theme = args[args.index("--theme") + 1] if "--theme" in args else "royal"
    build(preview="--preview" in args, theme=theme)
