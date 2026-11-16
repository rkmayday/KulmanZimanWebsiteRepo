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
SITE = "https://zimansites.com"
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

EMAIL = "zimansites@gmail.com"
THREE = "/assets/three.min.js"  # self-hosted Three.js r128, no third-party CDN to fail
FONTS = ("https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300..700&family=Bricolage+Grotesque:opsz,wght@12..96,400..800"
         "&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap")
# Pages that live on the current site but are not part of this rebuild
EXTERNAL = {}

NAV = [("home", "/", "Home"), ("products", "/products", "Pricing"), ("about", "/about", "About"),
       ("portfolio", "/portfolio", "Portfolio"), ("affiliates", "/affiliates", "Affiliates"), ("help", "/help", "Help"), ("legal", "/legal", "Legal")]

ORG = {
    "@context": "https://schema.org", "@type": "Organization", "name": "Ziman Sites", "url": SITE,
    "logo": f"{SITE}/logo-512.png", "email": EMAIL, "foundingDate": "2026-11-12",
    "founder": [{"@type": "Person", "name": "Ryder Ziman"}],
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
# Mono tab icon: the real ZS logo shape on a transparent background, black (white when the browser is in dark mode)
ICON_MONO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cstyle%3Epath%7Bfill:%230a0a0a%7D@media (prefers-color-scheme:dark)%7Bpath%7Bfill:%23ffffff%7D%7D%3C/style%3E%3Cpath transform='translate(1 14.69) scale(0.1033)' d='M0.00,0.00 L76.00,0.00 L76.00,137.42 L191.48,0.00 L283.45,0.00 L148.67,158.72 L303.05,333.19 L467.61,67.03 L325.06,66.99 L324.97,0.02 L488.00,0.00 L600.65,0.03 L434.59,268.00 L590.03,268.00 L589.94,335.00 L200.04,335.00 L76.00,192.20 L76.00,335.00 L0.00,335.00 Z'/%3E%3C/svg%3E"
MONO_STAGE = """<section class="kz-stage" aria-label="Ziman Sites">
  <div class="kz-pin">
    <div class="kz-grid" aria-hidden="true"></div>
    <div class="kz-scene" aria-hidden="true"><div class="kz-logo"></div></div>
    <img class="kz-word" src="/assets/wordmark.png" alt="" width="795" height="82" aria-hidden="true">
    <div class="kz-copy"></div>
    <div class="kz-cue" aria-hidden="true"><span>Scroll</span><i></i></div>
  </div>
</section>
<script src="/assets/three.min.js" defer></script>
<script src="/assets/zs-voxels.js" defer></script>
"""

# Themes share every page and feature; they differ in colours, the 3D world and a few lines of copy.
THEMES = {
    "royal": {"out": "dist", "preview": "preview", "replace": {}},
    "mono": {
        "out": "dist-mono", "preview": "preview-mono", "preview_title": "Ziman Sites Mono",
        # leftovers from the earlier designs (royal / noir) and retired experiments: not shipped with the white site
        "prune": ["mono-dark.css", "site.css", "motion.js", "world.js", "world-noir.js", "theme-noir.css", "kz-logo.png",
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

    # the same white site, reversed: black paper and white ink (assets/mono-dark.css + a white 3D logo)
    "monodark": {
        "out": "dist-monodark", "preview": "preview-monodark", "preview_title": "Ziman Sites Dark",
        "base": "mono", "keep": ["mono-dark.css"],
        "replace": {
            '<meta name="theme-color" content="#ffffff">': '<meta name="theme-color" content="#0a0a0a">',
            '<link rel="stylesheet" href="/assets/mono.css">': '<link rel="stylesheet" href="/assets/mono.css">\n<link rel="stylesheet" href="/assets/mono-dark.css">',
            '<html lang="en">': '<html lang="en" class="dark">',
        },
    },

    "noir": {
        "out": "dist-noir", "preview": "preview-noir", "preview_title": "Ziman Sites Noir",
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



def keep_title(html_text, icons_too=True):
    """Some hosts (Whop) swap the page <title> for the website's name; put ours back as soon as the page loads."""
    import html as _h
    m = re.search(r"<title>(.*?)</title>", html_text, flags=re.S)
    if not m or "</body>" not in html_text:
        return html_text
    t = json.dumps(_h.unescape(m.group(1).strip())).replace("</", "<\\/")
    # ...and the same for the tab icon: drop any icon the host added and put the ZS icons back
    icons = ('(function(){var h=document.head;document.querySelectorAll(\'link[rel~="icon"],link[rel="shortcut icon"]\').forEach(function(l){l.remove()});'
             '[["/favicon.svg","image/svg+xml",""],["/favicon-192.png","image/png","192x192"],["/favicon-48.png","image/png","48x48"]].forEach(function(i){'
             'var l=document.createElement("link");l.rel="icon";l.href=i[0]+"?v=zs2";l.type=i[1];if(i[2])l.sizes=i[2];h.appendChild(l)})})();')
    if not icons_too:
        icons = ""
    m2 = re.search(r'href="([^"]*?)favicon\.svg', html_text)
    icons = icons.replace('"/favicon', '"' + (m2.group(1) if m2 else "/") + 'favicon')
    return html_text.replace("</body>", f"<script>document.title={t};{icons}</script>\n</body>", 1)

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
<meta name="google-site-verification" content="AXvv-B5vZ8UKeBBvk5hgx2Oev-Htgv4v5SNwI0AFjUc">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ziman Sites">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{meta['description']}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE}/og-kz.jpg">
<meta property="og:image:width" content="2400">
<meta property="og:image:height" content="1260">
<meta property="og:image:alt" content="Ziman Sites: custom websites, built to order.">
<meta name="twitter:image" content="{SITE}/og-kz.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{ICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS}" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
<script>document.documentElement.classList.add('js')</script>
<script>/* page transition: arriving from another page of the site, this one fades in */
(function(){{try{{if(sessionStorage.getItem('kz-pt')==='1'){{sessionStorage.removeItem('kz-pt');if(!matchMedia('(prefers-reduced-motion: reduce)').matches){{var r=document.documentElement;r.classList.add('pt-in');setTimeout(function(){{r.classList.remove('pt-in');}},400);}}}}}}catch(e){{}}}})();</script>
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
<div id="kz-intro" aria-hidden="true"><div class="ki-frame"></div><div class="ki-fill"></div><div class="ki-badge"><i></i><svg class="ki-draw" viewBox="-12 -12 624 359" aria-hidden="true"><path pathLength="1" d="M10.62,329.34 L10.62,299.14 L178.59,63.23 L22.42,63.23 L22.42,5.66 L284.75,5.66 L284.75,35.86 L116.78,271.3 L288.53,271.3 L288.53,329.34 Z M451.13,335.0 L445.5,334.94 L439.92,334.77 L434.4,334.49 L428.94,334.09 L423.53,333.58 L418.18,332.96 L412.89,332.23 L407.65,331.38 L402.47,330.41 L397.35,329.34 L392.31,328.14 L387.39,326.8 L382.59,325.33 L377.91,323.71 L373.34,321.97 L368.89,320.08 L364.56,318.06 L360.35,315.9 L356.26,313.6 L352.29,311.17 L348.45,308.61 L344.79,305.91 L341.3,303.08 L337.98,300.11 L334.83,297.02 L331.85,293.79 L329.03,290.43 L326.39,286.94 L323.92,283.32 L321.62,279.56 L319.51,275.66 L317.62,271.59 L315.96,267.35 L314.52,262.95 L313.3,258.39 L312.3,253.66 L311.53,248.76 L310.97,243.7 L310.64,238.48 L310.53,233.08 L310.53,232.61 L310.53,232.13 L310.53,231.65 L310.53,231.16 L310.53,230.67 L310.53,230.17 L310.53,229.67 L310.53,229.16 L310.53,228.65 L310.53,228.13 L310.53,227.62 L310.55,227.14 L310.57,226.68 L310.6,226.24 L310.65,225.83 L310.7,225.44 L310.76,225.08 L310.83,224.73 L310.91,224.41 L311.0,224.12 L380.83,224.12 L380.74,224.41 L380.66,224.72 L380.59,225.05 L380.53,225.4 L380.48,225.77 L380.43,226.16 L380.4,226.56 L380.38,226.99 L380.36,227.43 L380.36,227.89 L380.36,228.36 L380.36,228.82 L380.36,229.27 L380.36,229.71 L380.36,230.14 L380.36,230.56 L380.36,230.97 L380.36,231.37 L380.36,231.76 L380.36,232.14 L380.44,235.11 L380.69,237.99 L381.1,240.78 L381.68,243.46 L382.42,246.06 L383.33,248.56 L384.41,250.97 L385.64,253.28 L387.05,255.5 L388.62,257.62 L390.35,259.64 L392.23,261.56 L394.27,263.38 L396.47,265.09 L398.82,266.7 L401.33,268.21 L403.99,269.61 L406.81,270.91 L409.78,272.1 L412.92,273.19 L416.18,274.18 L419.54,275.06 L423.01,275.84 L426.58,276.51 L430.26,277.08 L434.03,277.55 L437.92,277.91 L441.9,278.17 L446.0,278.33 L450.19,278.38 L452.9,278.36 L455.54,278.31 L458.12,278.23 L460.65,278.12 L463.11,277.97 L465.51,277.79 L467.84,277.57 L470.12,277.32 L472.34,277.04 L474.49,276.73 L476.59,276.38 L478.64,276.01 L480.65,275.61 L482.6,275.18 L484.52,274.72 L486.38,274.24 L488.2,273.72 L489.97,273.18 L491.69,272.61 L493.36,272.01 L494.99,271.39 L496.55,270.74 L498.06,270.06 L499.52,269.37 L500.91,268.65 L502.25,267.91 L503.54,267.14 L504.76,266.35 L505.93,265.53 L507.05,264.7 L508.1,263.83 L509.1,262.94 L510.05,262.02 L510.93,261.07 L511.76,260.1 L512.54,259.09 L513.26,258.06 L513.92,257.0 L514.52,255.91 L515.07,254.79 L515.56,253.64 L516.0,252.47 L516.39,251.26 L516.73,250.03 L517.01,248.77 L517.25,247.48 L517.43,246.17 L517.56,244.82 L517.64,243.45 L517.66,242.05 L517.58,239.55 L517.33,237.14 L516.92,234.83 L516.34,232.61 L515.6,230.49 L514.69,228.46 L513.62,226.53 L512.38,224.69 L510.97,222.94 L509.4,221.29 L507.69,219.71 L505.86,218.17 L503.9,216.69 L501.82,215.25 L499.61,213.86 L497.29,212.51 L494.84,211.22 L492.27,209.96 L489.57,208.76 L486.76,207.61 L483.84,206.48 L480.86,205.38 L477.8,204.29 L474.68,203.23 L471.48,202.18 L468.21,201.15 L464.88,200.14 L461.47,199.15 L457.99,198.18 L454.44,197.23 L450.84,196.28 L447.23,195.33 L443.59,194.37 L439.94,193.41 L436.27,192.45 L432.58,191.48 L428.87,190.5 L425.15,189.53 L421.4,188.54 L417.63,187.55 L413.87,186.54 L410.12,185.48 L406.39,184.37 L402.69,183.21 L399.0,182.01 L395.33,180.76 L391.67,179.46 L388.04,178.12 L384.43,176.72 L380.83,175.29 L377.28,173.79 L373.81,172.24 L370.41,170.62 L367.09,168.94 L363.85,167.21 L360.67,165.41 L357.58,163.54 L354.56,161.62 L351.62,159.64 L348.75,157.59 L345.97,155.46 L343.31,153.21 L340.76,150.85 L338.33,148.38 L336.01,145.8 L333.8,143.1 L331.7,140.28 L329.72,137.36 L327.85,134.32 L326.1,131.17 L324.48,127.89 L323.04,124.49 L321.77,120.95 L320.66,117.28 L319.73,113.48 L318.96,109.54 L318.37,105.47 L317.95,101.27 L317.69,96.94 L317.61,92.48 L317.71,87.73 L318.01,83.12 L318.52,78.64 L319.23,74.29 L320.14,70.07 L321.26,65.98 L322.58,62.03 L324.1,58.21 L325.82,54.52 L327.75,50.96 L329.86,47.53 L332.14,44.22 L334.58,41.04 L337.19,37.97 L339.96,35.03 L342.9,32.22 L346.0,29.52 L349.27,26.95 L352.7,24.5 L356.3,22.18 L360.03,19.97 L363.88,17.88 L367.85,15.91 L371.92,14.06 L376.11,12.33 L380.42,10.71 L384.83,9.21 L389.36,7.83 L394.0,6.57 L398.76,5.43 L403.62,4.4 L408.56,3.47 L413.58,2.66 L418.69,1.95 L423.89,1.36 L429.17,0.87 L434.53,0.49 L439.98,0.22 L445.51,0.05 L451.13,0.0 L456.39,0.05 L461.59,0.22 L466.73,0.49 L471.82,0.87 L476.85,1.36 L481.82,1.95 L486.74,2.66 L491.6,3.47 L496.4,4.4 L501.15,5.43 L505.81,6.57 L510.36,7.85 L514.79,9.25 L519.12,10.79 L523.32,12.44 L527.42,14.23 L531.4,16.14 L535.27,18.18 L539.03,20.35 L542.67,22.65 L546.18,25.07 L549.53,27.61 L552.73,30.28 L555.77,33.07 L558.65,35.98 L561.38,39.01 L563.96,42.17 L566.37,45.45 L568.64,48.85 L570.74,52.37 L572.67,56.03 L574.39,59.81 L575.92,63.73 L577.24,67.77 L578.35,71.95 L579.26,76.27 L579.97,80.71 L580.48,85.29 L580.79,90.0 L580.89,94.84 L580.89,100.5 L512.47,100.5 L512.47,96.73 L512.4,94.22 L512.17,91.78 L511.79,89.42 L511.26,87.14 L510.58,84.93 L509.75,82.8 L508.77,80.74 L507.64,78.76 L506.36,76.85 L504.92,75.02 L503.35,73.27 L501.66,71.59 L499.84,69.98 L497.9,68.45 L495.84,67.0 L493.66,65.62 L491.35,64.32 L488.92,63.09 L486.37,61.94 L483.69,60.87 L480.91,59.88 L478.03,59.0 L475.06,58.22 L471.99,57.54 L468.83,56.97 L465.57,56.51 L462.22,56.14 L458.78,55.88 L455.24,55.73 L451.61,55.68 L447.7,55.71 L443.91,55.83 L440.25,56.02 L436.7,56.28 L433.26,56.62 L429.95,57.03 L426.75,57.53 L423.67,58.09 L420.71,58.73 L417.87,59.45 L415.15,60.24 L412.57,61.1 L410.11,62.03 L407.79,63.04 L405.6,64.11 L403.54,65.25 L401.62,66.47 L399.83,67.75 L398.17,69.11 L396.64,70.54 L395.25,72.03 L394.0,73.57 L392.91,75.16 L391.96,76.8 L391.15,78.5 L390.49,80.25 L389.98,82.05 L389.62,83.9 L389.4,85.8 L389.32,87.76 L389.41,89.99 L389.65,92.13 L390.07,94.19 L390.65,96.18 L391.39,98.08 L392.3,99.91 L393.37,101.65 L394.61,103.31 L396.01,104.9 L397.58,106.4 L399.29,107.84 L401.13,109.25 L403.09,110.62 L405.17,111.95 L407.37,113.24 L409.7,114.49 L412.15,115.71 L414.72,116.89 L417.41,118.03 L420.23,119.14 L423.14,120.21 L426.13,121.26 L429.18,122.29 L432.31,123.29 L435.5,124.27 L438.77,125.22 L442.11,126.16 L445.52,127.06 L449.0,127.95 L452.55,128.81 L456.14,129.67 L459.76,130.55 L463.39,131.44 L467.04,132.36 L470.71,133.29 L474.4,134.25 L478.11,135.22 L481.84,136.21 L485.59,137.22 L489.35,138.25 L493.12,139.3 L496.86,140.4 L500.59,141.53 L504.3,142.7 L507.99,143.91 L511.66,145.15 L515.31,146.44 L518.95,147.76 L522.56,149.12 L526.15,150.51 L529.7,151.96 L533.18,153.49 L536.57,155.08 L539.89,156.74 L543.14,158.48 L546.31,160.28 L549.41,162.16 L552.43,164.1 L555.37,166.12 L558.24,168.21 L561.01,170.38 L563.67,172.65 L566.22,175.02 L568.66,177.49 L570.98,180.06 L573.19,182.73 L575.28,185.5 L577.26,188.36 L579.13,191.33 L580.89,194.39 L582.5,197.57 L583.94,200.87 L585.22,204.29 L586.32,207.83 L587.26,211.5 L588.02,215.29 L588.62,219.2 L589.04,223.23 L589.3,227.39 L589.38,231.67 L589.2,238.98 L588.66,245.99 L587.77,252.72 L586.51,259.15 L584.9,265.29 L582.93,271.13 L580.59,276.69 L577.91,281.95 L574.86,286.92 L571.45,291.59 L567.73,296.0 L563.75,300.16 L559.5,304.08 L554.99,307.75 L550.22,311.17 L545.18,314.35 L539.88,317.29 L534.31,319.98 L528.48,322.42 L522.38,324.62 L516.06,326.59 L509.57,328.36 L502.89,329.91 L496.03,331.26 L489.0,332.4 L481.78,333.34 L474.39,334.07 L466.82,334.58 L459.07,334.9 L451.13,335.0 Z"/></svg></div></div>
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
    <a class="brand" href="/" aria-label="Ziman Sites home"><img src="/assets/wordmark.png" alt="Ziman Sites" width="795" height="82"></a>
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
        <a class="brand" href="/"><img src="/assets/wordmark.png" alt="Ziman Sites" width="795" height="82"></a>
        <p>Custom websites, built to order.</p>
        <p style="margin-top:14px"><a href="mailto:{EMAIL}">{EMAIL}</a></p>
      </div>
      <div class="reveal"><h4>Site</h4><ul><li><a href="/">Home</a></li><li><a href="/products">Products &amp; Pricing</a></li><li><a href="/about">About &amp; Contact</a></li><li><a href="/portfolio">Portfolio</a></li><li><a href="/affiliates">Affiliate Program</a></li><li><a href="/help">Help</a></li><li><a href="/legal">Legal</a></li></ul></div>
      <div class="reveal"><h4>Founder</h4><ul><li><a href="/ryderziman">Ryder Ziman</a></li></ul><h4 style="margin-top:22px">Head of Sales</h4><ul><li><a href="/maximzhukovski">Maxim Zhukovski</a></li></ul></div>
      <div class="reveal"><h4>Order</h4><ul><li><a href="https://whop.com/checkout/plan_PI6FfWmjEqWBP/">Starter Website (1 page)</a></li><li><a href="https://whop.com/checkout/plan_nhAPjhAm2Hdoo/">Professional Website (2–3 pages)</a></li><li><a href="https://whop.com/checkout/plan_kayas42uF3j2w/">Premium Website (4–7 pages)</a></li><li><a href="/legal#refund">Refund policy</a></li><li><a href="/legal">Legal</a></li></ul></div>
    </div>
    <div class="base-row"><span>© <span data-year>2026</span> Ziman Sites. All rights reserved.</span><span>Payments processed securely by Whop.</span></div>
  </div>
</footer>
<script src="{THREE}"></script>
<script src="/assets/world.js" defer></script>
<script src="/assets/site.js" defer></script>
<script src="/assets/motion.js" defer></script>
<script src="/assets/founder-field.js" defer></script>
<script src="/assets/needle-field.js" defer></script>
<script src="/assets/mesh-flow.js" defer></script>
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
    """Add ?v=<content hash> to /assets/ css, js and image links, so browsers never show an old cached file with a new page."""
    import hashlib
    def fix(m):
        f = ROOT / m.group(1).lstrip("/")
        return m.group(0) if not f.exists() else f'{m.group(1)}?v={hashlib.md5(f.read_bytes()).hexdigest()[:8]}"'
    return re.sub(r'(/assets/[\w./-]+\.(?:css|js|jpg|jpeg|png|webp|svg))"', fix, html)


def build(preview=False, theme="royal"):
    th = THEMES[theme]
    if "base" in th:   # a variant of another theme: its settings, plus these extra replacements applied after the base's
        b = THEMES[th["base"]]
        th = {**b, **{k: v for k, v in th.items() if k != "replace"}, "replace": {**b["replace"], **th["replace"]}}
        th["prune"] = [n for n in th.get("prune", []) if n not in th.get("keep", [])]
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
            html = head_tags(dict(meta, title=th.get("preview_title", "Ziman Sites Preview"))) + BODY_START + inner
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
        html = keep_title(html)
        # flat files: Vercel (cleanUrls), Netlify, Cloudflare Pages, GitHub Pages and Whop all serve
        # products.html at /products with no trailing slash
        out = out_dir / f"{page.stem}.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html)
        print("built", out.relative_to(ROOT))
    # the four sample sites: standalone pages with their own branding
    for sp in sorted((SRC / "samples").glob("*.html")):
        html = gmail_links(sp.read_text().replace("{{HOME}}portfolio", "../portfolio.html" if preview else "/portfolio").replace("{{HOME}}", "../index.html" if preview else "/").replace("{{THREE}}", "{{ASSETS}}three.min.js").replace("{{ASSETS}}", "../assets/" if preview else "/assets/"))
        if not preview:
            html = bust(html)
        html = keep_title(html, icons_too=False)   # the demos keep their own icons
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
        rules = ["/fitness-sample /samples/ironpath 301", "/ironpath-app /samples/ironpath 301", "/rexkulman /about 301", "/samples/ashgrove /portfolio 301"]
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
