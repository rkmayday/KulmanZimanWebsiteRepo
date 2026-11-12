// Deduction sample: the </> logo in 3D. Glossy navy brackets and a yellow slash draw themselves as the page opens;
// scrolling slides the brackets apart and turns the slash (the same motion as the flat logo), then it all fades away.
window.S3D && S3D(({ T, scene, cl, sm, easeOut, C, soft }) => {
  const key = new T.DirectionalLight('#ffffff', 2.6); key.position.set(-3, 5, 6); scene.add(key);
  const fill = new T.DirectionalLight('#fff4d8', .9); fill.position.set(4, -2, 4); scene.add(fill);
  const rim = new T.DirectionalLight('#ffd84d', 2.2); rim.position.set(2, 3, -6); scene.add(rim);
  scene.add(new T.HemisphereLight('#ffffff', '#c9c4b4', .7));
  const V = (x, y) => new T.Vector3((x - 50) / 30, (50 - y) / 30, 0);
  const rounded = pts => { const path = new T.CurvePath(), R = .14; let from = pts[0];
    for (let k = 1; k < pts.length; k++) { const a = pts[k], dir = a.clone().sub(from).normalize();
      if (k < pts.length - 1) { const out = pts[k + 1].clone().sub(a).normalize(), p1 = a.clone().addScaledVector(dir, -R), p2 = a.clone().addScaledVector(out, R);
        path.add(new T.LineCurve3(from, p1)); path.add(new T.QuadraticBezierCurve3(p1, a, p2)); from = p2; }
      else path.add(new T.LineCurve3(from, a)); }
    return path; };
  const navy = new T.MeshPhysicalMaterial({ color: C('#12142a'), roughness: .3, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: .45, transparent: true });
  const gold = new T.MeshPhysicalMaterial({ color: C('#eaa500'), roughness: .25, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: .55, transparent: true });
  const SEG = 260, RAD = 24, TUBE = .15;
  const piece = (pts, mat) => { const path = rounded(pts), g = new T.Group(), tube = new T.Mesh(new T.TubeGeometry(path, SEG, TUBE, RAD, false), mat);
    const capA = new T.Mesh(new T.SphereGeometry(TUBE, 32, 16), mat), capB = capA.clone(); capA.position.copy(pts[0]); g.add(tube, capA, capB);
    return { g, tube, capB, path }; };
  const Lp = piece([V(34, 26), V(12, 50), V(34, 74)], navy), Sp = piece([V(58, 20), V(42, 80)], gold), Rp = piece([V(66, 26), V(88, 50), V(66, 74)], navy);
  const logo = new T.Group(); logo.add(Lp.g, Sp.g, Rp.g); scene.add(logo);
  const shadow = new T.Sprite(new T.SpriteMaterial({ map: soft('rgba(18,20,42,.35)', 'rgba(18,20,42,0)'), depthWrite: false, transparent: true }));
  shadow.scale.set(3.6, .5, 1); shadow.position.set(0, -1.75, -.5); scene.add(shadow);

  return ({ i, p, mx, my, halfW }) => {
    const e = easeOut(i);
    // the same timeline as the flat logo (sample2.js): a = brackets slide apart and the slash turns, b = they leave
    const a = sm(p / .42), b = sm((p - .36) / .36);
    [[Lp, 0], [Sp, .18], [Rp, .1]].forEach(([pc, delay]) => {      // each stroke draws itself as the page opens
      const u = Math.max(.002, sm((i * 1.15 - delay) / .85)); pc.tube.geometry.setDrawRange(0, Math.floor(u * SEG) * RAD * 6);
      pc.capB.position.copy(pc.path.getPointAt(u)); });
    Lp.g.position.x = -(a * 34 + b * 40) / 30 * .6 - mx * .1; Rp.g.position.x = (a * 34 + b * 40) / 30 * .6 + mx * .1;
    Sp.g.rotation.z = -(a * 76 + mx * 10) * Math.PI / 180; Sp.g.scale.setScalar(1 + a * .4 + b * .3);
    const S0 = Math.min(1, halfW * .75 / 1.75) * (.9 + .1 * e) * (1 + a * .25);
    logo.scale.setScalar(S0); logo.rotation.set(my * .25, mx * .35, 0);
    navy.opacity = gold.opacity = cl(1 - b * 1.15); logo.visible = navy.opacity > .01;
    shadow.material.opacity = .8 * e * (1 - b);
  };
}, { z: 9, exposure: .95, env: { low: '#bfb9a8', high: '#ffffff' } });
