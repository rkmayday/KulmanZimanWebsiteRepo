// Ironpath sample: the logo in 3D. A polished steel path draws itself upward with the lime ball riding its tip.
// Scrolling pulls it both ways like rubber (the ball end up, the start down), thinning in the middle until it snaps
// with a burst of sparks and both halves fly off the screen. This one plays over a few scrolls so it never looks rushed.
window.S3D && S3D(({ T, scene, cl, sm, easeOut, mix, C, soft }) => {
  const LIME = '#c7f36b';
  const key = new T.DirectionalLight('#ffffff', 3); key.position.set(-3, 5, 6); scene.add(key);
  const fill = new T.DirectionalLight('#dfe8ff', .8); fill.position.set(4, -2, 4); scene.add(fill);
  const rim = new T.DirectionalLight(LIME, 4); rim.position.set(2, 3, -6); scene.add(rim);
  scene.add(new T.HemisphereLight('#f4fff0', '#0a0b0a', .5));

  // the logo's path (same points as the SVG logo, in a 100 x 100 box), with rounded corners
  const P = [[12, 84], [40, 50], [58, 66], [86, 22]].map(([x, y]) => new T.Vector3((x - 50) / 30, (50 - y) / 30, 0));
  const path = new T.CurvePath(), RC = .16;
  let from = P[0];
  for (let k = 1; k < P.length; k++) {
    const a = P[k], dir = a.clone().sub(from).normalize();
    if (k < P.length - 1) {
      const out = P[k + 1].clone().sub(a).normalize(), p1 = a.clone().addScaledVector(dir, -RC), p2 = a.clone().addScaledVector(out, RC);
      path.add(new T.LineCurve3(from, p1)); path.add(new T.QuadraticBezierCurve3(p1, a, p2)); from = p2;
    } else path.add(new T.LineCurve3(from, a));
  }
  const SEG = 420, RAD = 24, TUBE = .15;
  const steel = new T.MeshPhysicalMaterial({ color: C('#eef2ee'), metalness: 1, roughness: .22, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: 1.4 });
  const tube = new T.Mesh(new T.TubeGeometry(path, SEG, TUBE, RAD, false), steel);
  const capA = new T.Mesh(new T.SphereGeometry(TUBE, 32, 16), steel), capB = capA.clone();
  const ball = new T.Mesh(new T.SphereGeometry(8 / 30, 64, 32), new T.MeshPhysicalMaterial({ color: C(LIME), emissive: C(LIME), emissiveIntensity: .35, roughness: .25, clearcoat: 1, clearcoatRoughness: .1 }));
  const logo3 = new T.Group(); logo3.add(tube, capA, capB, ball); scene.add(logo3);
  capA.position.copy(P[0]);
  const glow = new T.Sprite(new T.SpriteMaterial({ map: soft('rgba(199,243,107,.9)', 'rgba(199,243,107,0)'), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(1.6, 1.6, 1); logo3.add(glow);
  steel.transparent = ball.material.transparent = true;

  // remember each tube vertex as (centre of its ring + offset from that centre) so the tube can be bent and thinned
  const G = tube.geometry, POS = G.attributes.position, N = POS.count, RING = RAD + 1;
  const base = new Float32Array(N * 3), cen = [];
  for (let k = 0; k <= SEG; k++) cen.push(path.getPointAt(k / SEG));
  for (let v = 0; v < N; v++) { const c = cen[Math.floor(v / RING)]; base[v * 3] = POS.getX(v) - c.x; base[v * 3 + 1] = POS.getY(v) - c.y; base[v * 3 + 2] = POS.getZ(v) - c.z; }
  // the rubber pulls both ways: the ball end up and to the right, the start down and to the left
  const UP = new T.Vector3(.45, 1, .2).normalize(), DOWN = new T.Vector3(-.45, -1, -.2).normalize(), TB = .5;
  // where a point at t (0 = start, 1 = ball) moves and how thick it is, for pull s and snap k
  const shape = (t, s, k, out) => {
    const m = (t - TB) * 2, side = m >= 0 ? UP : DOWN, reach = m * m;              // 0 in the middle, 1 at the ends
    let thick = 1 - .78 * s * Math.exp(-Math.pow((t - TB) / .16, 2));               // thinnest in the middle
    out.copy(side).multiplyScalar(2.6 * s * reach);
    if (k > 0) {                                                                    // snapped: each half flies off its own way
      out.addScaledVector(side, 13 * Math.pow(k, 1.5) * (.35 + Math.abs(m)));
      thick = mix(thick, 1, easeOut(cl(k * 2))) * sm(Math.abs(t - TB) / .06);       // the torn ends taper to a point
    }
    return thick;
  };
  const disp = new T.Vector3(), tmp = new T.Vector3();
  // after the snap the two halves are drawn as two meshes over the same vertices (no thread left between them)
  const G2 = new T.BufferGeometry(); G2.setIndex(G.index); for (const n in G.attributes) G2.setAttribute(n, G.attributes[n]);
  const upper = new T.Mesh(G2, steel); logo3.add(upper); G2.setDrawRange(0, 0);
  const IB = Math.round(TB * SEG);
  // sparks that burst out of the snap
  const SP = 160, spPos = new Float32Array(SP * 3), spV = [], spCol = new Float32Array(SP * 3);
  for (let q = 0; q < SP; q++) { const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1), sp = .6 + Math.random() * 2.2;
    spV.push([Math.sin(ph) * Math.cos(th) * sp, Math.sin(ph) * Math.sin(th) * sp, Math.cos(ph) * sp]);
    const c = Math.random() < .55 ? C(LIME) : C('#ffffff'); spCol.set([c.r, c.g, c.b], q * 3); }
  const spG = new T.BufferGeometry(); spG.setAttribute('position', new T.BufferAttribute(spPos, 3)); spG.setAttribute('color', new T.BufferAttribute(spCol, 3));
  const sparks = new T.Points(spG, new T.PointsMaterial({ size: .07, vertexColors: true, map: soft('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), blending: T.AdditiveBlending, transparent: true, depthWrite: false }));
  logo3.add(sparks); const snapAt = new T.Vector3();

  return ({ i, p, a, mx, my, halfW }) => {
    const e = easeOut(i);
    // draws itself as the page opens (and the first bit of scrolling can only take it further)
    const d = Math.max(sm(i * 1.05), sm((p - .02) / .2)), u = Math.max(.002, d);
    const s = sm((p - .04) / .46);                                 // a long, slow stretch 4-50%
    const k = cl((p - .5) / .24);                                  // snap 50-74%
    if (k > 0) { G.setDrawRange(0, IB * RAD * 6); G2.setDrawRange((IB + 1) * RAD * 6, (SEG - IB - 1) * RAD * 6); }
    else { G.setDrawRange(0, Math.floor(u * SEG) * RAD * 6); G2.setDrawRange(0, 0); }
    for (let r = 0; r <= SEG; r++) {
      const t = r / SEG, th = shape(t, s, k, disp), c = cen[r];
      for (let j = 0; j < RING; j++) { const v = r * RING + j;
        POS.setXYZ(v, c.x + disp.x + base[v * 3] * th, c.y + disp.y + base[v * 3 + 1] * th, c.z + disp.z + base[v * 3 + 2] * th); }
    }
    POS.needsUpdate = true; G.computeBoundingSphere(); G2.boundingSphere = null;
    // sparks fly out from the snap point and fall away
    shape(TB, s, 0, tmp); snapAt.copy(cen[IB]).add(tmp);
    const q = cl(k / .55); sparks.visible = k > 0 && q < 1;
    for (let n = 0; n < SP; n++) { const v = spV[n]; spPos[n * 3] = snapAt.x + v[0] * q; spPos[n * 3 + 1] = snapAt.y + v[1] * q - 1.6 * q * q; spPos[n * 3 + 2] = snapAt.z + v[2] * q; }
    spG.attributes.position.needsUpdate = true; sparks.material.opacity = 1 - q; sparks.material.size = .17 * (1 - .5 * q);
    shape(0, s, k, tmp); capA.position.copy(P[0]).add(tmp);           // the round start cap moves with the rubber
    // the ball rides the tip while drawing, then the end of the stretched rubber
    const tipT = d < 1 ? u : 1; shape(tipT, s, k, tmp);
    const tip = path.getPointAt(tipT).add(tmp); ball.position.copy(tip); capB.position.copy(tip); capB.visible = d < 1;
    ball.scale.set(.6 + .4 * d, (.6 + .4 * d) * (1 + .35 * s * (1 - k)), .6 + .4 * d);
    const arrive = sm((d - .9) / .1);
    glow.position.copy(tip); glow.material.opacity = (.35 + .5 * Math.sin(Math.PI * arrive) + .4 * s) * e * (1 - k);
    ball.material.emissiveIntensity = .35 + .9 * Math.sin(Math.PI * arrive) + .8 * s;
    const S0 = Math.min(1, halfW * .8 / 1.75) * (.8 + .2 * e), fade = sm((p - .66) / .1);
    logo3.position.set(0, -.15, 0);
    logo3.scale.setScalar(S0);
    logo3.rotation.set(0, 0, 0);                                  // flat and face-on, exactly like the 2D logo
    steel.opacity = ball.material.opacity = 1 - fade; logo3.visible = fade < .99;
  };
}, { z: 9, exposure: 1.1, copy: [.68, .2], env: { low: '#060706', high: '#d9e2dc' } });
