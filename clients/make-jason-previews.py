# Jason Cutaiar's three draft pages -> hosted previews on the Ziman Sites site:
#   zimansites.com/preview/madeconstruction (clients/made-construction)
#   zimansites.com/preview/madeproperties  (clients/made-properties)
#   zimansites.com/preview/jasoncutaiar    (clients/jason-cutaiar)
# Each becomes a full HTML page (static/preview/<slug>.html) with its images in static/preview/<slug>-img/,
# kept out of search engines.
# Run from anywhere:  python3 clients/jason-sites/build.py && python3 clients/make-jason-previews.py
import pathlib, shutil

R = pathlib.Path(__file__).resolve().parent
OUT = R.parent / "static" / "preview"
SITES = {"made-construction": "madeconstruction", "made-properties": "madeproperties", "jason-cutaiar": "jasoncutaiar"}

for folder, slug in SITES.items():
    src = (R / folder / "index.html").read_text()
    end = src.index("</style>") + len("</style>")
    head, body = src[:end], src[end:]
    head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
    head = head.replace('<meta name="robots" content="noindex">', '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">')
    if "noindex" not in head:
        head = '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">\n' + head
    body = body.replace('src="img/', f'src="{slug}-img/').replace("const IMG = 'img/'", f"const IMG = '{slug}-img/'")
    head = head.replace('url(img/', f'url({slug}-img/')
    html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + head + "\n</head>\n<body>\n" + body.strip() + "\n</body>\n</html>\n")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{slug}.html").write_text(html)
    img_out = OUT / f"{slug}-img"
    if img_out.exists():
        shutil.rmtree(img_out)
    shutil.copytree(R / folder / "img", img_out)
    print(f"/preview/{slug}: {len(list(img_out.iterdir()))} images")
