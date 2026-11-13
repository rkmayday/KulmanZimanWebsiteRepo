// Synthra sample: the same orbit animation as the flat logo (same timing and movement), rebuilt as real 3D objects:
// polished metal rings, glossy glowing satellites and a glowing glass core lighting everything around it.
window.S3D && S3D(({ T, scene, cl, sm, C, soft }) => {
  const CY = '#5ef0ff';
  const key = new T.DirectionalLight('#ffffff', 2.2); key.position.set(-4, 5, 6); scene.add(key);
  const rim = new T.DirectionalLight('#7fdcff', 3); rim.position.set(3, 2, -6); scene.add(rim);
  scene.add(new T.HemisphereLight('#cfe8ff', '#05070f', .35));
  const coreLight = new T.PointLight(CY, 0, 9, 1.6); scene.add(coreLight);

  const mark = new T.Group(); scene.add(mark);          // = .sy-mark
  const orbits = new T.Group(); mark.add(orbits);         // = .sy-orbits (turns once every 40 s)
  const U = .01;                                          // one SVG unit in scene units (scaled to the page in draw)
  const TILT = Math.acos(33 / 84);                        // a circle of radius 84 tilted to look like the 84 x 33 ellipse
  const metal = new T.MeshPhysicalMaterial({ color: C('#e9f1ff'), metalness: 1, roughness: .18, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.5, transparent: true });
  const satMat = new T.MeshPhysicalMaterial({ color: C(CY), emissive: C(CY), emissiveIntensity: .9, roughness: .15, clearcoat: 1, transparent: true });
  const ringPath = new (class extends T.Curve { getPoint(t, o = new T.Vector3()) { const a = t * Math.PI * 2; return o.set(Math.cos(a) * 84 * U, Math.sin(a) * 84 * U, 0); } })();
  const SEG = 360, RAD = 18;
  const rings = [30, -30].map((deg, k) => {
    const g = new T.Group(); g.rotation.z = -deg * Math.PI / 180; orbits.add(g);
    const plane = new T.Group(); plane.rotation.x = TILT; g.add(plane);
    const tube = new T.Mesh(new T.TubeGeometry(ringPath, SEG, 1.5 * U, RAD, false), metal); plane.add(tube);
    const sat = new T.Mesh(new T.SphereGeometry(4.5 * U, 32, 16), satMat); plane.add(sat);
    const sg = new T.Sprite(new T.SpriteMaterial({ map: soft('rgba(94,240,255,.9)', 'rgba(94,240,255,0)'), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    sg.scale.setScalar(26 * U); sat.add(sg);
    return { tube, sat, sg, dur: k ? 9 : 7, dir: k ? 1 : -1, start: k ? Math.PI : 0 };
  });
  // the core: a glowing glass sphere with a bright centre, and the soft halo around it
  const core = new T.Mesh(new T.SphereGeometry(21 * U, 64, 32), new T.MeshPhysicalMaterial({ color: C('#0b5866'), emissive: C('#2fd8f0'), emissiveIntensity: .55, roughness: .08, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.2, transparent: true }));
  const inner = new T.Sprite(new T.SpriteMaterial({ map: soft('rgba(220,255,255,.85)', 'rgba(94,240,255,0)'), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
  inner.scale.setScalar(26 * U); inner.position.z = 22 * U; core.add(inner);
  const halo = new T.Sprite(new T.SpriteMaterial({ map: soft('rgba(94,240,255,.45)', 'rgba(94,240,255,0)'), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
  mark.add(core, halo);

  return ({ i, p, mx, my, W, H, halfH }) => {
    const now = performance.now() / 1000, e = sm(i);
    // one simple motion: as you scroll it turns gently and the core brightens, then it zooms in until it fills the
    // whole screen and stays there, very faint, behind the headline and everything else
    const turn = sm(p / .36), pop = cl((p - .34) / .34), sp = sm(pop);
    const px = 2 * halfH / H, svgPx = Math.min(.7 * W, 560) / 200;    // scene units per pixel, pixels per SVG unit
    mark.scale.setScalar(svgPx * px / U * (.85 + .15 * e) * (1 + 2.6 * sp) * U / .01);
    mark.position.set(mx * -.25 * (1 - .6 * sp), my * .25 * (1 - .6 * sp) + .1 * Math.sin(now * .7) * (1 - sp), 0);
    mark.rotation.set(-.25 * turn + my * .15, .55 * turn + mx * .3, 0);
    const op = cl(e * (1 - .86 * sp));                              // settles at about 14% behind the words
    orbits.rotation.z = -(now / 40) * Math.PI * 2;
    rings.forEach(r => {
      r.tube.geometry.setDrawRange(0, Math.floor(e * SEG) * RAD * 6);   // the rings draw themselves as the page opens
      const ang = r.start + r.dir * (now / r.dur) * Math.PI * 2;
      r.sat.position.set(Math.cos(ang) * 84 * U, Math.sin(ang) * 84 * U, 0);
      r.sat.visible = e > .02; r.sg.material.opacity = op * .8;
    });
    metal.opacity = satMat.opacity = op; metal.depthWrite = op > .99;
    core.scale.setScalar(Math.max(.001, e)); core.material.opacity = op;
    core.material.emissiveIntensity = .55 + .7 * turn;
    const pulse = .55 - .3 * (.5 - .5 * Math.cos(now / 3.4 * Math.PI * 2));
    halo.scale.setScalar(92 * U * Math.max(.001, e) * 1.25); halo.material.opacity = pulse * op * (1 + .5 * turn);
    inner.material.opacity = .35 * op;
    coreLight.intensity = (5 + 5 * turn) * op;
  };
}, { z: 9, exposure: 1.15, live: true, env: { low: '#03050c', high: '#bcd8ff', panels: [[6, 3, -3, 5, 4, '#ffffff', 3.5], [3, 6, 6, 1, 2, '#9fe9ff', 2], [4, 2, 0, -4, 5, '#ffffff', .5]] } });
