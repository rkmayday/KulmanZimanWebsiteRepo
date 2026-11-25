# Vaelor demo: cuts a real watch photo into the layers that come apart as you scroll -> assets/vaelor/*.webp
#   watch.jpg     free Pexels photo by Puneet Kaul (pexels.com/photo/36426758): the watch, straight on
#   movement.jpg  free Pexels photo (pexels.com/photo/416339): a real movement, from above
# From the photo: the bezel, the dial (its maker's name, logo and small print replaced with "VAELOR"), the case
# and bracelet. Made to match: the inside of the case, the winding rotor, the caseback and the crystal.
# Run from anywhere:  python3 src/samples/vaelor-src/make-layers.py
import json, pathlib
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parents[2] / 'assets' / 'vaelor'
OUT.mkdir(parents=True, exist_ok=True)
SERIF, MONO = str(HERE / 'BodoniModa.ttf'), str(HERE / 'IBMPlexMono.ttf')

src = cv2.imread(str(HERE / 'watch.jpg'))                    # BGR, 2768 x 1848
H0, W0 = src.shape[:2]
C = (1295.8, 959.4); R = 398                                  # bezel: centre and outer edge
CI = (1294.2, 963.8); RI = 303                                # crystal edge / dial
CASE = (880, 0, 1770, 1848)                                   # the case + bracelet layer
HEAD = (886, 549, 1706, 1369)                                 # the round layers (820 x 820)
yy, xx = np.mgrid[0:H0, 0:W0].astype(np.float32)
def dist(c): return np.hypot(xx - c[0], yy - c[1])
def soft(d, edge, w=1.2): return np.clip((edge - d) / w + .5, 0, 1)   # 1 inside, antialiased edge
def save(name, rgb, a, box):
    x0, y0, x1, y1 = box
    rgba = np.dstack([rgb[y0:y1, x0:x1, ::-1], (np.clip(a, 0, 1) * 255).astype(np.uint8)[y0:y1, x0:x1]])
    Image.fromarray(rgba.astype(np.uint8), 'RGBA').save(OUT / f'{name}.webp', 'WEBP', quality=86, method=6, alpha_quality=90)

# ---------------- the dial: rebrand it ----------------
dial = src.copy()
g = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
rI = dist(CI); ang = np.degrees(np.arctan2(yy - CI[1], xx - CI[0]))
def box_mask(boxes, rmin=0, rmax=999):
    m = np.zeros(g.shape, np.float32)
    for x0, y0, x1, y1 in boxes: m[y0:y1, x0:x1] = 1
    m[(rI < rmin) | (rI > rmax)] = 0
    return m
def fill(img, mask, deg):
    # paint over the masked area with dial taken from the same distance from the centre, `deg` further round
    # (so the brushed sunburst lines up), with its brightness matched to the dial around the area
    ys, xs = np.where(mask > 0); x0, x1, y0, y1 = xs.min() - 10, xs.max() + 11, ys.min() - 10, ys.max() + 11
    px, py = np.meshgrid(np.arange(x0, x1, dtype=np.float32), np.arange(y0, y1, dtype=np.float32))
    r = np.hypot(px - CI[0], py - CI[1]); t = np.arctan2(py - CI[1], px - CI[0]) + np.radians(deg)
    mx, my = (CI[0] + r * np.cos(t)).astype(np.float32), (CI[1] + r * np.sin(t)).astype(np.float32)
    patch = cv2.remap(src, mx, my, cv2.INTER_CUBIC).astype(np.float32)
    m = mask[y0:y1, x0:x1]
    ring = (cv2.dilate(m, np.ones((9, 9), np.uint8)) > 0) & (m == 0)
    dst = img[y0:y1, x0:x1].astype(np.float32)
    patch += dst[ring].mean(0) - patch[ring].mean(0)
    w = cv2.GaussianBlur(cv2.dilate(m, np.ones((5, 5), np.uint8)), (0, 0), 2.6)[..., None]
    out = img.copy(); out[y0:y1, x0:x1] = np.clip(dst * (1 - w) + patch * w, 0, 255).astype(np.uint8)
    return out
