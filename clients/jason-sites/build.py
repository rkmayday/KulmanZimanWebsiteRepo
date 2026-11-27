# Builds Jason Cutaiar's three sites from the templates here:
#   clients/made-construction/index.html  (madeconstruction.com: madecon.com rebuilt, projects from a Google Sheet)
#   clients/jason-cutaiar/index.html      (jasoncutaiar.com: one screen)
#   clients/made-properties/index.html    (madeproperties.com: one screen)
# The headers use Jason's lettering (lettering.py, drawn from his madecon.com logo).
# Run from anywhere:  python3 clients/jason-sites/build.py      (then clients/make-jason-previews.py for the previews)
import pathlib, re, shutil, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lettering as L

CL = HERE.parent

def stagger(inner, step=.12, start=0.0, groups=('w1', 'w2')):
    """give each letter its own draw delay (--d, in seconds), line by line"""
    out, n = inner, 0
    def rep(m):
        nonlocal n
        s = f'{m.group(0)[:-1]} style="--d:{start + n * step:.2f}">'; n += 1
        return s
    return re.sub(r'<g transform="translate\([^"]+\)">', rep, out)

def logo_svg(inner, w, h, cls, label, uid):
    """three copies of the letters: a faint light edge under them, the dark grey ink, and a soft light that sweeps across now and then"""
    inner = stagger(inner)
    pad = 20
    vb = f'{-pad} {-pad} {w + 2 * pad:.2f} {h + 2 * pad:.2f}'
    sweep = w + 1400
    return (f'<svg class="{cls}" viewBox="{vb}" role="img" aria-label="{label}">'
            f'<defs><linearGradient id="sh{uid}" gradientUnits="userSpaceOnUse" x1="-700" y1="0" x2="0" y2="0">'
            f'<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>'
            f'<animateTransform attributeName="gradientTransform" type="translate" values="0 0;{sweep:.0f} 0;{sweep:.0f} 0" keyTimes="0;.32;1" dur="9s" begin="3s" repeatCount="indefinite"/></linearGradient>'
            f'<mask id="mk{uid}" maskUnits="userSpaceOnUse" x="{-pad}" y="{-pad}" width="{w + 2 * pad:.2f}" height="{h + 2 * pad:.2f}">'
            f'<g fill="none" stroke="#fff" stroke-width="34" stroke-linejoin="miter">{inner}</g></mask></defs>'
            f'<g class="edge" transform="translate(0 4)">{inner}</g><g class="ink">{inner}</g>'
            f'<rect class="shine" x="{-pad}" y="{-pad}" width="{w + 2 * pad:.2f}" height="{h + 2 * pad:.2f}" fill="url(#sh{uid})" mask="url(#mk{uid})"/></svg>')

def texture(dst):
    (dst / 'img').mkdir(parents=True, exist_ok=True)
    shutil.copy(HERE / 'bg.webp', dst / 'img' / 'bg.webp')
    shutil.copy(CL / 'made-construction' / 'img' / 'texture.webp', dst / 'img' / 'texture.webp')

# ---- Nov 27: all three are one screen, laid out like Jason's own mockups (card-page.html) ----
# The first word is "in negative": his lettering as a thin silver outline (the 34-unit strokes, outlined with a filter).
# The earlier full Made Construction site (projects, methods, bio) is kept as clients/made-construction/full.html.
LI = ('<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11H3zM9.5 9.75h3.8v1.5h.06c.53-1 '
      '1.83-2.06 3.77-2.06 4.03 0 4.77 2.6 4.77 6v5.56h-4v-4.93c0-1.18-.02-2.7-1.65-2.7-1.65 0-1.9 1.29-1.9 2.62v5.01h-4z"/></svg>')
LINKEDIN = 'https://www.linkedin.com/in/madecon/'

