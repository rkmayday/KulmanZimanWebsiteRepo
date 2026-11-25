# Sports Culture: the file Moshe puts on his own domain -> sportsculture-site.zip (repo root)
#   sportsculture-site/index.html   the whole site in ONE file: every picture is built into it, so it works however it is
#                                   put online (uploaded as the homepage, or pasted into a host's "custom code" box)
#   sportsculture-site/READ ME.txt  how to put it online and edit it with the Google Sheet
# Set for launch: search engines allowed, real title.
# Run from anywhere:  python3 clients/make-sportsculture-handoff.py
import base64, json, pathlib, re, shutil, tempfile

R = pathlib.Path(__file__).resolve().parent
SRC = R / "sports-culture"
html = (SRC / "index.html").read_text()
for old, new in (('<title>Sports Culture: homepage concept</title>', '<title>Sports Culture</title>'),
                 ('<meta name="robots" content="noindex">\n', '')):
    assert html.count(old) == 1, old
    html = html.replace(old, new)

# every picture, inside the page: <img src="img/..."> directly, and the ones the page script picks by name through SC_IMG
pics = {f.name: 'data:image/webp;base64,' + base64.b64encode(f.read_bytes()).decode() for f in sorted((SRC / "img").glob("*.webp"))}
html = re.sub(r'src="img/([\w.-]+)"', lambda m: f'src="{pics[m.group(1)]}"', html)
hook = "<script>\n// where the pictures are"
assert html.count(hook) == 1
html = html.replace(hook, "<script>\nwindow.SC_IMG = " + json.dumps(pics) + ";\n</script>\n" + hook)
left = [m.start() for m in re.finditer(r"img/", html)]
assert len(left) == 1, "pictures still loaded from the img folder"            # only the fallback inside scImg remains

README = """Sports Culture website

This is the whole website in one file: index.html. Every picture is built into it, so there is nothing else to upload.

PUTTING IT ONLINE
- With web hosting (for example GoDaddy Web Hosting with cPanel): open the File Manager, go into the public_html
  folder, and upload index.html there, replacing any index.html that is already there. That's it.
- With GoDaddy's Website Builder: add a section, choose HTML (custom code), and paste in everything from index.html.
  Note that the Website Builder shows pasted code inside a box on one of its own pages, with its own header and
  footer, so the site won't fill the whole screen the way it does on its own. For the full-screen site, use web
  hosting (above).

EDITING IT
Most of the site (stats, shows, accounts, clips, brands, sponsors) is edited in the Google Sheet the site is
linked to. Change column B only, never column A. Edits show on the site within about 5 minutes.
Keep the Sheet published (File > Share > Publish to web), or the site falls back to the content built into it.
To show a new account's logo, put a link to the picture in its "Account N logo link" row (a Google Drive link
shared as "Anyone with the link", or a Dropbox link).

PARTNER FORM
The partnership form opens the visitor's email app with their details filled in, addressed to
admin@sportsculturehq.com.
"""

with tempfile.TemporaryDirectory() as t:
    out = pathlib.Path(t) / "sportsculture-site"
    out.mkdir()
    (out / "index.html").write_text(html)
    (out / "READ ME.txt").write_text(README)
    zp = shutil.make_archive(str(R.parent / "sportsculture-site"), "zip", t, "sportsculture-site")
print(zp, pathlib.Path(zp).stat().st_size // 1024, "KB;", "index.html", len(html) // 1024, "KB")
