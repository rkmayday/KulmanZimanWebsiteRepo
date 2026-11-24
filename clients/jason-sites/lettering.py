# Jason's header lettering (the style of his madecon.com logo): any lowercase text -> SVG paths.
# Letters 244 units tall, 34-unit strokes, rounded corners (80-unit outer radius), square ends, 120 units between letters.
import importlib.util, pathlib
H, S = 244, 34
C = S / 2
R = 80 - C
YM = 120.5
GAP = 120
SPACE = 230

def f(v): return ('%.2f' % v).rstrip('0').rstrip('.')

def letter(ch):
    W = 300
    if ch == 'm':
        return [f"M{f(C)} {H}V{f(C)}H{f(W-C-R)}A{f(R)} {f(R)} 0 0 1 {f(W-C)} {f(C+R)}V{H}", f"M{f(W/2)} {f(C)}V{H}"], W
    if ch == 'n':
        return [f"M{f(C)} {H}V{f(C)}H{f(W-C-R)}A{f(R)} {f(R)} 0 0 1 {f(W-C)} {f(C+R)}V{H}"], W
    if ch == 'a':
        r2 = 50
        return [f"M0 {f(C)}H{f(W-C-R)}A{f(R)} {f(R)} 0 0 1 {f(W-C)} {f(C+R)}V{H}",
                f"M{f(W-C)} {f(YM)}H{f(C+r2)}A{f(r2)} {f(r2)} 0 0 0 {f(C)} {f(YM+r2)}V{f(H-C-r2)}A{f(r2)} {f(r2)} 0 0 0 {f(C+r2)} {f(H-C)}H{f(W-C)}"], W
    if ch == 'd':
        return [f"M{f(C)} 0V{H}", f"M{f(C)} {f(C)}H{f(W-C-R)}A{f(R)} {f(R)} 0 0 1 {f(W-C)} {f(C+R)}V{f(H-C-R)}A{f(R)} {f(R)} 0 0 1 {f(W-C-R)} {f(H-C)}H{f(C)}"], W
    if ch == 'p':     # stem, with the bowl in the top half (closing on the middle bar)
        rp = min(R, (YM - C) / 2)
        return [f"M{f(C)} {H}V0", f"M{f(C)} {f(C)}H{f(W-C-rp)}A{f(rp)} {f(rp)} 0 0 1 {f(W-C)} {f(C+rp)}V{f(YM-rp)}A{f(rp)} {f(rp)} 0 0 1 {f(W-C-rp)} {f(YM)}H{f(C)}"], W
    if ch in 'ec':
        d = [f"M{W} {f(C)}H{f(C+R)}A{f(R)} {f(R)} 0 0 0 {f(C)} {f(C+R)}V{f(H-C-R)}A{f(R)} {f(R)} 0 0 0 {f(C+R)} {f(H-C)}H{W}"]
        if ch == 'e':
            d.append(f"M{f(C)} {f(YM)}H{W}")
        return d, W
    if ch == 'o':
        return [f"M{f(C+R)} {f(C)}H{f(W-C-R)}A{f(R)} {f(R)} 0 0 1 {f(W-C)} {f(C+R)}V{f(H-C-R)}A{f(R)} {f(R)} 0 0 1 {f(W-C-R)} {f(H-C)}"
                f"H{f(C+R)}A{f(R)} {f(R)} 0 0 1 {f(C)} {f(H-C-R)}V{f(C+R)}A{f(R)} {f(R)} 0 0 1 {f(C+R)} {f(C)}Z"], W
    if ch == 's':
        rr = min(R, (H - C - YM) / 2)
        return [f"M{W} {f(C)}H{f(C+R)}A{f(R)} {f(R)} 0 0 0 {f(C)} {f(C+R)}V{f(YM)}H{f(W-C-rr)}A{f(rr)} {f(rr)} 0 0 1 {f(W-C)} {f(YM+rr)}"
                f"V{f(H-C-rr)}A{f(rr)} {f(rr)} 0 0 1 {f(W-C-rr)} {f(H-C)}H0"], W
    if ch == 't':
        W = 240; x = 96
        return [f"M{f(x)} 0V{f(H-C-R)}A{f(R)} {f(R)} 0 0 0 {f(x+R)} {f(H-C)}H{W}", f"M0 {f(C)}H{f(2*x)}"], W
    if ch == 'r':
        W = 240
        return [f"M{f(C)} {H}V{f(C)}H{f(W-C-R)}A{f(R)} {f(R)} 0 0 1 {f(W-C)} {f(C+R)}V{f(C+R+16)}"], W
    if ch == 'u':
        return [f"M{f(C)} 0V{f(H-C-R)}A{f(R)} {f(R)} 0 0 0 {f(C+R)} {f(H-C)}H{f(W-C)}", f"M{f(W-C)} 0V{H}"], W
    if ch == 'j':     # a stem on the right with a hook to the left at the foot
        W = 240
        return [f"M{f(W-C)} 0V{f(H-C-R)}A{f(R)} {f(R)} 0 0 1 {f(W-C-R)} {f(H-C)}H0"], W
    if ch == 'i':
        return [f"M{f(C)} 0V{H}"], S
    raise ValueError(ch)

def line(text):
    """[(x, [paths])] for one line of lowercase text, and its width"""
    x, out, prev = 0.0, [], None
    for ch in text:
        if ch == ' ':
            x += SPACE; prev = None; continue
        if prev is not None:
            x += GAP
        d, w = letter(ch)
        out.append((x, d)); x += w; prev = ch
    return out, x

def group(letters, cls, transform=''):
    parts = ''.join(f'<g transform="translate({f(x)} 0)">' + ''.join(f'<path pathLength="1" d="{d}"/>' for d in ds) + '</g>' for x, ds in letters)
    return f'<g class="{cls}"{transform}>{parts}</g>'

def single(text, cls='w1'):
    letters, w = line(text)
    return group(letters, cls), w, H

def stacked(top, bottom, gap=46):
    """big top line, bottom line scaled down to the same width (his made/con lockup)"""
    a, wa = line(top); b, wb = line(bottom)
    k = wa / wb
    inner = group(a, 'w1') + group(b, 'w2', f' transform="translate(0 {f(H + gap)}) scale({k:.5f})"')
    return inner, wa, H + gap + H * k

if __name__ == '__main__':
    out = pathlib.Path(__file__).resolve().parent
    for name, (inner, w, h) in {'mc': stacked('made', 'construction'), 'jc': single('jason cutaiar'), 'mp': single('made properties')}.items():
        (out / f'lt-{name}.txt').write_text(f'{f(w)} {f(h)}\n{inner}')
        print(name, f(w), f(h))
    rows = ''.join(f'<svg viewBox="-20 -20 {f(w+40)} {f(h+40)}" width="900" style="display:block;margin:18px auto" fill="none" stroke="#c9c1b6" stroke-width="{S}">{inner}</svg>'
                   for inner, w, h in (stacked('made', 'construction'), single('jason cutaiar'), single('made properties')))
    (out / 'lettering-test.html').write_text(f'<!doctype html><meta charset="utf-8"><body style="margin:0;background:#16171a;padding:20px">{rows}')