def lockup(uid, label, rows):
    """rows: [(text, 'neg'|'neg2'|'solid', fit)] stacked, left-aligned. fit: False, True (first line's width) or a text ('mad').
    'neg' letters are hollow, drawn as real vector shapes so they stay sharp at any size: the 34-unit strokes in gray,
    with a slightly thinner copy cut out of their middle through a mask (its ends trimmed on the page, so every end is
    closed). 'neg2' is the same with a thinner cut, the light negative on the small word."""
    y, parts, masks, W = 0.0, [], [], None
    for i, (text, kind, fit) in enumerate(rows):
        letters, w = L.line(text)
        if W is None: W = w
        target = L.line(fit)[1] if isinstance(fit, str) else (W if fit else None)
        k = (target / w) if target else 1.0
        tf = f' transform="translate(0 {y:.2f}) scale({k:.5f})"'
        g = stagger(L.group(letters, 'neg' if kind != 'solid' else 'solid', tf), start=i * .35)
        if kind == 'solid':
            parts.append(g)
        else:
            t = 6.0 if kind == 'neg' else 9.0           # outline thickness in the letters' own units (each side)
            inner = L.group(letters, 'cut', tf).replace('<g class="cut"', f'<g class="cut" data-trim="{t}" stroke-width="{34 - 2 * t}"')
            masks.append(f'<mask id="m{uid}{i}" maskUnits="userSpaceOnUse" x="-60" y="-60" width="99999" height="99999">'
                         f'<rect x="-60" y="-60" width="99999" height="99999" fill="#fff"/>{inner}</mask>')
            parts.append(f'<g mask="url(#m{uid}{i})">{g}</g>')
        W = max(W, w * k)
        y += L.H * k + (70 if i == 0 and fit is False and len(rows) > 1 and rows[1][2] is False else 46)
    h = y - 46
    pad = 20
    return (f'<svg viewBox="{-pad} {-pad} {W + 2 * pad:.2f} {h + 2 * pad:.2f}" role="img" aria-label="{label}"><defs>{"".join(masks)}</defs>'
            + ''.join(parts) + '</svg>')

def lines(items, cls=''):
    return f'<ul class="lines fade f1{(" " + cls) if cls else ""}">' + ''.join(f'<li{(" class=" + chr(34) + c + chr(34)) if c else ""}>{t}</li>' for t, c in items) + '</ul>'

card = (HERE / 'card-page.html').read_text()
PAGES = {
    'made-construction': dict(title='Made Construction', desc='Made Construction: real estate development, led by Jason Cutaiar.', w=440,
        lock=[('made', 'neg', False), ('construction', 'neg2', 'mad')],
        lines=lines([('Real Estate Development', 'big')]), foot=''),
    'made-properties': dict(title='Made Properties', desc='Made Properties, led by Jason Cutaiar: real estate investments, transformation and activation.', w=440,
        lock=[('made', 'neg', False), ('properties', 'neg2', 'mad')],
        lines=lines([('Real Estate Investments', 'big'), ('Transformation', 'in'), ('Activation', 'in')]),
        foot=f'<div class="foot fade f2"><span>Jason Cutaiar &middot; CEO</span><a href="{LINKEDIN}" target="_blank" rel="noopener" aria-label="Jason Cutaiar on LinkedIn">{LI}</a></div>'),
    'jason-cutaiar': dict(title='Jason Cutaiar', desc='Jason Cutaiar: entrepreneur, real estate and investments.', w=500,
        lock=[('jason', 'neg', False), ('cutaiar', 'neg', False)],
        lines=lines([('Entrepreneur', ''), ('Real Estate', ''), ('Investments', '')], 'tc'),
        foot=f'<div class="foot fade f2"><a href="{LINKEDIN}" target="_blank" rel="noopener" aria-label="Jason Cutaiar on LinkedIn">{LI}</a></div>'),
}
full = (HERE / 'made-construction.html').read_text()
mc_inner, mc_w, mc_h = L.stacked('made', 'construction')
(CL / 'made-construction' / 'full.html').write_text(full.replace('{{LOGO}}', logo_svg(mc_inner, mc_w, mc_h, 'logo', 'Made Construction', 'mc')))
# Made Construction keeps the whole site (Methods, every project, the bio): only its first screen and the background
# change to match Jason's card. The new first screen: "made" in negative + construction, the tagline, then Methods.
TRIM_JS = ('<script>document.querySelectorAll("[data-trim]").forEach(g=>{const t=+g.dataset.trim;g.querySelectorAll("path").forEach(p=>{'
           'const L=p.getTotalLength(),f=Math.min(.45,t/L);p.style.strokeDasharray=`0 ${f} ${1-2*f} ${f}`;p.style.strokeDashoffset=0})})</script>')
