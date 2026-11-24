# Turns the Afterglow Detailing page (clients/lambrou-detailing/index.html, also published as its own preview)
# into the official sample at /samples/afterglow: full HTML document, the standard "Demo" bar with a link back
# to the portfolio, its photos under assets/afterglow/, and smooth scrolling on computers (assets/smooth.js).
# Run from anywhere:  python3 clients/make-afterglow-sample.py
import pathlib, shutil

R = pathlib.Path(__file__).resolve().parent
ROOT = R.parent
src = (R / "lambrou-detailing" / "index.html").read_text()

# the page's own head part (title, meta, fonts, style) and its body
head_end = src.index("</style>") + len("</style>")
head, body = src[:head_end], src[head_end:]
head = head.replace('<title>Afterglow Detailing</title>', '<title>Afterglow Detailing — Sample Detailing Site</title>')
head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
icon = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%230a0b0c'/%3E"
        "%3Cpath d='M14 66V52q0-6 5-7l7-7q2-2 5-2h36l12 9 14 2q5 1 5 6v9q0 4-4 4H14z' fill='none' stroke='%23ff7a1a' stroke-width='5' stroke-linejoin='round'/%3E"
        "%3Ccircle cx='30' cy='66' r='8' fill='%230a0b0c' stroke='%23ff2e88' stroke-width='5'/%3E%3Ccircle cx='72' cy='66' r='8' fill='%230a0b0c' stroke='%23ffd21f' stroke-width='5'/%3E%3C/svg%3E")
head = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="description" content="Afterglow Detailing is a fictional car detailing business: a sample concept site built by Ziman Sites.">\n'
        '<meta name="theme-color" content="#0a0b0c">\n'
        f'<link rel="icon" href="{icon}">\n' + head)
# the same "Demo" bar the other samples have: what it is, and the way back
strip_css = ('.demo{display:flex;align-items:center;justify-content:center;gap:18px;background:#f5f4f2;color:#0a0b0c;border:0;font:500 13px/1.2 var(--body);padding:9px 16px;white-space:nowrap;overflow:hidden}\n'
             '.demo b{font-weight:800}.demo i{font-style:normal}.demo a{color:inherit;font-weight:700;text-decoration:underline;text-underline-offset:3px}\n'
             '@media (max-width:640px){.demo{font-size:11.5px;gap:10px;justify-content:space-between}.demo span{overflow:hidden;text-overflow:ellipsis}.demo a{flex:none}}\n'
             '@media (max-width:520px){.demo .ds-x{display:none}}\n')
head = head.replace("</style>", strip_css + "</style>")
old_strip = body[body.index('<div class="demo">'):body.index('</div>', body.index('<div class="demo">')) + 6]
body = body.replace(old_strip, '<div class="demo"><span><b>Demo</b> · <i class="ds-x">This is a one-page website, built </i>by Ziman Sites for <b>$284</b></span>'
                    '<a href="{{HOME}}portfolio">← Back<i class="ds-x"> to Ziman Sites</i></a></div>')
body = body.replace('src="img/', 'src="{{ASSETS}}afterglow/')
html = head + "\n</head>\n<body>\n" + body.strip() + '\n<script src="{{ASSETS}}smooth.js" defer></script>\n</body>\n</html>\n'
(ROOT / "src" / "samples" / "afterglow.html").write_text(html)

# photos the page uses
out = ROOT / "assets" / "afterglow"; out.mkdir(exist_ok=True)
used = 0
for f in sorted((R / "lambrou-detailing" / "img").glob("*.webp")):
    if f'afterglow/{f.name}"' in html:
        shutil.copy(f, out / f.name); used += 1
print("wrote src/samples/afterglow.html and", used, "photos")
