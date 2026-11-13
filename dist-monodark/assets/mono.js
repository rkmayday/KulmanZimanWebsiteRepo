// Ziman Sites "Mono" theme. The one big interactive moment: the ZS logo stage on the home page.
// A solid 3D ZS (stacked layers) turns as you scroll, then the Z and the S slide apart to reveal the headline.
// Everything else on the site stays calm. Respects reduced motion.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };

  // thin reading-progress line
  const bar = $('.progress');
  let barRaf = 0;
  const onBar = () => { barRaf = 0; const max = document.documentElement.scrollHeight - innerHeight; bar && bar.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0); };
  addEventListener('scroll', () => { if (!barRaf) barRaf = requestAnimationFrame(onBar); }, { passive: true }); onBar();

  const stage = $('.kz-stage');
  if (!stage) return;
  const logo = $('.kz-logo', stage), copy = $('.kz-copy', stage), word = $('.kz-word', stage), grid = $('.kz-grid', stage), cue = $('.kz-cue', stage);

  // the headline, text and buttons live in the page's hero; move them into the stage (one copy of the content)
  const heroCopy = $('.hero .hero-copy'), heroTags = $('.hero .hero-tags');
  if (heroCopy) [...heroCopy.children].forEach(n => copy.append(n));
  if (heroTags) copy.append(heroTags);

  // the solid logo is drawn on one canvas: a stack of logo-shaped slices, black on the front and lighter toward the back.
  // (It used to be 60 masked 3D layers in the DOM, which the browser had to repaint on every frame: very laggy.)
  const phone = matchMedia('(max-width: 720px)').matches;
  const DARK = document.documentElement.classList.contains('dark');   // the reversed (black) version: a white logo
  const N = reduce ? 1 : (phone ? 18 : 30);
  const scene = $('.kz-scene', stage);
  const cv = document.createElement('canvas'); cv.className = 'kz-canvas'; scene.prepend(cv);
  const g = cv.getContext('2d');
  // ZS outline (the same shapes as kz-logo.svg, 600x335): the Z and the S, which slide apart
  const ZP = [[10.6,329.3],[10.6,299.1],[178.6,63.2],[22.4,63.2],[22.4,5.7],[284.8,5.7],[284.8,35.9],[116.8,271.3],[288.5,271.3],[288.5,329.3]];
  const SP = [[451.1,335],[445.5,334.9],[439.9,334.8],[434.4,334.5],[428.9,334.1],[423.5,333.6],[418.2,333],[412.9,332.2],[407.6,331.4],[402.5,330.4],[397.4,329.3],[392.3,328.1],[387.4,326.8],[382.6,325.3],[377.9,323.7],[373.3,322],[368.9,320.1],[364.6,318.1],[360.4,315.9],[356.3,313.6],[352.3,311.2],[348.4,308.6],[344.8,305.9],[341.3,303.1],[338,300.1],[334.8,297],[331.9,293.8],[329,290.4],[326.4,286.9],[323.9,283.3],[321.6,279.6],[319.5,275.7],[317.6,271.6],[316,267.4],[314.5,262.9],[313.3,258.4],[312.3,253.7],[311.5,248.8],[311,243.7],[310.6,238.5],[310.5,233.1],[310.5,232.6],[310.5,232.1],[310.5,231.7],[310.5,231.2],[310.5,230.7],[310.5,230.2],[310.5,229.7],[310.5,229.2],[310.5,228.7],[310.5,228.1],[310.5,227.6],[310.6,227.1],[310.6,226.7],[310.6,226.2],[310.6,225.8],[310.7,225.4],[310.8,225.1],[310.8,224.7],[310.9,224.4],[311,224.1],[380.8,224.1],[380.7,224.4],[380.7,224.7],[380.6,225.1],[380.5,225.4],[380.5,225.8],[380.4,226.2],[380.4,226.6],[380.4,227],[380.4,227.4],[380.4,227.9],[380.4,228.4],[380.4,228.8],[380.4,229.3],[380.4,229.7],[380.4,230.1],[380.4,230.6],[380.4,231],[380.4,231.4],[380.4,231.8],[380.4,232.1],[380.4,235.1],[380.7,238],[381.1,240.8],[381.7,243.5],[382.4,246.1],[383.3,248.6],[384.4,251],[385.6,253.3],[387.1,255.5],[388.6,257.6],[390.4,259.6],[392.2,261.6],[394.3,263.4],[396.5,265.1],[398.8,266.7],[401.3,268.2],[404,269.6],[406.8,270.9],[409.8,272.1],[412.9,273.2],[416.2,274.2],[419.5,275.1],[423,275.8],[426.6,276.5],[430.3,277.1],[434,277.6],[437.9,277.9],[441.9,278.2],[446,278.3],[450.2,278.4],[452.9,278.4],[455.5,278.3],[458.1,278.2],[460.6,278.1],[463.1,278],[465.5,277.8],[467.8,277.6],[470.1,277.3],[472.3,277],[474.5,276.7],[476.6,276.4],[478.6,276],[480.6,275.6],[482.6,275.2],[484.5,274.7],[486.4,274.2],[488.2,273.7],[490,273.2],[491.7,272.6],[493.4,272],[495,271.4],[496.6,270.7],[498.1,270.1],[499.5,269.4],[500.9,268.6],[502.2,267.9],[503.5,267.1],[504.8,266.4],[505.9,265.5],[507.1,264.7],[508.1,263.8],[509.1,262.9],[510.1,262],[510.9,261.1],[511.8,260.1],[512.5,259.1],[513.3,258.1],[513.9,257],[514.5,255.9],[515.1,254.8],[515.6,253.6],[516,252.5],[516.4,251.3],[516.7,250],[517,248.8],[517.2,247.5],[517.4,246.2],[517.6,244.8],[517.6,243.4],[517.7,242.1],[517.6,239.6],[517.3,237.1],[516.9,234.8],[516.3,232.6],[515.6,230.5],[514.7,228.5],[513.6,226.5],[512.4,224.7],[511,222.9],[509.4,221.3],[507.7,219.7],[505.9,218.2],[503.9,216.7],[501.8,215.2],[499.6,213.9],[497.3,212.5],[494.8,211.2],[492.3,210],[489.6,208.8],[486.8,207.6],[483.8,206.5],[480.9,205.4],[477.8,204.3],[474.7,203.2],[471.5,202.2],[468.2,201.2],[464.9,200.1],[461.5,199.2],[458,198.2],[454.4,197.2],[450.8,196.3],[447.2,195.3],[443.6,194.4],[439.9,193.4],[436.3,192.4],[432.6,191.5],[428.9,190.5],[425.1,189.5],[421.4,188.5],[417.6,187.6],[413.9,186.5],[410.1,185.5],[406.4,184.4],[402.7,183.2],[399,182],[395.3,180.8],[391.7,179.5],[388,178.1],[384.4,176.7],[380.8,175.3],[377.3,173.8],[373.8,172.2],[370.4,170.6],[367.1,168.9],[363.9,167.2],[360.7,165.4],[357.6,163.5],[354.6,161.6],[351.6,159.6],[348.8,157.6],[346,155.5],[343.3,153.2],[340.8,150.8],[338.3,148.4],[336,145.8],[333.8,143.1],[331.7,140.3],[329.7,137.4],[327.9,134.3],[326.1,131.2],[324.5,127.9],[323,124.5],[321.8,121],[320.7,117.3],[319.7,113.5],[319,109.5],[318.4,105.5],[317.9,101.3],[317.7,96.9],[317.6,92.5],[317.7,87.7],[318,83.1],[318.5,78.6],[319.2,74.3],[320.1,70.1],[321.3,66],[322.6,62],[324.1,58.2],[325.8,54.5],[327.8,51],[329.9,47.5],[332.1,44.2],[334.6,41],[337.2,38],[340,35],[342.9,32.2],[346,29.5],[349.3,26.9],[352.7,24.5],[356.3,22.2],[360,20],[363.9,17.9],[367.9,15.9],[371.9,14.1],[376.1,12.3],[380.4,10.7],[384.8,9.2],[389.4,7.8],[394,6.6],[398.8,5.4],[403.6,4.4],[408.6,3.5],[413.6,2.7],[418.7,1.9],[423.9,1.4],[429.2,0.9],[434.5,0.5],[440,0.2],[445.5,0.1],[451.1,0],[456.4,0.1],[461.6,0.2],[466.7,0.5],[471.8,0.9],[476.9,1.4],[481.8,1.9],[486.7,2.7],[491.6,3.5],[496.4,4.4],[501.1,5.4],[505.8,6.6],[510.4,7.8],[514.8,9.2],[519.1,10.8],[523.3,12.4],[527.4,14.2],[531.4,16.1],[535.3,18.2],[539,20.4],[542.7,22.6],[546.2,25.1],[549.5,27.6],[552.7,30.3],[555.8,33.1],[558.6,36],[561.4,39],[564,42.2],[566.4,45.5],[568.6,48.9],[570.7,52.4],[572.7,56],[574.4,59.8],[575.9,63.7],[577.2,67.8],[578.4,72],[579.3,76.3],[580,80.7],[580.5,85.3],[580.8,90],[580.9,94.8],[580.9,100.5],[512.5,100.5],[512.5,96.7],[512.4,94.2],[512.2,91.8],[511.8,89.4],[511.3,87.1],[510.6,84.9],[509.8,82.8],[508.8,80.7],[507.6,78.8],[506.4,76.8],[504.9,75],[503.4,73.3],[501.7,71.6],[499.8,70],[497.9,68.5],[495.8,67],[493.7,65.6],[491.4,64.3],[488.9,63.1],[486.4,61.9],[483.7,60.9],[480.9,59.9],[478,59],[475.1,58.2],[472,57.5],[468.8,57],[465.6,56.5],[462.2,56.1],[458.8,55.9],[455.2,55.7],[451.6,55.7],[447.7,55.7],[443.9,55.8],[440.2,56],[436.7,56.3],[433.3,56.6],[429.9,57],[426.8,57.5],[423.7,58.1],[420.7,58.7],[417.9,59.5],[415.1,60.2],[412.6,61.1],[410.1,62],[407.8,63],[405.6,64.1],[403.5,65.2],[401.6,66.5],[399.8,67.8],[398.2,69.1],[396.6,70.5],[395.2,72],[394,73.6],[392.9,75.2],[392,76.8],[391.1,78.5],[390.5,80.2],[390,82],[389.6,83.9],[389.4,85.8],[389.3,87.8],[389.4,90],[389.6,92.1],[390.1,94.2],[390.6,96.2],[391.4,98.1],[392.3,99.9],[393.4,101.7],[394.6,103.3],[396,104.9],[397.6,106.4],[399.3,107.8],[401.1,109.2],[403.1,110.6],[405.2,112],[407.4,113.2],[409.7,114.5],[412.1,115.7],[414.7,116.9],[417.4,118],[420.2,119.1],[423.1,120.2],[426.1,121.3],[429.2,122.3],[432.3,123.3],[435.5,124.3],[438.8,125.2],[442.1,126.2],[445.5,127.1],[449,128],[452.6,128.8],[456.1,129.7],[459.8,130.6],[463.4,131.4],[467,132.4],[470.7,133.3],[474.4,134.2],[478.1,135.2],[481.8,136.2],[485.6,137.2],[489.4,138.2],[493.1,139.3],[496.9,140.4],[500.6,141.5],[504.3,142.7],[508,143.9],[511.7,145.2],[515.3,146.4],[519,147.8],[522.6,149.1],[526.1,150.5],[529.7,152],[533.2,153.5],[536.6,155.1],[539.9,156.7],[543.1,158.5],[546.3,160.3],[549.4,162.2],[552.4,164.1],[555.4,166.1],[558.2,168.2],[561,170.4],[563.7,172.7],[566.2,175],[568.7,177.5],[571,180.1],[573.2,182.7],[575.3,185.5],[577.3,188.4],[579.1,191.3],[580.9,194.4],[582.5,197.6],[583.9,200.9],[585.2,204.3],[586.3,207.8],[587.3,211.5],[588,215.3],[588.6,219.2],[589,223.2],[589.3,227.4],[589.4,231.7],[589.2,239],[588.7,246],[587.8,252.7],[586.5,259.1],[584.9,265.3],[582.9,271.1],[580.6,276.7],[577.9,281.9],[574.9,286.9],[571.5,291.6],[567.7,296],[563.8,300.2],[559.5,304.1],[555,307.8],[550.2,311.2],[545.2,314.4],[539.9,317.3],[534.3,320],[528.5,322.4],[522.4,324.6],[516.1,326.6],[509.6,328.4],[502.9,329.9],[496,331.3],[489,332.4],[481.8,333.3],[474.4,334.1],[466.8,334.6],[459.1,334.9],[451.1,335]];
  const SHAPES = [{ pts: ZP, k: true }, { pts: SP, k: false }];
  const S = { rx: 0, ry: 0, ls: 1, ly: 0, kx: 0, zx: 0, ho: 1, fv: 10, sx: 40 };
  let W = 0, H = 0, cw = 0, ch = 0, dpr = 1;
  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    cw = scene.clientWidth; ch = scene.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    W = logo.offsetWidth; H = W * 335 / 600;
  };
  const draw = () => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const D = 1500, cx0 = cw / 2, cy0 = ch / 2, depth = W * (phone ? .06 : .075);
    const ay = S.ry * Math.PI / 180, ax = S.rx * Math.PI / 180, cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
    // same maths as the CSS it replaces: translateY(ly) scale(ls) rotateX(rx) rotateY(ry), perspective 1500px
    const P = (x, y, z) => {
      const x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
      const y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
      const f = D / (D - z2);
      return [cx0 + x1 * S.ls * f, cy0 + (y1 * S.ls + S.ly) * f];
    };
    const fc = S.fv, hi = Math.round(fc + (255 - fc) * .22);
    for (let i = N - 1; i >= 0; i--) {
      const front = i === 0;
      if (!front && S.ho <= .002) continue;
      const z = -i * depth / Math.max(1, N - 1);
      const c = DARK ? Math.round(232 - i / Math.max(1, N - 1) * 150) : Math.round(26 + i / Math.max(1, N - 1) * 120);
      for (const sh of SHAPES) {
        const hx = sh.k ? S.kx : S.zx;
        g.beginPath();
        sh.pts.forEach(([u, v], j) => { const q = P((u / 600 - .5) * W + hx, (v / 335 - .5) * H, z); j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); });
        g.closePath();
        if (front) {
          // the soft light sweep across the face (a 115deg gradient on the face, projected)
          const dx = Math.sin(115 * Math.PI / 180), dy = -Math.cos(115 * Math.PI / 180), len = Math.abs(W * dx) + Math.abs(H * dy);
          const a = P(-dx * len / 2 + hx, -dy * len / 2, 0), b = P(dx * len / 2 + hx, dy * len / 2, 0);
          const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]), m = clamp(S.sx / 100), col = `rgb(${fc},${fc},${fc})`;
          gr.addColorStop(0, col); gr.addColorStop(clamp(m - .14), col); gr.addColorStop(m, `rgb(${hi},${hi},${hi})`); gr.addColorStop(clamp(m + .14), col); gr.addColorStop(1, col);
          g.globalAlpha = 1; g.fillStyle = gr;
        } else { g.globalAlpha = S.ho; g.fillStyle = `rgb(${c},${c},${c})`; }
        g.fill();
      }
    }
    g.globalAlpha = 1;
  };
  const pinTop = () => parseFloat(getComputedStyle($('.kz-pin', stage)).top) || 0;
  let pinT = pinTop();
  size(); draw();
  let lastW = innerWidth, lastH = innerHeight;
  addEventListener('resize', () => {
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (innerWidth === lastW && (fine ? innerHeight === lastH : Math.abs(innerHeight - lastH) < 120)) return;   // ignore the phone address bar
    lastW = innerWidth; lastH = innerHeight; size(); draw(); pinT = pinTop();
  });

  if (reduce) { document.documentElement.classList.add('no-kz'); return; }

  // scroll + pointer drive the scene
  let target = 0, prog = 0, px = 0, py = 0, tpx = 0, tpy = 0, running = false;
  // after the animation, the pinned scene starts moving with the page gradually (its speed ramps from 0 to normal),
  // so the hand-off to normal scrolling has no jolt. Driven straight from the scroll position, so it never lags.
  const pin = $('.kz-pin', stage), HOLD = .85;   // the scene starts moving with the page once the Z and S are in place and the headline is fully in
  // No dead scroll after the reveal: the logo turns at a steady pace, then once the Z and S start to separate
  // each bit of scrolling moves them a little less (the pace eases down smoothly), and the page starts carrying
  // the scene away while the split is still finishing, so something is always moving.
  // EXTRA matches the extra height given to .kz-stage in mono.css for this eased part.
  let lastMb = null;
  const EXTRA = .36, SPLIT = .36 / .87;          // SPLIT: where the Z and S start to separate, on the timeline
  const readScroll = () => {
    const r = stage.getBoundingClientRect(), t = pinT, y = t - r.top;
    const Rt = Math.max(1, r.height - (lastH - t));          // whole pinned scroll
    const Ra = Math.max(1, Rt - lastH * EXTRA);               // pace of the turn (unchanged)
    const y0 = SPLIT * Ra, Ls = Math.max(1, Rt - y0);               // eased part: from the split to the end
    // end pace as a share of the start pace, chosen so the timeline ends exactly at the end of the stage
    const sEnd = clamp(2 * (1 - SPLIT) * Ra / Ls - 1, .15, 1);
    const ease = u => u - (1 - sEnd) * u * u / 2;                     // pace falls in a straight line from 1 to sEnd
    target = y <= y0 ? clamp(y / Ra) : clamp(SPLIT + (Ls / Ra) * ease(clamp((y - y0) / Ls)));
    // hand-off: from the moment the headline is fully in, the scene starts moving with the page (speed 0 -> normal)
    const c = (HOLD - SPLIT) * Ra / Ls, k = 1 - sEnd;
    const uH = k < 1e-4 ? c : (1 - Math.sqrt(Math.max(0, 1 - 2 * k * c))) / k;
    const yHold = y0 + uH * Ls, H = Math.max(1, Rt - yHold), h = clamp(y - yHold, 0, H);
    // from the stop at the headline the scene moves exactly with the page: no scroll room at all
    pin.style.transform = h > 0 ? `translate3d(0,${(-h).toFixed(1)}px,0)` : '';
    // easing in only covers half the ramp, so pull the next section up by that half: it arrives right behind the headline (no gap)
    const mb = Math.round(-H); if (mb !== lastMb) { lastMb = mb; stage.style.marginBottom = mb + 'px'; }
    // one scroll gesture stops here, when the logo animation has finished (smooth.js)
    // ...exactly where the animation has finished and before the page starts moving on
    stage.dataset.stopY = Math.round(scrollY + r.top - t + yHold);
    kick();
  };
  addEventListener('scroll', readScroll, { passive: true });
  stage.__refreshStop = readScroll;                             // smooth.js asks for a fresh stop point before every wheel step
  if (window.ResizeObserver) new ResizeObserver(readScroll).observe(stage);
  addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; tpx = e.clientX / innerWidth - .5; tpy = e.clientY / innerHeight - .5; kick(); }, { passive: true });

  const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
  function frame() {
    prog += (target - prog) * .32; px += (tpx - px) * .08; py += (tpy - py) * .08;
    const p = prog * .87;            // the stage is 13% shorter than the timeline: same animation, half the hold after it
    const a = smooth(p / .42);                    // turn: shows the depth
    const b = smooth((p - .36) / .38);            // split: Z and S slide apart
    const ry = -24 + a * 44 - b * 20 + px * 14;
    const rx = 12 - a * 16 + b * 4 - py * 10;
    const spread = innerWidth * (phone ? .62 : .45);
    S.ry = ry; S.rx = rx; S.ls = 1 - b * .3; S.ly = -b * 24; S.kx = -b * spread; S.zx = b * spread;
    S.ho = 1 - smooth(b * 1.6);                       // the sides fade away first
    S.fv = DARK ? Math.round(246 - b * 206) : Math.round(10 + b * 218);                  // the face turns light grey, staying crisp
    S.sx = 25 + a * 45 + px * 25;
    draw();
    // the name spells out under the logo, then makes room
    word.style.setProperty('--ws', (1.06 - a * .06).toFixed(4));
    word.style.setProperty('--wo', (1 - smooth((p - .28) / .14)).toFixed(3));
    cue.style.setProperty('--co', (1 - smooth(p / .06)).toFixed(3));
    grid.style.setProperty('--gy', (-p * 140).toFixed(1) + 'px');
    // the headline rises into the gap
    const o = smooth((p - .5) / .24);
    copy.style.setProperty('--o2', o.toFixed(3));
    copy.style.setProperty('--y2', ((1 - o) * 40).toFixed(1) + 'px');
    copy.classList.toggle('live', o > .6);
    if (Math.abs(target - prog) > .0005 || Math.abs(tpx - px) > .001 || Math.abs(tpy - py) > .001) requestAnimationFrame(frame); else running = false;
  }
  readScroll(); prog = target; frame();
})();