NEW_HOME_CSS = '''
.cosmic{background:#0b0b0d url(img/bg.webp) center/cover no-repeat}
.cosmic::before{display:none}
.cosmic-old{background:radial-gradient(70% 55% at 38% 22%,rgba(150,150,170,.26),transparent 70%),radial-gradient(60% 50% at 75% 60%,rgba(120,120,140,.12),transparent 70%),linear-gradient(180deg,#2c2c33 0%,#1d1d22 45%,#121215 100%)}
.cosmic::before{background-image:url(img/texture.webp),radial-gradient(circle at 20% 30%,rgba(255,255,255,.35) 1px,transparent 1.4px),radial-gradient(circle at 70% 80%,rgba(255,255,255,.25) 1px,transparent 1.4px);background-size:cover,330px 290px,240px 260px;opacity:.28}
.card-home{position:relative;z-index:1;width:min(calc(100% - 56px),440px);opacity:0;transform:translateY(10px);transition:opacity 1s var(--ease),transform 1s var(--ease)}
.ready .card-home{opacity:1;transform:none}
.card-home svg{display:block;width:100%;height:auto;overflow:visible}
.card-home .neg path{fill:none;stroke:#a3a3aa;stroke-width:34;stroke-linejoin:miter;stroke-linecap:butt}
.card-home .cut path{fill:none;stroke:#000;stroke-linejoin:miter;stroke-linecap:butt;animation:none!important}
.card-home .solid path{fill:none;stroke:#d9d9df;stroke-width:34;stroke-linejoin:miter;stroke-linecap:butt}
.card-home svg path{stroke-dasharray:1;stroke-dashoffset:1;animation:draw 1.5s cubic-bezier(.6,0,.2,1) forwards;animation-delay:calc(.3s + var(--d,0) * 1s)}
.card-home .tag{margin:clamp(28px,5.5vh,44px) 0 0;font:600 clamp(11px,1.3vw,14px)/1.4 Montserrat,Inter,sans-serif;letter-spacing:.32em;text-transform:uppercase;color:#d9d9df}
.card-home .methods-btn{position:static;transform:none;margin-top:clamp(26px,5vh,40px);background:rgba(20,20,23,.5)}
@media (min-width:640px){.card-home .methods-btn{position:static;transform:none}}
'''
full_page = full.replace('{{LOGO}}', '')
home_old = full_page[full_page.index('<section class="frame cosmic home"'):full_page.index('</section>', full_page.index('<section class="frame cosmic home"')) + len('</section>')]
home_new = ('<section class="frame cosmic home" id="f-home" aria-label="Home">'
            f'<div class="card-home"><h1 style="margin:0" aria-label="Made Construction">{lockup("mh", "Made Construction", PAGES["made-construction"]["lock"])}</h1>'
            '<p class="tag">Real Estate Development</p>'
            '<button class="methods-btn" type="button" data-go="1">Methods</button></div>' + TRIM_JS
            + home_old[home_old.index('<div class="explore"'):] if '<div class="explore"' in home_old else
            '<section class="frame cosmic home" id="f-home" aria-label="Home">'
            f'<div class="card-home"><h1 style="margin:0" aria-label="Made Construction">{lockup("mh", "Made Construction", PAGES["made-construction"]["lock"])}</h1>'
            '<p class="tag">Real Estate Development</p>'
            '<button class="methods-btn" type="button" data-go="1">Methods</button></div></section>')
mc_page = full_page.replace(home_old, home_new).replace('</style>', NEW_HOME_CSS + '</style>', 1)
mc_page = mc_page.replace('family=Jost', 'family=Montserrat:wght@500;600&family=Jost', 1)
PAGES.pop('made-construction')
shutil.copy(HERE / 'bg.webp', CL / 'made-construction' / 'img' / 'bg.webp')
(CL / 'made-construction' / 'index.html').write_text(mc_page)
for folder, d in PAGES.items():
    page = (card.replace('{{LOCKUP}}', lockup(folder[:2], d['title'], d['lock']) + TRIM_JS).replace('{{LINES}}', d['lines']).replace('{{FOOT}}', d['foot'])
                .replace('{{BLOCK_W}}', str(d['w'])).replace('{{TITLE}}', d['title']).replace('{{DESC}}', d['desc']))
    dst = CL / folder; dst.mkdir(exist_ok=True)
    (dst / 'index.html').write_text(page)
    if folder != 'made-construction': texture(dst)
print('built made-construction, made-properties, jason-cutaiar (one screen each, like Jason\'s mockups)')
