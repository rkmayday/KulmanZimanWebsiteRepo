# Jason Cutaiar's three draft pages -> hosted previews on the Ziman Sites site:
#   zimansites.com/preview/madeconstruction (clients/made-construction)
#   zimansites.com/preview/madeproperties  (clients/made-properties)
#   zimansites.com/preview/jasoncutaiar    (clients/jason-cutaiar)
# Each becomes a full HTML page (static/preview/<slug>.html) with its photos in static/preview/<slug>-img/,
# kept out of search engines, and the links between the three point at each other's preview.
# Run from anywhere:  python3 clients/make-jason-previews.py
import pathlib, re, shutil

R = pathlib.Path(__file__).resolve().parent
OUT = R.parent / "static" / "preview"
SITES = {"made-construction": "madeconstruction", "made-properties": "madeproperties", "jason-cutaiar": "jasoncutaiar"}
# the drafts link to each other's claude.ai preview; on zimansites.com they link to each other's /preview page
LINKS = {"https://claude.ai/artifact/7wPXjGjGr8wShFYU3Coeu6": "madeconstruction", "https://claude.ai/artifact/EfkTubUQpZVN8gDxirbKDE": "madeproperties"}

for folder, slug in SITES.items():
    src = (R / folder / "index.html").read_text()
    end = src.index("</style>") + len("</style>")
    head, body = src[:end], src[end:]
    head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
    head = head.replace('<meta name="robots" content="noindex">', '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">')
    for url, to in LINKS.items():
        body = body.replace(f'href="{url}" target="_blank" rel="noopener"', f'href="{to}"')
    body = body.replace('src="img/', f'src="{slug}-img/')
    html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + head + "\n</head>\n<body>\n" + body.strip() + "\n</body>\n</html>\n")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{slug}.html").write_text(html)
    # only the photos the page uses
    img_out = OUT / f"{slug}-img"
    if img_out.exists():
        shutil.rmtree(img_out)
    img_out.mkdir()
    used = sorted(set(re.findall(rf'src="{slug}-img/([^"]+)"', html)))
    for name in used:
        shutil.copy(R / folder / "img" / name, img_out / name)
    left = [u for u in LINKS if u in html]
    print(f"/preview/{slug}: {len(used)} photos" + (f"  (still links to {left})" if left else ""))
