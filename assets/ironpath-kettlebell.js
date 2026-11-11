// Ironpath sample: a cast-iron kettlebell. One scroll = one swing: a short back-swing, then it swings up and out
// of the frame, and the headline comes in behind it.
window.S3D && S3D(({ T, scene, cl, sm, easeOut, rnd, C, canvasTex, soft, fbm }) => {
  const LIME = '#c7f36b';
  const key = new T.DirectionalLight('#ffffff', 3.2); key.position.set(-3, 5, 6); scene.add(key);
  const fill = new T.DirectionalLight('#dfe8ff', .7); fill.position.set(4, -2, 4); scene.add(fill);
  const rim = new T.DirectionalLight(LIME, 6); rim.position.set(2, 3, -6); scene.add(rim);
  scene.add(new T.HemisphereLight('#f4fff0', '#0a0b0a', .45));

  // cast-iron surface: fine pitting in the bump map, painted weight on the front
  const pits = canvasTex(512, 512, (g, w, h) => { const d = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 128 + fbm(x / 6, y / 6, 1.7) * 90 + (rnd() - .5) * 40, i = (y * w + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); });
  pits.wrapS = pits.wrapT = T.RepeatWrapping; pits.repeat.set(4, 2);
  const paint = canvasTex(2048, 1024, (g, w, h) => {
    g.fillStyle = '#121413'; g.fillRect(0, 0, w, h);
    // the sphere's front faces the camera at u = .25; letters are stretched sideways to look right on the curve
    g.save(); g.translate(w * .25, h * .5); g.scale(.62, 1); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = LIME; g.font = '800 260px Archivo, Arial, sans-serif'; g.fillText('24', 0, -20);
    g.fillStyle = '#d6dcd6'; g.font = '700 84px Archivo, Arial, sans-serif'; g.fillText('KG', 0, 130); g.restore();
    g.fillStyle = 'rgba(199,243,107,.9)'; g.fillRect(0, h * .74, w, 10); });
  paint.anisotropy = 8; paint.encoding = T.sRGBEncoding;
  const iron = new T.MeshPhysicalMaterial({ map: paint, color: C('#ffffff'), metalness: .25, roughness: .55, bumpMap: pits, bumpScale: .012, clearcoat: .3, clearcoatRoughness: .5, envMapIntensity: .55 });
  const handleMat = new T.MeshPhysicalMaterial({ color: C('#1a1c1b'), metalness: .45, roughness: .4, bumpMap: pits, bumpScale: .006, envMapIntensity: .7 });

  // ---------- the kettlebell ----------
  const bell = new T.Group(), pivot = new T.Group(); pivot.add(bell); scene.add(pivot);
  const bodyG = new T.SphereGeometry(1, 128, 96);
  { const P = bodyG.attributes.position;               // flat base, slightly squat body
    for (let i = 0; i < P.count; i++) { let y = P.getY(i) * .94; if (y < -.78) { const k = -.78 / y; P.setX(i, P.getX(i) * (1 + (1 - k) * .4)); P.setZ(i, P.getZ(i) * (1 + (1 - k) * .4)); y = -.78; } P.setY(i, y); }
    bodyG.computeVertexNormals(); }
  const body = new T.Mesh(bodyG, iron); bell.add(body);
  const handle = new T.Mesh(new T.TorusGeometry(.62, .12, 32, 96, Math.PI * 1.22), handleMat);
  handle.rotation.z = -Math.PI * .11; handle.position.y = .72; bell.add(handle);
  [-1, 1].forEach(s => { const horn = new T.Mesh(new T.CylinderGeometry(.13, .19, .4, 32), handleMat); horn.position.set(s * .6, .66, 0); horn.rotation.z = s * .18; bell.add(horn); });
  const L = 3.6; bell.position.y = -L;                  // hangs from a pivot well above it, like from the hips of the lifter

  const shadow = new T.Sprite(new T.SpriteMaterial({ map: soft('rgba(0,0,0,.75)', 'rgba(0,0,0,0)'), depthWrite: false, transparent: true }));
  shadow.scale.set(2.6, .45, 1); shadow.position.set(0, -1.45, -.6); scene.add(shadow);
  const glow = new T.Sprite(new T.SpriteMaterial({ map: soft('rgba(199,243,107,.5)', 'rgba(199,243,107,0)'), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(5, 5, 1); glow.position.set(0, -.2, -2); scene.add(glow);

  return ({ i, p, mx, my, halfW }) => {
    const e = easeOut(i), size = Math.min(.82, halfW * .5);
    // one swing: back-swing 0-22%, then up and out of the frame 22-62% (fastest through the bottom, like a real swing)
    const back = sm(p / .22), up = sm((p - .22) / .42);
    const ang = .3 * back - (.3 + 1.75) * up;                     // radians around the pivot (negative = swings up to the left)
    pivot.position.set(0, -.2 + L * size, up * 1.2);              // the bell starts centred; it comes towards you as it swings
    pivot.rotation.set(0, 0, ang);
    pivot.scale.setScalar(size * (.85 + .15 * e));
    bell.rotation.set(.15 + my * .2, .5 + mx * .5 + up * 1.2, 0);  // turns as it swings so you see it in 3D
    const away = cl(-ang / 1.2);                              // fade the shadow and glow as it leaves
    shadow.material.opacity = .9 * e * (1 - away) * (1 - Math.abs(Math.sin(ang)) * .7);
    shadow.scale.set(2.6 * size / .82, .45 * size / .82, 1);
    glow.material.opacity = .35 * e * (1 - sm(up * 1.4));
  };
}, { z: 9, exposure: 1.1, env: { low: '#060706', high: '#d9e2dc' } });
