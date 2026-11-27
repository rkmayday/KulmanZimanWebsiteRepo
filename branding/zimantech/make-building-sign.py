import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
W, H = 2812, 348
parts = [('Ziman', 'white'), ('Tech', 'blue')]
size = 400
while True:
    f = ImageFont.truetype('spacegrotesk700.ttf', size)
    bb = f.getbbox('ZimanTech')
    if bb[2] - bb[0] <= W * .82 and bb[3] - bb[1] <= H * .96: break
    size -= 4
bb = f.getbbox('ZimanTech'); x = -bb[0] + 10; y = (H - (bb[3] - bb[1])) // 2 - bb[1]
masks = {}
for word, kind in parts:
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).text((x, y), word, font=f, fill=255); masks[kind] = m
    x += f.getlength(word) - f.getlength(word[-1]) + f.getlength(word[-1])   # advance by the word width
yv = np.linspace(0, 1, H)[:, None]
def face(lo, hi, tint):
    g = np.interp(yv, [0, .5, 1], [hi, (hi + lo) / 2 + 6, lo])
    rng = np.random.default_rng(5); n = cv2.GaussianBlur(rng.normal(0, 2.5, (H, W)).astype(np.float32), (41, 1), 0)
    v = np.clip(g + n, 0, 1.0 * 255)
    return np.dstack([v * tint[0], v * tint[1], v * tint[2]]).clip(0, 255).astype(np.uint8)
white = face(232, 255, (1, 1, 1))
blue = np.dstack([np.interp(yv, [0, 1], [70, 26]) + 0 * np.zeros((H, W)), np.interp(yv, [0, 1], [140, 92]) + 0 * np.zeros((H, W)), np.interp(yv, [0, 1], [255, 228]) + 0 * np.zeros((H, W))]).astype(np.uint8)
sign = Image.new('RGBA', (W, H), (0, 0, 0, 0))
allm = ImageChops.lighter(masks['white'], masks['blue'])
sh = Image.new('RGBA', (W, H), (36, 44, 58, 255)); sh.putalpha(ImageChops.offset(allm, 34, 20).filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * .45)))
sign = Image.alpha_composite(sign, sh)
for kind, col in [('white', (150, 156, 166)), ('blue', (18, 56, 150))]:
    for i in range(1, 11):
        side = Image.new('RGBA', (W, H), col + (255,)); side.putalpha(ImageChops.offset(masks[kind], i, i)); sign = Image.alpha_composite(sign, side)
for kind, arr in [('white', white), ('blue', blue)]:
    fi = Image.fromarray(arr, 'RGB').convert('RGBA'); fi.putalpha(masks[kind]); sign = Image.alpha_composite(sign, fi)
# thin darker outline on the white letters so their edges read against the white wall
ol = ImageChops.subtract(masks['white'].filter(ImageFilter.MaxFilter(5)), masks['white'])
o = Image.new('RGBA', (W, H), (170, 176, 186, 255)); o.putalpha(ol.point(lambda v: int(v * .5)))
sign = Image.alpha_composite(o, sign)
photo = cv2.imread('clean.png'); ph, pw = photo.shape[:2]
src = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
dst = np.float32([[62, 249], [765, 224], [765, 303], [62, 346]])
M = cv2.getPerspectiveTransform(src, dst)
wp = cv2.warpPerspective(np.array(sign), M, (pw, ph), flags=cv2.INTER_AREA, borderValue=(0, 0, 0, 0))
a = wp[:, :, 3:4].astype(np.float32) / 255
out = photo.astype(np.float32) * (1 - a) + wp[:, :, :3][:, :, ::-1].astype(np.float32) * a
cv2.imwrite('zimantech-sign.png', out.astype(np.uint8)); print('font', size)
