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

# for a Lovable project (React, TanStack Start): its homepage is src/routes/index.tsx, so this file replaces that one and
# shows the whole site, full screen. The site is kept as one string, so nothing in it has to be rewritten as React.
# Inside a frame, a link to a place on the page ("#shows") would load the frame's own page instead of scrolling,
# and an email link should open from the main page: the framed copy handles both.
FRAME_FIX = """<script>
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || e.defaultPrevented) return;
  e.preventDefault(); const id = decodeURIComponent(a.getAttribute('href').slice(1)), el = id && document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' }); else scrollTo({ top: 0, behavior: 'smooth' });
});
</script>
</body>"""
framed = html.replace("location.href = 'mailto:", "(window.top || window).location.href = 'mailto:")
assert framed.count("(window.top || window).location.href = 'mailto:") == 1 and framed.count("</body>") == 1
framed = framed.replace("</body>", FRAME_FIX)
LOVABLE = """import { createFileRoute } from "@tanstack/react-router";

// The whole Sports Culture website (built by Ziman Sites), shown full screen.
// Its content is edited in the Google Sheet, not here. Don't ask Lovable's AI to change this file.
const SITE = %s;

const title = "Sports Culture | Sports Media, Athlete-Led Shows";
const description =
  "Sports Culture is a sports media company with 2M+ followers and 200M+ monthly views, launching shows with athletes and building basketballnews.com.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      title="Sports Culture"
      srcDoc={SITE}
      style={{ position: "fixed", inset: 0, width: "100%%", height: "100%%", border: 0, display: "block" }}
    />
  );
}
""" % json.dumps(framed)

README = """Sports Culture website

This is the whole website in one file: index.html. Every picture is built into it, so there is nothing else to upload.

PUTTING IT ONLINE
- In Lovable: open the project's Code view, open src/routes/index.tsx, select everything in it and replace it with
  everything in lovable-index.tsx (from this folder). Then click Publish and Update.
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
    (out / "lovable-index.tsx").write_text(LOVABLE)
    zp = shutil.make_archive(str(R.parent / "sportsculture-site"), "zip", t, "sportsculture-site")
print(zp, pathlib.Path(zp).stat().st_size // 1024, "KB;", "index.html", len(html) // 1024, "KB")
