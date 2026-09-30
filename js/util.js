/* Shared helpers for building the model. */
(function () {
  const QC = (window.QC = window.QC || {});
  const T = THREE;
  QC.views = {};
  let cur = null;

  /* ---------- procedural surface textures ---------- */
  QC.allTextures = [];
  function canvasTex(w, h, draw, opts) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    const o = opts || {};
    t.wrapS = t.wrapT = o.clamp ? T.ClampToEdgeWrapping : T.RepeatWrapping;
    if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
    if (o.color) t.encoding = T.sRGBEncoding;
    QC.allTextures.push(t);
    return t;
  }
  // seeded random so every visit looks the same
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const grey = (v, a) => `rgba(${v | 0},${v | 0},${v | 0},${a == null ? 1 : a})`;

  const TX = (QC.TX = {
    // fine directional grain, like brushed or rolled metal (used as a roughness map)
    brushed: canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = grey(205); g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) {
        const y = rnd() * h, x = rnd() * w, len = 20 + rnd() * 220;
        g.strokeStyle = grey(150 + rnd() * 105, 0.35);
        g.lineWidth = 0.6 + rnd() * 0.8;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (rnd() - 0.5) * 1.5); g.stroke();
      }
    }, { repeat: [2, 2] }),
    // isotropic speckle for cast, blasted or coated surfaces
    grain: canvasTex(256, 256, (g, w, h) => {
      const img = g.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const v = 185 + rnd() * 70;
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, { repeat: [3, 3] }),
    // lathe-turned concentric rings, as on machined gold-plated plates
    rings: canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = grey(200); g.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      let band = 0;
      for (let r = 2; r < w * 0.72; r += 1.4) {
        if (rnd() < 0.03) band = (rnd() - 0.5) * 50;
        g.strokeStyle = grey(190 + band + (rnd() - 0.5) * 55 + Math.sin(r * 0.45) * 8, 0.9);
        g.lineWidth = 1.2;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
      }
    }, { clamp: true }),
    // corrugated bellows for flexible hoses (bump map along the tube)
    corrugation: canvasTex(64, 8, (g, w) => {
      for (let x = 0; x < w; x++) { g.fillStyle = grey(128 + 127 * Math.sin((x / w) * Math.PI * 8)); g.fillRect(x, 0, 1, 8); }
    }, { repeat: [60, 1] }),
    // braided copper strap
    braid: canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = grey(90); g.fillRect(0, 0, w, h);
      g.lineWidth = 3;
      g.strokeStyle = grey(235);
      for (let i = -h; i <= w; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
      g.strokeStyle = grey(175);
      for (let i = 0; i <= w + h; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i - h, h); g.stroke(); }
    }, { repeat: [40, 2] }),
    // woven glass laminate, seen through the board resin
    weave: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#cdbb8e'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) {
        const along = ((x + y) / 8) % 2 === 0;
        g.fillStyle = along ? 'rgba(255,245,215,0.35)' : 'rgba(120,95,50,0.18)';
        g.fillRect(x + 1, y + 1, along ? 7 : 5, along ? 5 : 7);
      }
    }, { repeat: [3, 3], color: true }),
    // speckled epoxy lab floor
    floor: canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#c9cfd4'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        const v = rnd();
        g.fillStyle = v < 0.5 ? 'rgba(90,98,108,0.35)' : 'rgba(250,251,252,0.55)';
        const s = 0.6 + rnd() * 1.6;
        g.fillRect(rnd() * w, rnd() * h, s, s);
      }
    }, { repeat: [14, 14], color: true }),
  });

  /* ---------- materials ----------
     Metal base colours approximate measured reflectance (F0) of the real metals. */
  function std(color, metal, rough, extra) {
    return new T.MeshStandardMaterial(Object.assign({ color, metalness: metal, roughness: rough }, extra || {}));
  }
  function phys(color, metal, rough, extra) {
    return new T.MeshPhysicalMaterial(Object.assign({ color, metalness: metal, roughness: rough }, extra || {}));
  }
  const br = { roughnessMap: TX.brushed };
  const gr = { roughnessMap: TX.grain };
  QC.M = {
    gold: std(0xf2c86e, 1, 0.2, br),               // gold-plated OFHC copper
    goldDark: std(0xdcae55, 1, 0.3, gr),
    copper: std(0xeda27d, 1, 0.26, br),            // bare oxygen-free copper
    copperMatte: std(0xd08a63, 1, 0.5, { bumpMap: TX.braid, bumpScale: 0.02, roughnessMap: TX.grain }),
    steel: std(0xc9ccd0, 1, 0.28, br),             // 304 stainless
    steelDark: std(0xa3a7ac, 1, 0.36, gr),
    hose: std(0xc4c8cc, 1, 0.32, { bumpMap: TX.corrugation, bumpScale: 0.04 }),
    alu: std(0xe6e9ec, 1, 0.34, br),               // aluminium alloy
    nbti: std(0xb7bcc4, 1, 0.3, br),               // niobium-titanium
    silver: std(0xf5f3ef, 1, 0.18, gr),
    g10: phys(0xbdb978, 0, 0.42, { clearcoat: 0.5, clearcoatRoughness: 0.35, roughnessMap: TX.grain }),
    black: phys(0x1d2025, 0.4, 0.38, { clearcoat: 0.3, clearcoatRoughness: 0.4 }),
    anodBlue: phys(0x21477c, 0.55, 0.32, { clearcoat: 0.45, clearcoatRoughness: 0.3, roughnessMap: TX.brushed }),
    ferrite: std(0xd4d2cd, 1, 0.3, gr),            // nickel-plated isolator body
    paint: phys(0xe9ecee, 0, 0.5, { clearcoat: 0.2, clearcoatRoughness: 0.5, roughnessMap: TX.grain }),
    paintDark: phys(0x3c424a, 0.1, 0.48, { clearcoat: 0.25, clearcoatRoughness: 0.45, roughnessMap: TX.grain }),
    rackPanel: phys(0x23272c, 0.3, 0.42, { clearcoat: 0.2, roughnessMap: TX.brushed }),
    screen: new T.MeshStandardMaterial({ color: 0x08141c, emissive: 0x3aa7d8, emissiveIntensity: 0.45, roughness: 0.08, metalness: 0.2 }),
    ledGreen: new T.MeshStandardMaterial({ color: 0x113311, emissive: 0x44ff66, emissiveIntensity: 1.4 }),
    ledAmber: new T.MeshStandardMaterial({ color: 0x331f00, emissive: 0xffa629, emissiveIntensity: 1.4 }),
    pcb: phys(0xffffff, 0, 0.55, { map: TX.weave, clearcoat: 0.35, clearcoatRoughness: 0.3 }), // Rogers-type laminate
    pcbTrace: std(0xf2c86e, 1, 0.24, gr),           // ENIG gold
    silicon: phys(0x4d5563, 0.65, 0.1, { clearcoat: 0.6, clearcoatRoughness: 0.05 }), // polished silicon
    siliconGap: std(0x363c47, 0.55, 0.22),          // etched, exposed silicon
    film: std(0xcdd1d6, 1, 0.2, gr),                // niobium / aluminium film
    filmBright: std(0xe3e5e9, 1, 0.14, gr),
    alFilm: std(0xeceef1, 1, 0.12),
    oxide: new T.MeshPhysicalMaterial({ color: 0x8f7fd0, metalness: 0, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.78 }),
    indium: std(0xcfd1d8, 1, 0.48, gr),
    eccosorb: std(0x131416, 0, 0.95, gr),
    rubber: phys(0x1b1d20, 0, 0.62, { clearcoat: 0.15 }),
    floor: std(0xffffff, 0, 0.82, { map: TX.floor }),
    glassChip: new T.MeshPhysicalMaterial({ color: 0x6d7584, metalness: 0.5, roughness: 0.1, clearcoat: 0.6, transparent: true, opacity: 0.5 }),
  };
  (function () {
    const t = TX.corrugation.clone(); t.needsUpdate = true; t.repeat.set(10, 1); QC.allTextures.push(t);
    QC.M.hoseShort = std(0xc4c8cc, 1, 0.32, { bumpMap: t, bumpScale: 0.04 });
  })();
  QC.M.shield = function (color, opacity) {
    return new T.MeshStandardMaterial({
      color, metalness: 1, roughness: 0.3, roughnessMap: TX.brushed, transparent: true, opacity,
      side: T.DoubleSide, depthWrite: false,
    });
  };
  /* A machined plate: its own copy of the turned-ring texture, scaled to the plate radius
     (extruded caps use the shape's coordinates as UVs). */
  QC.plateMaterial = function (base, r) {
    const t = TX.rings.clone();
    t.needsUpdate = true;
    t.repeat.set(1 / (2 * r), 1 / (2 * r));
    t.offset.set(0.5, 0.5);
    QC.allTextures.push(t);
    const m = base.clone();
    m.roughnessMap = t;
    m.bumpMap = t;
    m.bumpScale = 0.004;
    return m;
  };

  const geoCache = {};
  function cached(key, make) { return geoCache[key] || (geoCache[key] = make()); }

  /* ---------- builder helpers ---------- */
  const U = (QC.U = {
    T,
    view(id) {
      const v = { id, root: new T.Group(), explodables: [], spanners: [], fades: [], labels: [], paths: {} };
      v.root.name = id;
      QC.views[id] = v;
      cur = v;
      return v;
    },
    current() { return cur; },
    mesh(geo, mat, part, parent) {
      const m = new T.Mesh(geo, mat);
      if (part) m.userData.part = part;
      if (parent) parent.add(m);
      return m;
    },
    box(w, h, d, mat, part, parent, x, y, z) {
      const m = U.mesh(new T.BoxGeometry(w, h, d), mat, part, parent);
      m.position.set(x || 0, y || 0, z || 0);
      return m;
    },
    cyl(r, h, mat, part, parent, x, y, z, seg) {
      const g = cached('c' + r + '_' + h + '_' + (seg || 24), () => new T.CylinderGeometry(r, r, h, seg || 24));
      const m = U.mesh(g, mat, part, parent);
      m.position.set(x || 0, y || 0, z || 0);
      return m;
    },
    tag(obj, part) {
      obj.traverse((o) => { if (o.isMesh && !o.userData.part) o.userData.part = part; });
      return obj;
    },
    temp(obj, K) { obj.userData.tempK = K; return obj; },
    explode(obj, x, y, z) {
      obj.userData.base = obj.position.clone();
      obj.userData.ex = new T.Vector3(x, y, z);
      cur.explodables.push(obj);
      return obj;
    },
    fade(mat, amount) { cur.fades.push({ mat, base: mat.opacity, amount }); },
    label(part, obj, text) { cur.labels.push({ part, obj, text: text || QC.PARTS[part].name }); },
    anchor(parent, x, y, z) {
      const a = new T.Object3D();
      a.position.set(x, y, z);
      parent.add(a);
      return a;
    },
    /* A mesh stretched between two anchors; follows them when things explode.
       kind: 'rod' (cylinder), 'ribbon' (flat box), 'group' (custom unit-height object),
             'curve' (tube rebuilt along a smooth S-curve) */
    span(kind, a, b, opts) {
      const o = opts || {};
      let mesh;
      if (kind === 'rod') {
        const g = cached('span' + o.r + (o.seg || 10), () => new T.CylinderGeometry(o.r, o.r, 1, o.seg || 10, 1, !!o.open));
        mesh = U.mesh(g, o.mat, o.part);
      } else if (kind === 'ribbon') {
        mesh = U.mesh(new T.BoxGeometry(o.w, 1, o.d), o.mat, o.part);
        if (o.rotY) mesh.userData.rotY = o.rotY;
      } else if (kind === 'group') {
        mesh = o.obj;
      } else {
        mesh = U.mesh(new T.BufferGeometry(), o.mat, o.part);
      }
      if (o.tempK != null) mesh.userData.tempK = o.tempK;
      cur.root.add(mesh);
      const s = { kind, a, b, mesh, r: o.r || 0.03, k: o.k || 0.6, da: o.da || new T.Vector3(0, -1, 0), db: o.db || new T.Vector3(0, 1, 0), last: null };
      cur.spanners.push(s);
      return mesh;
    },
    helixGeometry(radius, turns, tubeR, seg) {
      const pts = [];
      const n = turns * 24;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const a = t * turns * Math.PI * 2;
        pts.push(new T.Vector3(Math.cos(a) * radius, t - 0.5, Math.sin(a) * radius));
      }
      return new T.TubeGeometry(new T.CatmullRomCurve3(pts), n * 2, tubeR, seg || 6, false);
    },
    tube(points, r, mat, part, parent, seg) {
      const g = new T.TubeGeometry(new T.CatmullRomCurve3(points), seg || Math.max(16, points.length * 12), r, 8, false);
      return U.mesh(g, mat, part, parent);
    },
    /* can with rounded bottom, open at top, hanging down from y=0 */
    canGeometry(r, h, bevel) {
      const pts = [];
      const b = bevel || r * 0.15;
      pts.push(new T.Vector2(0.001, -h));
      for (let i = 0; i <= 8; i++) {
        const a = (-Math.PI / 2) + (i / 8) * (Math.PI / 2);
        pts.push(new T.Vector2(r - b + Math.cos(a) * b, -h + b + Math.sin(a) * b));
      }
      pts.push(new T.Vector2(r, 0));
      return new T.LatheGeometry(pts, 64);
    },
  });

  /* ---------- spanner update ---------- */
  const va = new T.Vector3(), vb = new T.Vector3(), dir = new T.Vector3(), up = new T.Vector3(0, 1, 0);
  QC.updateSpanners = function (v) {
    v.root.updateMatrixWorld(true);
    for (const s of v.spanners) {
      s.a.getWorldPosition(va); v.root.worldToLocal(va);
      s.b.getWorldPosition(vb); v.root.worldToLocal(vb);
      if (s.kind === 'curve') {
        const key = va.x.toFixed(3) + va.y.toFixed(3) + va.z.toFixed(3) + vb.x.toFixed(3) + vb.y.toFixed(3) + vb.z.toFixed(3);
        if (key === s.last) continue;
        s.last = key;
        const d = va.distanceTo(vb);
        const c = new T.CubicBezierCurve3(
          va.clone(),
          va.clone().addScaledVector(s.da, d * s.k),
          vb.clone().addScaledVector(s.db, d * s.k),
          vb.clone()
        );
        const g = new T.TubeGeometry(c, 40, s.r, 8, false);
        s.mesh.geometry.dispose();
        s.mesh.geometry = g;
        continue;
      }
      dir.subVectors(vb, va);
      const len = Math.max(dir.length(), 0.0001);
      s.mesh.position.copy(va).addScaledVector(dir, 0.5);
      s.mesh.quaternion.setFromUnitVectors(up, dir.normalize());
      if (s.mesh.userData.rotY) s.mesh.rotateY(s.mesh.userData.rotY);
      s.mesh.scale.set(1, len, 1);
    }
  };

  /* ---------- procedural chip artwork (used for small chips) ---------- */
  QC.chipTexture = function () {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#d6dadf'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = '#353c49'; g.lineWidth = 5; g.lineCap = 'square';
    // feedline + purcell
    g.beginPath(); g.moveTo(20, 70); g.lineTo(492, 70); g.stroke();
    g.beginPath(); g.moveTo(60, 110); g.lineTo(452, 110); g.stroke();
    for (let q = 0; q < 5; q++) {
      const x = 76 + q * 90;
      // meander resonator
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, 118);
      for (let k = 0; k < 7; k++) { const y = 130 + k * 14; g.lineTo(x - 18, y); g.lineTo(x + 18, y); }
      g.lineTo(x, 240); g.stroke();
      // cross
      g.fillStyle = '#2c3340';
      g.fillRect(x - 34, 272, 68, 16); g.fillRect(x - 8, 246, 16, 68);
      g.fillStyle = '#e2e6ec';
      g.fillRect(x - 30, 275, 60, 10); g.fillRect(x - 5, 250, 10, 60);
      // lines to bottom
      g.strokeStyle = '#2c3340'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x - 22, 300); g.lineTo(x - 22, 470); g.stroke();
      g.beginPath(); g.moveTo(x + 6, 322); g.lineTo(x + 6, 470); g.stroke();
      if (q < 4) { g.beginPath(); g.moveTo(x + 38, 280); g.lineTo(x + 52, 280); g.lineTo(x + 52, 320); g.stroke(); }
    }
    g.fillStyle = '#2c3340';
    for (let i = 0; i < 14; i++) g.fillRect(40 + i * 32, 470, 20, 26);
    g.fillRect(4, 58, 26, 26); g.fillRect(482, 58, 26, 26);
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  };

  /* ---------- small text texture for labels printed on parts ---------- */
  QC.textTexture = function (text, fg, bg) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = bg || '#e9edf2'; g.fillRect(0, 0, 256, 64);
    g.fillStyle = fg || '#1c2733';
    g.font = '600 34px "IBM Plex Sans", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 34);
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    return tex;
  };
})();
