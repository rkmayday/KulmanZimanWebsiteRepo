// Ironpath sample: the logo in 3D. A polished steel path draws itself upward with the lime ball riding its tip,
// then the finished logo flies up into its place in the menu bar as the headline comes in.
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
  const total = tube.geometry.index.count;

  return ({ i, p, a, mx, my, halfW, logo }) => {
    const e = easeOut(i);
    // draw the path 4-50%: the ball rides the growing tip and arrives at the top
    const d = sm((p - .04) / .46), u = Math.max(.002, d);
    tube.geometry.setDrawRange(0, Math.floor(u * SEG) * RAD * 6);
    const tip = path.getPointAt(u); capB.position.copy(tip); ball.position.copy(tip);
    ball.scale.setScalar(.6 + .4 * d);
    const arrive = sm((d - .9) / .1);                          // a little flash when it reaches the top
    glow.position.copy(tip); glow.material.opacity = (.35 + .5 * Math.sin(Math.PI * arrive)) * e;
    ball.material.emissiveIntensity = .35 + .9 * Math.sin(Math.PI * arrive);

    // fly into the menu-bar logo 50-70%
    const f = sm((p - .5) / .2), S0 = Math.min(1, halfW * .8 / 1.75) * (.8 + .2 * e);
    const tx = logo ? logo.x : 0, ty = logo ? logo.y : 0, ts = logo ? logo.s * .3 : .1;
    logo3.position.set(mix(0, tx, f), mix(-.1, ty, f), mix(0, 0, f));
    logo3.scale.setScalar(mix(S0, ts, f));
    logo3.rotation.set(mix(.3 - .3 * a + my * .2, 0, f), mix(-.9 + .9 * a + mx * .4, 0, f), 0);
    logo3.visible = f < .985;
    glow.material.opacity *= 1 - f;
  };
}, { z: 9, exposure: 1.1, copy: [.6, .16], env: { low: '#060706', high: '#d9e2dc' } });
