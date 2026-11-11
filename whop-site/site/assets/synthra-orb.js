// Synthra sample: one simple, realistic object. A glossy glass AI orb with a faint circuit pattern turns slowly and
// glows; as you scroll it brightens, swells a little, then shrinks and fades away while the headline comes in.
window.S3D && S3D(({ T, scene, cl, sm, easeOut, C, soft, canvasTex }) => {
  const CY = '#5ef0ff';
  const key = new T.DirectionalLight('#ffffff', 2.2); key.position.set(-4, 5, 6); scene.add(key);
  const rim = new T.DirectionalLight('#7fdcff', 3.2); rim.position.set(3, 2, -6); scene.add(rim);
  scene.add(new T.HemisphereLight('#cfe8ff', '#05070f', .35));
  // faint circuit lines glowing inside the glass
  const circuit = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(140,250,255,.9)'; g.lineWidth = 2; g.fillStyle = 'rgba(160,250,255,1)';
    let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 70; k++) { let x = r() * w, y = h * (.15 + r() * .7); g.beginPath(); g.moveTo(x, y);
      for (let n = 0; n < 4; n++) { if (r() < .5) x += (r() - .5) * 160; else y += (r() - .5) * 90; g.lineTo(x, y); } g.stroke(); g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); } });
  circuit.wrapS = T.RepeatWrapping;
  const orbMat = new T.MeshPhysicalMaterial({ color: C('#0b5866'), emissive: C('#2fd8f0'), emissiveIntensity: .5, emissiveMap: circuit, roughness: .08, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.3, transparent: true });
  const orb = new T.Mesh(new T.SphereGeometry(1, 96, 64), orbMat); scene.add(orb);
  const glow = new T.Sprite(new T.SpriteMaterial({ map: soft('rgba(94,240,255,.5)', 'rgba(94,240,255,0)'), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.position.z = -1; scene.add(glow);
  const light = new T.PointLight(CY, 0, 8, 1.6); light.position.set(0, 0, 1.6); scene.add(light);

  return ({ i, p, mx, my, halfW }) => {
    const now = performance.now() / 1000, e = easeOut(i);
    const R = Math.min(1.15, halfW * .42);
    const bright = sm(p / .3);                                   // it wakes up and glows brighter as you start scrolling
    const pop = cl((p - .34) / .34), sp = sm(pop);               // then a slight swell, and it shrinks and fades away
    const sc = R * (.85 + .15 * e) * (1 + .1 * bright) * (1 + .08 * Math.sin(Math.PI * cl(pop / .4))) * (1 - .5 * sp);
    orb.scale.setScalar(sc);
    orb.rotation.set(.35 + my * .3, now * .25 + mx * .6, .1);
    orb.position.y = .1 * Math.sin(now * .8) * (1 - sp);
    orbMat.emissiveIntensity = .45 + .9 * bright; orbMat.opacity = (1 - sp) * e; orb.visible = orbMat.opacity > .01;
    glow.scale.setScalar(sc * 4.2); glow.position.y = orb.position.y; glow.material.opacity = (.35 + .45 * bright) * (1 - sp) * e;
    light.intensity = (3 + 6 * bright) * (1 - sp) * e;
  };
}, { z: 9, exposure: 1.15, live: true, env: { low: '#03050c', high: '#bcd8ff', panels: [[6, 3, -3, 5, 4, '#ffffff', 3.5], [3, 6, 6, 1, 2, '#9fe9ff', 2], [4, 2, 0, -4, 5, '#ffffff', .5]] } });
