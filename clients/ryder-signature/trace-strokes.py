# Trace the signature's pen strokes: skeleton -> graph -> strokes (pen keeps its direction through crossings)
import cv2, numpy as np, json, sys
im = cv2.imread('sig.png', 0)                       # 2390x876 (2x the SVG units)
ink = (im < 128).astype(np.uint8)
# Zhang-Suen thinning
def thin(img):
    img = img.copy(); changed = True
    while changed:
        changed = False
        for step in (0, 1):
            P = np.pad(img, 1)
            p2,p3,p4,p5,p6,p7,p8,p9 = (P[:-2,1:-1],P[:-2,2:],P[1:-1,2:],P[2:,2:],P[2:,1:-1],P[2:,:-2],P[1:-1,:-2],P[:-2,:-2])
            B = p2+p3+p4+p5+p6+p7+p8+p9
            seq = [p2,p3,p4,p5,p6,p7,p8,p9,p2]
            A = sum(((seq[i]==0)&(seq[i+1]==1)).astype(np.uint8) for i in range(8))
            if step == 0: c = (p2*p4*p6==0)&(p4*p6*p8==0)
            else: c = (p2*p4*p8==0)&(p2*p6*p8==0)
            m = (img==1)&(B>=2)&(B<=6)&(A==1)&c
            if m.any(): img[m] = 0; changed = True
    return img
sk = thin(ink)
dist = cv2.distanceTransform(ink, cv2.DIST_L2, 5)
ys, xs = np.nonzero(sk)
pts = set(zip(xs.tolist(), ys.tolist()))
N8 = [(-1,-1),(0,-1),(1,-1),(-1,0),(1,0),(-1,1),(0,1),(1,1)]
nb = lambda p: [(p[0]+dx,p[1]+dy) for dx,dy in N8 if (p[0]+dx,p[1]+dy) in pts]
deg = {p: len(nb(p)) for p in pts}
# walk: from an endpoint, follow pixels; at forks continue in the straightest direction (pen momentum)
used = set(); strokes = []
def walk(start):
    path = [start]; used.add(start); prev_dir = None
    while True:
        cand = [q for q in nb(path[-1]) if q not in used]
        if not cand: break
        if len(path) >= 6:
            v = np.array(path[-1]) - np.array(path[-6]); v = v / (np.linalg.norm(v) + 1e-6)
            cand.sort(key=lambda q: -np.dot(v, (np.array(q) - np.array(path[-1])) / np.linalg.norm(np.array(q) - np.array(path[-1]))))
        q = cand[0]; path.append(q); used.add(q)
        # mark the other immediate neighbours at a fork lightly so we don't spawn 1px spurs
    return path
while True:
    ends = [p for p in pts if p not in used and len([q for q in nb(p) if q not in used]) <= 1]
    rest = [p for p in pts if p not in used]
    if not rest: break
    start = min(ends or rest, key=lambda p: p[0])   # strokes begin at their leftmost free end
    path = walk(start)
    if len(path) > 25: strokes.append(path)
# simplify + width
out = []
for path in strokes:
    a = np.array(path, np.float32)
    k = 7; sm = np.array([a[max(0,i-k):i+k+1].mean(0) for i in range(len(a))])
    ap = cv2.approxPolyDP(sm.reshape(-1,1,2), 1.2, False)[:,0,:] / 2.0   # back to SVG units
    w = float(np.percentile([dist[y,x] for x,y in path], 95)) / 2.0 * 2 + 3
    out.append({'d': 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x,y in ap), 'len': len(path), 'w': round(w,1), 'x0': int(path[0][0]/2), 'y0': int(path[0][1]/2), 'x1': int(path[-1][0]/2), 'y1': int(path[-1][1]/2)})
json.dump(out, open('strokes.json','w'))
for i,o in enumerate(out): print(i, o['len'], o['w'], (o['x0'],o['y0']), '->', (o['x1'],o['y1']))