# the maker's name at 12, its logo above "AUTOMATIC", and the small print at 6 (only the ring it is printed in,
# so the minute track around it stays)
dial = fill(dial, box_mask([(1222, 824, 1371, 864)]), -78)
dial = fill(dial, box_mask([(1279, 1020, 1321, 1059)]), 180)
dial = fill(dial, box_mask([(1184, 1183, 1242, 1217), (1233, 1200, 1278, 1224), (1321, 1193, 1388, 1224)], 235, 264), 60)
# the new name, printed where the old one was
pil = Image.fromarray(dial[:, :, ::-1].copy())
lay = Image.new('RGBA', pil.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
f = ImageFont.truetype(SERIF, 31); txt = 'VAELOR'; gap = 5
ws = [d.textlength(ch, font=f) for ch in txt]; tw = sum(ws) + gap * (len(txt) - 1); x = 1296.3 - tw / 2
for ch, w in zip(txt, ws):
    d.text((x + 1, 845.5 + 1.2), ch, font=f, fill=(8, 8, 8, 170), anchor='lm')
    d.text((x, 845.5), ch, font=f, fill=(214, 214, 208, 255), anchor='lm'); x += w + gap
lay = lay.filter(ImageFilter.GaussianBlur(.45))
pil = Image.alpha_composite(pil.convert('RGBA'), lay).convert('RGB')
dial = np.array(pil)[:, :, ::-1].copy()
save('dial', dial, soft(rI, RI), HEAD)

# ---------------- the bezel ----------------
rO = dist(C)
save('bezel', src, soft(rO, R) * (1 - soft(rI, RI)), HEAD)

# ---------------- the case and bracelet ----------------
X0 = 820; roi = src[:, X0:1800].copy(); h, w = roi.shape[:2]
gm = np.full((h, w), cv2.GC_BGD, np.uint8)
cv2.rectangle(gm, (1070 - X0, 0), (1530 - X0, h - 1), cv2.GC_PR_BGD, -1)
cv2.rectangle(gm, (1110 - X0, 0), (1490 - X0, h - 1), cv2.GC_PR_FGD, -1)
cv2.circle(gm, (int(C[0]) - X0, int(C[1])), 420, cv2.GC_PR_BGD, -1)
cv2.circle(gm, (int(C[0]) - X0, int(C[1])), 392, cv2.GC_FGD, -1)
cv2.rectangle(gm, (1690 - X0, 880), (1775 - X0, 1040), cv2.GC_PR_FGD, -1)
cv2.rectangle(gm, (1160 - X0, 0), (1430 - X0, h - 1), cv2.GC_FGD, -1)
bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
cv2.grabCut(roi, gm, None, bg, fg, 6, cv2.GC_INIT_WITH_MASK)
body = np.zeros(g.shape, np.uint8); body[:, X0:1800] = np.where((gm == cv2.GC_FGD) | (gm == cv2.GC_PR_FGD), 255, 0)
# the four lugs (the bottom two sit in shadow, so they are drawn as the mirror of the top two)
top = np.array([(1100, 503), (1527, 503), (1572, 604), (1600, 690), (1300, 760), (996, 690), (1034, 604)], np.int32)
bot = top.copy(); bot[:, 1] = (2 * C[1] - bot[:, 1]).astype(np.int32)
cv2.fillPoly(body, [top, bot], 255)
n, lab, st, _ = cv2.connectedComponentsWithStats(body); k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); body = np.where(lab == k, 255, 0).astype(np.uint8)
body = cv2.morphologyEx(body, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
a = cv2.GaussianBlur(body.astype(np.float32) / 255, (0, 0), 1.0)
a = np.maximum(a, soft(rO, R))
# the bracelet fades out towards the top and bottom of the picture
fade = np.clip(np.minimum(yy - 10, H0 - 10 - yy) / 300, 0, 1); fade = fade * fade * (3 - 2 * fade); a *= fade
# under the bezel: the top of the case (brushed steel) and, inside it, the empty case where the movement sits
case = src.copy().astype(np.float32)
th = np.arctan2(yy - C[1], xx - C[0])
light = .55 + .45 * np.clip(-np.sin(th) * .8 + np.cos(th) * .2, -1, 1)          # lit from above, like the photo
rng = np.random.default_rng(3); brush = cv2.GaussianBlur(rng.normal(0, 1, (H0, W0)).astype(np.float32), (0, 0), sigmaX=6, sigmaY=.6)
steel = (58 + 70 * light + 7 * brush)[..., None] * np.array([1.0, 1.0, 1.02], np.float32)
ring = soft(rO, R) * (1 - soft(rO, RI - 4))
edge = soft(rO, R) * (1 - soft(rO, R - 6))
inner = soft(rI, RI - 4)
inside = (14 + 26 * np.clip(rI / RI, 0, 1) ** 3)[..., None] * np.array([1, 1, 1.05], np.float32)
step = soft(rI, RI - 4) * (1 - soft(rI, RI - 16))
case = case * (1 - ring[..., None]) + steel * ring[..., None]
case = case * (1 - edge[..., None]) + (steel + 45) * edge[..., None]
case = case * (1 - inner[..., None]) + inside * inner[..., None]
case = case * (1 - step[..., None]) + (steel * .8) * step[..., None]
save('case', np.clip(case, 0, 255).astype(np.uint8), a, CASE)

# ---------------- the movement: a real one, with a winding rotor over half of it ----------------
mv = cv2.imread(str(HERE / 'movement.jpg'))
MC, MR, RM = (3030, 2008), 1880, 288                          # its centre and radius in that photo -> radius in ours
s = RM / MR
mvs = cv2.resize(mv, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
mvs = cv2.convertScaleAbs(mvs, alpha=.86, beta=-6)
mvs = cv2.cvtColor(mvs, cv2.COLOR_BGR2HSV); mvs[..., 1] = (mvs[..., 1] * .85).astype(np.uint8); mvs = cv2.cvtColor(mvs, cv2.COLOR_HSV2BGR)
mcx, mcy = MC[0] * s, MC[1] * s
M = np.float32([[1, 0, CI[0] - mcx], [0, 1, CI[1] - mcy]])
movement = cv2.warpAffine(mvs, M, (W0, H0), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
# the rotor: a brushed, gold-toned half disc that covers the top right (and the old maker's engraving)
a0, a1 = np.radians(220), np.radians(400)
tha = np.mod(np.arctan2(yy - CI[1], xx - CI[0]) - a0, 2 * np.pi)
inarc = (tha < (a1 - a0)).astype(np.float32)
rot = soft(rI, RM - 2) * (1 - soft(rI, 46)) * inarc
rot = cv2.GaussianBlur(rot, (0, 0), .8)
grain = np.sin(rI * 1.9) * 9 + cv2.GaussianBlur(rng.normal(0, 1, (H0, W0)).astype(np.float32), (0, 0), sigmaX=.6, sigmaY=.6) * 7
# circular graining reflects the light as a bright streak across the rotor
shade = .5 + .38 * np.cos(tha - 1.25) ** 2 + .22 * np.exp(-((tha - 1.9) / .25) ** 2)
gold = np.dstack([82 * shade + grain, 142 * shade + grain, 188 * shade + grain])     # BGR
rimr = soft(rI, RM - 2) * (1 - soft(rI, RM - 9)) * inarc
# the straight edge of the half disc catches the light too
lin = np.abs((xx - CI[0]) * np.sin(a0) - (yy - CI[1]) * np.cos(a0))
rimr = np.maximum(rimr, np.clip(1 - lin / 4, 0, 1) * soft(rI, RM - 2) * (1 - soft(rI, 46)) * .8)
shadow = cv2.GaussianBlur(np.roll(np.roll(rot, 7, 0), 5, 1), (0, 0), 6)
movement *= (1 - .55 * shadow * (1 - rot))[..., None]
movement = movement * (1 - rot[..., None]) + gold * rot[..., None]
movement += (40 * rimr)[..., None]
# engraving along the rotor's arc
pil = Image.fromarray(np.clip(movement, 0, 255).astype(np.uint8)[:, :, ::-1].copy()).convert('RGBA')
eng = Image.new('RGBA', pil.size, (0, 0, 0, 0)); f2 = ImageFont.truetype(MONO, 17)
txt = 'VAELOR  ·  AUTOMATIC  ·  TWENTY-FOUR JEWELS'; span = np.radians(150); rr = 222
for i, ch in enumerate(txt):
    t = a0 + np.radians(15) + span * (i + .5) / len(txt)
    tile = Image.new('RGBA', (40, 40), (0, 0, 0, 0)); ImageDraw.Draw(tile).text((20, 20), ch, font=f2, fill=(60, 40, 14, 235), anchor='mm')
    tile = tile.rotate(-np.degrees(t) - 90, resample=Image.BICUBIC)
    eng.alpha_composite(tile, (int(CI[0] + np.cos(t) * rr - 20), int(CI[1] + np.sin(t) * rr - 20)))
pil = Image.alpha_composite(pil, eng).convert('RGB')
movement = np.array(pil)[:, :, ::-1].copy()
save('movement', movement, soft(rI, RM), HEAD)

# ---------------- the caseback: brushed steel, screwed down, engraved ----------------
RB = 388
cb = np.zeros((H0, W0, 3), np.float32)
light2 = .6 + .4 * np.clip(-np.sin(th) * .7 - np.cos(th) * .3, -1, 1)
circ = np.sin(rO * 2.3) * 4 + cv2.GaussianBlur(rng.normal(0, 1, (H0, W0)).astype(np.float32), (0, 0), .7) * 5
base = 70 + 80 * light2 + circ
cb[:] = base[..., None]
lip = soft(rO, RB) * (1 - soft(rO, RB - 34))
cb = cb * (1 - .25 * lip[..., None]) + 18 * lip[..., None]
for k in range(6):                                              # notches for the caseback wrench
    t = k * np.pi / 3 + np.pi / 6; nx, ny = C[0] + np.cos(t) * (RB - 14), C[1] + np.sin(t) * (RB - 14)
    nm = (np.abs((xx - nx) * -np.sin(t) + (yy - ny) * np.cos(t)) < 16) & (np.abs((xx - nx) * np.cos(t) + (yy - ny) * np.sin(t)) < 14)
    cb[nm] *= .45
pil = Image.fromarray(np.clip(cb, 0, 255).astype(np.uint8)[:, :, ::-1].copy()).convert('RGBA')
eng = Image.new('RGBA', pil.size, (0, 0, 0, 0)); de = ImageDraw.Draw(eng)
f3 = ImageFont.truetype(MONO, 19)
txt = 'VAELOR · DIVER\'S 200 M · AUTOMATIC · STAINLESS STEEL · WATER RESISTANT · '
for i, ch in enumerate(txt):
    t = -np.pi / 2 + 2 * np.pi * i / len(txt)
    tile = Image.new('RGBA', (40, 40), (0, 0, 0, 0)); ImageDraw.Draw(tile).text((20, 20), ch, font=f3, fill=(30, 30, 32, 200), anchor='mm')
    tile = tile.rotate(-np.degrees(t) - 90, resample=Image.BICUBIC)
    eng.alpha_composite(tile, (int(C[0] + np.cos(t) * 300 - 20), int(C[1] + np.sin(t) * 300 - 20)))
fV = ImageFont.truetype(SERIF, 170)
de.text((C[0] + 2, C[1] + 3), 'V', font=fV, fill=(255, 255, 255, 70), anchor='mm')
de.text((C[0], C[1]), 'V', font=fV, fill=(28, 28, 30, 190), anchor='mm')
de.ellipse([C[0] - 250, C[1] - 250, C[0] + 250, C[1] + 250], outline=(30, 30, 32, 150), width=2)
pil = Image.alpha_composite(pil, eng.filter(ImageFilter.GaussianBlur(.5))).convert('RGB')
save('caseback', np.array(pil)[:, :, ::-1].copy(), soft(rO, RB), HEAD)

# ---------------- the crystal: clear sapphire, only its edge and a soft reflection show ----------------
cr = np.full((H0, W0, 3), 255, np.float32)
band = np.exp(-(((xx - CI[0]) * .62 + (yy - CI[1]) * .78 + 120) / 70) ** 2)
ca = soft(rI, RI) * (.05 + .22 * band) + soft(rI, RI) * (1 - soft(rI, RI - 7)) * .55
save('crystal', cr.astype(np.uint8), ca, HEAD)

print('layers:', ', '.join(f'{p.name} {p.stat().st_size // 1024} KB' for p in sorted(OUT.glob('*.webp'))))
