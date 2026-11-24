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

# ---- Made Construction ----
inner, w, h = L.stacked('made', 'construction')
mc = (HERE / 'made-construction.html').read_text().replace('{{LOGO}}', logo_svg(inner, w, h, 'logo', 'Made Construction', 'mc'))
(CL / 'made-construction' / 'index.html').write_text(mc)

# ---- the two one-screen sites ----
name_t = (HERE / 'name-page.html').read_text()
for folder, title, (l1, l2), sub, desc, who in (
        ('jason-cutaiar', 'Jason Cutaiar', ('jason', 'cutaiar'), 'CEO of Made', 'Jason Cutaiar, CEO of Made: real estate, investments and business.', 'Jason'),
        ('made-properties', 'Made Properties', ('made', 'properties'), 'Jason Cutaiar', 'Made Properties, led by Jason Cutaiar: real estate, investments and business.', 'Made Properties')):
    wi, ww, wh = L.single(f'{l1} {l2}')
    a, wa = L.line(l1); b, wb = L.line(l2)
    sw = max(wa, wb)
    st = (L.group(a, 'w1', f' transform="translate({(sw - wa) / 2:.2f} 0)"')
          + L.group(b, 'w1', f' transform="translate({(sw - wb) / 2:.2f} {L.H + 90})"'))
    page = (name_t.replace('{{TITLE_WIDE}}', logo_svg(wi, ww, wh, 'wide', title, folder[:2] + 'w'))
                  .replace('{{TITLE_STACK}}', logo_svg(st, sw, L.H * 2 + 90, 'stack', title, folder[:2] + 's'))
                  .replace('{{TITLE}}', title).replace('{{SUBTITLE}}', sub).replace('{{DESC}}', desc).replace('{{CONTACT_WHO}}', who))
    dst = CL / folder
    dst.mkdir(exist_ok=True)
    (dst / 'index.html').write_text(page)
    texture(dst)
print('built made-construction, jason-cutaiar, made-properties')
