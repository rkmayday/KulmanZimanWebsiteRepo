# Portfolio snapshot of the Sports Culture site exactly as Ziman Sites built it (Moshe can change his live site from
# his Google Sheet, so the portfolio shows this frozen copy instead):
#   zimansites.com/work/sports-culture  ->  static/work/sports-culture.html + static/work/sports-culture-img/
# Frozen: the Google Sheet is switched off, so it always shows the content it launched with.
# Kept out of search engines, so it never competes with the real site. The partner form is switched off.
# Run from anywhere:  python3 clients/make-work-snapshot.py
import pathlib, shutil

R = pathlib.Path(__file__).resolve().parent
OUT = R.parent / "static" / "work"
SLUG = "sports-culture"
s = (R / "sports-culture/index.html").read_text()

BAR = ('<div id="wsb" style="position:sticky;top:0;z-index:200;background:#0a0a0a;color:#fff;display:flex;justify-content:center;align-items:center;gap:14px;flex-wrap:wrap;'
       'font:500 13px/1.4 system-ui,sans-serif;padding:9px 14px;border-bottom:1px solid #222">'
       '<span><b>Built by Ziman Sites</b> · Sports Culture, as launched</span>'
       '<a href="https://sportsculturehq.com" target="_blank" rel="noopener" style="color:#fff">Visit the live site ↗</a>'
       '<a href="/portfolio" style="color:#bbb">← Portfolio</a></div>\n'
       "<script>(() => { const b = document.getElementById('wsb'), f = () => document.documentElement.style.setProperty('--bh', b.offsetHeight + 'px'); f(); addEventListener('resize', f); addEventListener('load', f); })();</script>\n")
REPL = [
    ('<title>Sports Culture: homepage concept</title>', '<title>Sports Culture · Built by Ziman Sites</title>'),
    ('<meta name="robots" content="noindex">', '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">'),
    ('<header class="nav">', BAR + '<header class="nav">'),
    ('.nav{position:sticky;top:0;', '.nav{position:sticky;top:var(--bh,38px);'),
    ("window.SC_SHEET = '", "window.SC_SHEET = ''; window.SC_SHEET_LIVE = '"),
    ("  document.getElementById('pf').addEventListener('submit', e => {\n    e.preventDefault(); const f = e.target;",
     "  document.getElementById('pf').addEventListener('submit', e => {\n    e.preventDefault(); const t = document.getElementById('thanks'); t.textContent = 'This is a portfolio copy: the form is switched off here.'; t.style.display = 'block'; return;\n    const f = e.target;"),
    ('<a class="ml" href="mailto:admin@sportsculturehq.com">admin@sportsculturehq.com</a>', '<span class="ml">admin@sportsculturehq.com</span>'),
]
for a, b in REPL:
    assert s.count(a) == 1, a[:50]
    s = s.replace(a, b)
s = s.replace('src="img/', f'src="{SLUG}-img/').replace("'img/' + n", f"'{SLUG}-img/' + n").replace('url(img/', f'url({SLUG}-img/')
assert 'img/' not in s.replace(f'{SLUG}-img/', ''), 'a picture still points at img/'

OUT.mkdir(parents=True, exist_ok=True)
(OUT / f"{SLUG}.html").write_text(s)
img = OUT / f"{SLUG}-img"
if img.exists():
    shutil.rmtree(img)
shutil.copytree(R / "sports-culture/img", img, ignore=shutil.ignore_patterns("*.png", "*.jpg"))
print(f"/work/{SLUG}: {len(list(img.iterdir()))} images")
