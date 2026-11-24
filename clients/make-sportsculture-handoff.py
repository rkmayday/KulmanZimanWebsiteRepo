# Sports Culture: the files Moshe puts on his own domain -> sportsculture-site.zip (repo root)
#   sportsculture-site/index.html   the page, set for launch (search engines allowed, real title)
#   sportsculture-site/img/         its images
#   sportsculture-site/READ ME.txt  how to put it online and edit it with the Google Sheet
# Run from anywhere:  python3 clients/make-sportsculture-handoff.py
import pathlib, shutil, tempfile

R = pathlib.Path(__file__).resolve().parent
SRC = R / "sports-culture"
html = (SRC / "index.html").read_text()
for old, new in (('<title>Sports Culture: homepage concept</title>', '<title>Sports Culture</title>'),
                 ('<meta name="robots" content="noindex">\n', '')):
    assert html.count(old) == 1, old
    html = html.replace(old, new)

README = """Sports Culture website

PUTTING IT ONLINE
Upload everything in this folder (index.html and the img folder) to the main (root) folder of the domain,
keeping the img folder next to index.html. No server code, database or build step is needed.

EDITING IT
Most of the site (stats, shows, accounts, clips, brands, sponsors) is edited in the Google Sheet the site is
linked to. Change column B only, never column A. Edits show on the site within about 5 minutes.
Keep the Sheet published (File > Share > Publish to web), or the site falls back to the content built into it.

PARTNER FORM
The partnership form opens the visitor's email app with their details filled in, addressed to
admin@sportsculturehq.com.
"""

with tempfile.TemporaryDirectory() as t:
    out = pathlib.Path(t) / "sportsculture-site"
    shutil.copytree(SRC / "img", out / "img")
    (out / "index.html").write_text(html)
    (out / "READ ME.txt").write_text(README)
    zp = shutil.make_archive(str(R.parent / "sportsculture-site"), "zip", t, "sportsculture-site")
print(zp, pathlib.Path(zp).stat().st_size // 1024, "KB")
