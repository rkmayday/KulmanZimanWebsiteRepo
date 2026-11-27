import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
W, H = 2812, 348
badge = Image.open('badge.png').convert('RGBA')
bh = int(H * .98); bw = int(badge.width * bh / badge.height)
badge = badge.resize((bw, bh), Image.LANCZOS)
txt = 'Ziman Development'; gap = 80; avail = W - bw - gap
size = 320
while True:
    f = ImageFont.truetype('jost.ttf', size); bb = f.getbbox(txt)
    if bb[2] - bb[0] <= avail: break
    size -= 4
bb = f.getbbox(txt); tw, th = bb[2] - bb[0], bb[3] - bb[1]
tx = bw + gap - bb[0]; ty = (H - th) // 2 - bb[1] + 4
mask = Image.new('L', (W, H), 0); ImageDraw.Draw(mask).text((tx, ty), txt, font=f, fill=255)
yv = np.linspace(0, 1, H)[:, None]
base = np.interp(yv, [0, .18, .42, .5, .62, .85, 1], [236, 250, 196, 214, 176, 226, 204])
rng = np.random.default_rng(3); brush = cv2.GaussianBlur(rng.normal(0, 6, (H, W)).astype(np.float32), (61, 1), 0)
face = np.clip(base + brush, 0, 255); face = np.dstack([face * .985, face * .99, face]).astype(np.uint8)
faceI = Image.fromarray(face, 'RGB').convert('RGBA'); faceI.putalpha(mask)
bmask = Image.new('L', (W, H), 0); bmask.paste(badge.split()[3], (0, (H - bh) // 2))
sign = Image.new('RGBA', (W, H), (0, 0, 0, 0))
allmask = ImageChops.lighter(mask, bmask)
shadow = Image.new('RGBA', (W, H), (40, 48, 60, 255)); shadow.putalpha(ImageChops.offset(allmask, 34, 20).filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * .42)))
sign = Image.alpha_composite(sign, shadow)
for m, col in [(mask, (112, 118, 126)), (bmask, (40, 42, 78))]:
    for i in range(1, 10):
        side = Image.new('RGBA', (W, H), col + (255,)); side.putalpha(ImageChops.offset(m, i, i)); sign = Image.alpha_composite(sign, side)
sign = Image.alpha_composite(sign, faceI)
sign.alpha_composite(badge, (0, (H - bh) // 2))
edge = ImageChops.subtract(mask, ImageChops.offset(mask, 0, 3))
hl = Image.new('RGBA', (W, H), (255, 255, 255, 255)); hl.putalpha(edge.point(lambda v: int(v * .6)))
sign = Image.alpha_composite(sign, hl)
print('font', size, 'text', tw, '/', avail)
photo = cv2.imread('clean.png'); ph, pw = photo.shape[:2]
src = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
dst = np.float32([[62, 249], [765, 224], [765, 303], [62, 346]])
M = cv2.getPerspectiveTransform(src, dst)
warped = cv2.warpPerspective(np.array(sign), M, (pw, ph), flags=cv2.INTER_AREA, borderValue=(0, 0, 0, 0))
a = warped[:, :, 3:4].astype(np.float32) / 255
out = photo.astype(np.float32) * (1 - a) + warped[:, :, :3][:, :, ::-1].astype(np.float32) * a
cv2.imwrite('ziman-development-sign.png', out.astype(np.uint8))
cv2.imwrite('crop.png', cv2.resize(out[180:370, 30:790].astype(np.uint8), None, fx=2, fy=2, interpolation=cv2.INTER_LANCZOS4))
