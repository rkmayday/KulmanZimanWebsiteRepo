# Cut the headphones out of the studio photo (white background) for the Aurel demo.
# Source: Unsplash photo by Stefan Riedl (Unsplash License), https://unsplash.com/photos/r2uugFQvAZ0
# usage: python3 cutout.py photo.jpg out.webp
#
# The table's soft shadows are as grey as the lit side of the cups, so the outline is traced by hand (on the levelled
# photo, at 1200 px) and only the last few pixels of the edge are left to GrabCut, which snaps them to the real edge.
import sys
import cv2
import numpy as np

src, out = sys.argv[1], sys.argv[2]
ANG = 11.0                                   # the photo is tilted: this levels the ear cups
img = cv2.imread(src)
H, W = img.shape[:2]
M = cv2.getRotationMatrix2D((W / 2, H / 2), ANG, 1)
img = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC, borderValue=(245, 245, 245))
k = 1200 / W                                 # traced at 1200 px
small = cv2.resize(img, (1200, 1200), interpolation=cv2.INTER_AREA)

# traced outlines (x, y at 1200 px)
LEFT_CUP = [(550, 653), (500, 660), (455, 678), (422, 700), (400, 735), (389, 780), (386, 830), (392, 880), (415, 930),
            (455, 968), (505, 988), (560, 994), (612, 984), (660, 955), (690, 910), (700, 860), (698, 810), (688, 760),
            (665, 715), (630, 672), (590, 656)]
RIGHT_CUP = [(800, 668), (760, 690), (735, 730), (712, 790), (705, 850), (712, 900), (740, 950), (790, 990), (850, 1008),
             (905, 1002), (960, 970), (1005, 920), (1032, 865), (1042, 810), (1038, 760), (1018, 720), (985, 690), (930, 668), (860, 662)]
# the band is dark, so it is found by its darkness (closed so the mesh is solid); the thin metal arms are boxes
ARMS = [(439, 580, 457, 692), (981, 618, 999, 708)]   # x1, y1, x2, y2


def smooth(pts, n=3):                        # Chaikin corner cutting: a smooth curve through the traced points
    p = np.array(pts, np.float32)
    for _ in range(n):
        q = np.roll(p, -1, axis=0)
        p = np.vstack([np.column_stack([.75 * p[:, 0] + .25 * q[:, 0], .75 * p[:, 1] + .25 * q[:, 1]]),
                       np.column_stack([.25 * p[:, 0] + .75 * q[:, 0], .25 * p[:, 1] + .75 * q[:, 1]])]).reshape(2, -1, 2).transpose(1, 0, 2).reshape(-1, 2)
    return p.astype(np.int32)


g = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
gb = cv2.GaussianBlur(g.astype(np.float32), (0, 0), 1.2)


def snap(poly, inner_from=None, inner_to=None):
    """Move the traced outline onto the cup's real edge: along rays from the cup's centre, the outermost sharp change
    in brightness near the trace (the table's shadows only fade softly, the cup ends at a sharp edge)."""
    pts = smooth(poly).astype(np.float32)
    c = pts.mean(axis=0)
    out = []
    for ang in np.radians(np.arange(0, 360, 1.5)):
        d = np.array([np.cos(ang), np.sin(ang)])
        proj = (pts - c) @ d
        perp = np.abs((pts - c) @ np.array([-d[1], d[0]]))
        r0 = proj[np.argmin(perp + (proj < 0) * 1e6)]          # where the trace crosses this ray
        rs = np.arange(r0 - 45, r0 + 12, .5)
        xy = c + rs[:, None] * d
        v = cv2.remap(gb, xy[:, 0].reshape(1, -1).astype(np.float32), xy[:, 1].reshape(1, -1).astype(np.float32), cv2.INTER_LINEAR)[0]
        grad = np.abs(np.gradient(v, .5))
        strong = np.where(grad > 7)[0]
        deg = np.degrees(ang)
        use_inner = inner_from is not None and inner_from <= deg <= inner_to   # facing the shadow between the cups
        r = (rs[strong.min()] if use_inner else rs[strong.max()]) if len(strong) else r0
        out.append(r)
    out = np.array(out)
    k = 16                                                         # smooth out bad rays
    pad = np.concatenate([out[-k:], out, out[:k]])
    med = np.array([np.median(pad[i:i + 2 * k + 1]) for i in range(len(out))])
    angs = np.radians(np.arange(0, 360, 1.5))
    return c, med


