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
    shutil.copy(CL / 'made-construction' / 'img' / 'texture.webp', dst / 'img' / 'texture.webp')

# ---- Nov 27: all three are one screen, laid out like Jason's own mockups (card-page.html) ----
# The first word is "in negative": his lettering as a thin silver outline (the 34-unit strokes, outlined with a filter).
# The earlier full Made Construction site (projects, methods, bio) is kept as clients/made-construction/full.html.
LI = ('<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11H3zM9.5 9.75h3.8v1.5h.06c.53-1 '
      '1.83-2.06 3.77-2.06 4.03 0 4.77 2.6 4.77 6v5.56h-4v-4.93c0-1.18-.02-2.7-1.65-2.7-1.65 0-1.9 1.29-1.9 2.62v5.01h-4z"/></svg>')
LINKEDIN = 'https://www.linkedin.com/in/madecon/'

def neg_filter(uid, w, h, pad=40):
    return (f'<filter id="neg{uid}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="{-pad}" y="{-pad}" width="{w + 2 * pad:.0f}" height="{h + 2 * pad:.0f}">'
            '<feMorphology in="SourceAlpha" operator="erode" radius="4.5" result="e"/>'
            '<feComposite in="SourceAlpha" in2="e" operator="out" result="o"/>'
            '<feFlood flood-color="#e2e2e8"/><feComposite in2="o" operator="in"/></filter>')

def lockup(uid, label, rows):
    """rows: [(text, 'neg'|'solid', scale_to_first_width)] stacked, left-aligned"""
    y, parts, W = 0.0, [], None
    for i, (text, kind, fit) in enumerate(rows):
        letters, w = L.line(text)
        if W is None: W = w
        k = (W / w) if fit else 1.0
        g = L.group(letters, kind, f' transform="translate(0 {y:.2f}) scale({k:.5f})"')
        g = stagger(g, start=i * .35)
        parts.append(f'<g filter="url(#neg{uid})">{g}</g>' if kind == 'neg' else g)
        W = max(W, w * k)
        y += L.H * k + (70 if i == 0 and fit is False and len(rows) > 1 and rows[1][2] is False else 46)
    h = y - 46
    pad = 20
    return (f'<svg viewBox="{-pad} {-pad} {W + 2 * pad:.2f} {h + 2 * pad:.2f}" role="img" aria-label="{label}"><defs>{neg_filter(uid, W, h)}</defs>'
            + ''.join(parts) + '</svg>')

def lines(items, cls=''):
    return f'<ul class="lines fade f1{(" " + cls) if cls else ""}">' + ''.join(f'<li{(" class=" + chr(34) + c + chr(34)) if c else ""}>{t}</li>' for t, c in items) + '</ul>'

card = (HERE / 'card-page.html').read_text()
PAGES = {
    'made-construction': dict(title='Made Construction', desc='Made Construction: real estate development, led by Jason Cutaiar.', w=440,
        lock=[('made', 'neg', False), ('construction', 'solid', True)],
        lines=lines([('Real Estate Development', 'big')]), foot=''),
    'made-properties': dict(title='Made Properties', desc='Made Properties, led by Jason Cutaiar: real estate investments, transformation and activation.', w=440,
        lock=[('made', 'neg', False), ('properties', 'solid', True)],
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
for folder, d in PAGES.items():
    page = (card.replace('{{LOCKUP}}', lockup(folder[:2], d['title'], d['lock'])).replace('{{LINES}}', d['lines']).replace('{{FOOT}}', d['foot'])
                .replace('{{BLOCK_W}}', str(d['w'])).replace('{{TITLE}}', d['title']).replace('{{DESC}}', d['desc']))
    dst = CL / folder; dst.mkdir(exist_ok=True)
    (dst / 'index.html').write_text(page)
    if folder != 'made-construction': texture(dst)
print('built made-construction, made-properties, jason-cutaiar (one screen each, like Jason\'s mockups)')
