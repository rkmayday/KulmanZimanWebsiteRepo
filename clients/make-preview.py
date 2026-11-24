# Rebuilds the Sports Culture draft preview from the main version: python3 clients/make-preview.py
import pathlib
R = pathlib.Path(__file__).resolve().parent
s = (R / "sports-culture/index.html").read_text(); v = s
R_ = [('<title>Sports Culture: homepage concept</title>', '<title>Draft preview · Sports Culture (by Ziman Sites)</title>'), ('<meta name="robots" content="noindex">', '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">'), ('<header class="nav">', '<div id="dpb" style="position:sticky;top:0;z-index:200;background:#fff;color:#000;text-align:center;font:600 13px/1.4 system-ui,sans-serif;padding:9px 14px;border-bottom:2px solid #000">\n  <b>Draft preview by Ziman Sites</b> · Not the live Sports Culture site yet · For review only</div>\n<script>(() => { const b = document.getElementById(\'dpb\'), f = () => document.documentElement.style.setProperty(\'--bh\', b.offsetHeight + \'px\'); f(); addEventListener(\'resize\', f); addEventListener(\'load\', f); })();</script>\n<header class="nav">'), ('.nav{position:sticky;top:0;', '.nav{position:sticky;top:var(--bh,38px);'), ("  document.getElementById('pf').addEventListener('submit', e => {\n    e.preventDefault(); const f = e.target;", "  document.getElementById('pf').addEventListener('submit', e => {\n    e.preventDefault(); const t = document.getElementById('thanks'); t.textContent = 'This is a draft preview: the form is switched off until launch.'; t.style.display = 'block'; return;\n    const f = e.target;"), ('<a class="ml" href="mailto:admin@sportsculturehq.com">admin@sportsculturehq.com</a>', '<span class="ml">admin@sportsculturehq.com</span>')]
for a, b in R_:
    assert v.count(a) == 1, a[:40]; v = v.replace(a, b)
(R / "sports-culture-preview/index.html").write_text(v)
(R.parent / "static/preview/sportsculture.html").write_text(v)
print("preview rebuilt")