traced = np.zeros((1200, 1200), np.uint8)
ANGS = np.radians(np.arange(0, 360, 1.5))
cl, rl = snap(LEFT_CUP)
cr, rr = snap(RIGHT_CUP)
# the right cup's top-left corner sits in the shadow between the cups; the cups are a mirrored pair, so that stretch
# is the left cup's matching corner, mirrored (scaled to fit, blended in over 20 degrees at each end)
degs = np.degrees(ANGS)
rm = np.interp((180 - degs) % 360, degs, rl, period=360)
outside = (degs < 140) | (degs > 290)
rm *= np.median(rr[outside] / rm[outside])
wgt = np.clip(np.minimum(degs - 140, 290 - degs) / 20, 0, 1)
rr = rr * (1 - wgt) + rm * wgt
poly = lambda c, r: np.stack([c[0] + r * np.cos(ANGS), c[1] + r * np.sin(ANGS)], 1).astype(np.int32)
CUPS = [poly(cl, rl), poly(cr, rr)]
for poly in CUPS:
    cv2.fillPoly(traced, [poly], 1)
# the band: along rays from the middle of its arc, the run of dark pixels (a small minimum filter makes the mesh read
# as dark), with both edges snapped to the sharpest change in brightness
mn = cv2.erode(g, np.ones((7, 7), np.uint8)).astype(np.float32)
C = np.array([718.0, 660.0])
outer, inner = [], []
DEGS = np.arange(186, 355, 1.0)
for deg in DEGS:
    d = np.array([np.cos(np.radians(deg)), np.sin(np.radians(deg))])
    rs = np.arange(120, 520, .5)
    xy = (C + rs[:, None] * d).astype(np.float32)
    ray = lambda im: cv2.remap(im, xy[:, 0].reshape(1, -1), xy[:, 1].reshape(1, -1), cv2.INTER_LINEAR)[0]
    on = ray(mn) < 105
    if not on.any():
        inner.append(None); outer.append(None); continue
    idx = np.where(on)[0]                                     # the longest unbroken run is the band
    runs = np.split(idx, np.where(np.diff(idx) > 6)[0] + 1)
    run = max(runs, key=len)
    gr = np.abs(np.gradient(ray(gb), .5))
    def best(i):
        lo, hi = max(0, i - 24), min(len(rs) - 1, i + 24)
        return rs[lo + int(np.argmax(gr[lo:hi]))]
    inner.append(C + best(run[0]) * d); outer.append(C + best(run[-1]) * d)
def med(pts, k=4):
    pts = np.array(pts); r = np.linalg.norm(pts - C, axis=1); u = (pts - C) / r[:, None]
    rm = np.array([np.median(r[max(0, i - k):i + k + 1]) for i in range(len(r))])
    return C + rm[:, None] * u
# the band is the same on both sides: where one side looks thicker, that is the table's shadow under it, so each
# angle takes the thinner of itself and its mirror image (and no ray may run past the band's normal width)
ro = {d: np.linalg.norm(o - C) for d, o in zip(DEGS, outer) if o is not None}
ri = {d: np.linalg.norm(i - C) for d, i in zip(DEGS, inner) if i is not None}
keep = [d for d in DEGS if d in ro]
med_out = np.median([ro[d] for d in keep])
O, I = [], []
for d in keep:
    m = 540 - d
    t = ro[d] - ri[d]
    if m in ro:
        t = min(t, ro[m] - ri[m])
    r_out = min(ro[d], med_out + 40)
    u = np.array([np.cos(np.radians(d)), np.sin(np.radians(d))])
    O.append(C + r_out * u); I.append(C + (r_out - max(20, t)) * u)
ring = np.vstack([med(O), med(I)[::-1]]).astype(np.int32)
band = np.zeros_like(traced); cv2.fillPoly(band, [ring], 1)
band &= 1 - traced
traced |= band
for x1, y1, x2, y2 in ARMS:
    traced[y1:y2, x1:x2] |= (g[y1:y2, x1:x2] < 215).astype(np.uint8)

fg = traced * 255
cv2.imwrite(out + '.mask.png', fg)

# full size, soft edge
a = cv2.resize(fg, (W, H), interpolation=cv2.INTER_LINEAR)
a = cv2.erode(a, np.ones((3, 3), np.uint8))
a = cv2.GaussianBlur(a, (0, 0), 1.5).astype(np.float32) / 255
# take the white table out of the soft edge, so no light halo shows on a dark page
f = img.astype(np.float32)
am = np.clip(a, 0.05, 1)[..., None]
f = np.clip((f - (1 - am) * 240) / am, 0, 255)
rgba = np.dstack([f, a * 255]).astype(np.uint8)
ys, xs = np.where(rgba[..., 3] > 8)
pad = 12
rgba = rgba[max(0, ys.min() - pad):ys.max() + pad, max(0, xs.min() - pad):xs.max() + pad]
ow = 1400
rgba = cv2.resize(rgba, (ow, int(rgba.shape[0] * ow / rgba.shape[1])), interpolation=cv2.INTER_AREA)
cv2.imwrite(out, rgba, [cv2.IMWRITE_WEBP_QUALITY, 90])
print(out, rgba.shape)
