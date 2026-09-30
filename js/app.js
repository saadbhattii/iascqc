/* Application: scene, interaction and interface. */
(function () {
  const QC = (window.QC = window.QC || {});
  const T = THREE;

  const VIEWS = {
    system: { roots: ['system', 'cryostat'], explodeRoot: 'cryostat', offset: [0, 0, 0], cam: [21, 9, 27], target: [0, 3.5, 0], explode: 0, shadow: { size: 19, center: [0, 3, 0] },
      caption: 'The fridge hangs from its frame. Control cables run to the rack on the right; helium lines run to the gas handling system and compressor on the left.' },
    cryostat: { roots: ['cryostat'], explodeRoot: 'cryostat', offset: [0, 0, 0], cam: [14, 10, 18.5], target: [0, 5.2, 0], explode: 0, shadow: { size: 14, center: [0, 6, 0] },
      caption: 'Six stages step the temperature down from 300 K at the top plate to about 10 mK at the bottom. Use the take-apart slider to lower the cans and separate the stages.' },
    package: { roots: ['package'], explodeRoot: 'package', offset: [100, 0, 0], cam: [7.5, 8.5, 10], target: [0, 1.6, 0], explode: 0.55, shadow: { size: 7, center: [0, 2, 0] }, floorY: -1.02,
      caption: 'The processor sits in a copper box about 3 cm across, wirebonded to a circuit board with coax connectors.' },
    chip: { roots: ['chip'], explodeRoot: 'chip', offset: [200, 0, 0], cam: [3, 10.5, 11.5], target: [0, 0.6, 0], explode: 0.5, shadow: { size: 8, center: [0, 1, 0] }, floorY: -0.52,
      caption: 'Five transmon qubits with tunable couplers, readout resonators and control lines, on a chip about 10 mm across. Film thickness and the flip-chip gap are greatly exaggerated.' },
    qubit: { roots: ['qubit'], explodeRoot: 'qubit', offset: [300, 0, 0], cam: [5.5, 6, 8], target: [0, 0.8, 0], explode: 0.45, shadow: { size: 6.5, center: [0, 1, 0] }, floorY: -0.62,
      caption: 'One SQUID magnified about 10,000 times, with layer thickness exaggerated about 1,000 times so each layer can be seen.' },
  };
  // View captions (the sentence describing each view) can be shown over the model,
  // but are turned off because there is not enough room without covering the visuals.
  // The text for each view is still kept in VIEWS[...].caption below.
  QC.SHOW_CAPTIONS = false;

  const SCALE = { system: 'about 3 m', cryostat: 'about 1.5 m', package: 'about 3 cm', chip: 'about 10 mm', qubit: 'about 1 \u00b5m' };

  const state = {
    view: 'cryostat', explode: {}, explodeTarget: {}, shields: true, labels: true, tempMap: false, signal: false,
    selected: null, hovered: null, isolate: false, tour: -1,
  };
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer, scene, camera, orbit, raycaster, stageEl, labelsEl, keyLight;
  const catchers = {};
  const partMeshes = {};
  const allMeshes = [];
  const labelEls = [];
  let tween = null;
  let pulses = [];
  let dirtyMaterials = true;

  /* ---------------- temperature colours ---------------- */
  const tempStops = [
    [0, 0xd8f6ff], [0.18, 0x7fd6f2], [0.38, 0x3f8fe0], [0.58, 0x6a5bd6], [0.78, 0xd9567d], [1, 0xf59a3a],
  ];
  function tempT(K) {
    const lo = Math.log10(0.01), hi = Math.log10(300);
    return Math.max(0, Math.min(1, (Math.log10(Math.max(K, 0.005)) - lo) / (hi - lo)));
  }
  function tempColor(u) {
    for (let i = 0; i < tempStops.length - 1; i++) {
      const [a, ca] = tempStops[i], [b, cb] = tempStops[i + 1];
      if (u <= b) {
        const c1 = new T.Color(ca), c2 = new T.Color(cb);
        return c1.lerp(c2, (u - a) / (b - a));
      }
    }
    return new T.Color(tempStops[tempStops.length - 1][1]);
  }
  const tempMatCache = {};
  function tempMaterial(K) {
    const bucket = Math.round(tempT(K) * 30);
    if (!tempMatCache[bucket]) {
      const c = tempColor(bucket / 30);
      tempMatCache[bucket] = new T.MeshStandardMaterial({ color: c, metalness: 0.15, roughness: 0.55, emissive: c, emissiveIntensity: 0.18 });
    }
    return tempMatCache[bucket];
  }
  const hlCache = new Map();
  function highlight(mat, mode) {
    const key = mat.uuid + mode;
    if (!hlCache.has(key)) {
      const m = mat.clone();
      if (m.emissive) {
        m.emissive.setHex(mode === 'sel' ? 0xff8a2a : 0x3ab8e8);
        m.emissiveIntensity = mode === 'sel' ? 0.5 : 0.32;
      }
      m.userData.src = mat;
      hlCache.set(key, m);
    }
    return hlCache.get(key);
  }

  /* ---------------- scene setup ---------------- */
  function setupRenderer() {
    stageEl = document.getElementById('stage');
    labelsEl = document.getElementById('labels');
    const canvas = document.getElementById('gl');
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(40, 1, 0.02, 400);
    camera.position.set(10, 7, 13);

    // studio environment for reflections: gradient sweep, overhead softbox, strip lights, dark floor
    const env = new T.Scene();
    const skyGeo = new T.SphereGeometry(40, 48, 24);
    const cols = [];
    const pos = skyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const yv = pos.getY(i) / 40;
      const top = new T.Color(1.05, 1.05, 1.08), mid = new T.Color(0.52, 0.55, 0.6), low = new T.Color(0.08, 0.085, 0.095);
      const c = yv > 0 ? mid.clone().lerp(top, Math.pow(yv, 0.7)) : mid.clone().lerp(low, Math.pow(-yv, 0.45));
      cols.push(c.r, c.g, c.b);
    }
    skyGeo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    env.add(new T.Mesh(skyGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
    const softbox = (w, h, x, y, z, color, k) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(k), side: T.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    softbox(18, 18, 0, 30, 4, 0xffffff, 3.2);      // key, overhead
    softbox(3, 22, -26, 8, 10, 0xfff1e0, 2.4);     // warm strip, left
    softbox(3, 22, 24, 6, -12, 0xe4f0ff, 2.0);     // cool strip, right back
    softbox(14, 5, 6, 4, 28, 0xffffff, 1.1);       // soft front fill
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.02).texture;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene.add(new T.HemisphereLight(0xf4f7ff, 0x5d6670, 0.3));
    keyLight = new T.DirectionalLight(0xfffaf2, 1.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.radius = 3;
    scene.add(keyLight);
    scene.add(keyLight.target);
    const fill = new T.DirectionalLight(0xd6e6ff, 0.3);
    fill.position.set(-10, 4, -8);
    scene.add(fill);
    const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    (QC.allTextures || []).forEach((t) => { t.anisotropy = Math.min(8, maxAniso); });

    orbit = new QC.Orbit(camera, canvas);
    orbit.onInteract = () => { tween = null; };
    raycaster = new T.Raycaster();
    window.addEventListener('resize', resize);
    resize();
  }

  function resize() {
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }

  /* ---------------- build model ---------------- */
  function buildModel() {
    const cry = QC.buildCryostat();
    QC.buildFacility(cry);
    QC.buildPackage();
    QC.buildChip();
    QC.buildQubit();
    Object.values(VIEWS).forEach((cfg) => {
      cfg.roots.forEach((r) => {
        const v = QC.views[r];
        if (!v.root.parent) scene.add(v.root);
      });
    });
    QC.views.package.root.position.set(100, 0, 0);
    QC.views.chip.root.position.set(200, 0, 0);
    QC.views.qubit.root.position.set(300, 0, 0);
    // invisible floors that only show the model's soft shadow in the close-up views
    Object.entries(VIEWS).forEach(([id, cfg]) => {
      if (cfg.floorY == null) return;
      const c = new T.Mesh(new T.PlaneGeometry(60, 60), new T.ShadowMaterial({ opacity: 0.16 }));
      c.rotation.x = -Math.PI / 2;
      c.position.set(cfg.offset[0], cfg.floorY, cfg.offset[2]);
      c.receiveShadow = true;
      scene.add(c);
      catchers[id] = c;
    });

    Object.values(QC.views).forEach((v) => {
      v.root.traverse((o) => {
        if (!o.isMesh) return;
        o.userData.viewRoot = v.id;
        o.userData.orig = o.material;
        const mt = Array.isArray(o.material) ? o.material[0] : o.material;
        o.castShadow = !mt.transparent && !(mt.emissive && mt.emissiveIntensity > 0.3);
        o.receiveShadow = !mt.transparent;
        const part = o.userData.part;
        if (!part) return;
        (partMeshes[part] = partMeshes[part] || []).push(o);
        allMeshes.push(o);
        // temperature: nearest ancestor with tempK, else the part's own
        let K = null, p = o;
        while (p && K == null) { if (p.userData.tempK != null) K = p.userData.tempK; p = p.parent; }
        o.userData.K = K != null ? K : (QC.PARTS[part] ? QC.PARTS[part].tempK : 300);
      });
    });
    Object.keys(QC.PARTS).forEach((id) => { if (!partMeshes[id]) console.warn('No geometry for part', id); });
    Object.keys(partMeshes).forEach((id) => { if (!QC.PARTS[id]) console.warn('No catalogue entry for', id); });
    Object.keys(VIEWS).forEach((k) => {
      const r = VIEWS[k].explodeRoot;
      if (state.explode[r] == null) { state.explode[r] = VIEWS[k].explode; state.explodeTarget[r] = VIEWS[k].explode; }
    });
    Object.values(QC.views).forEach((v) => applyExplode(v, state.explode[v.id] || 0));
  }

  function applyExplode(v, t) {
    v.explodables.forEach((o) => { o.position.copy(o.userData.base).addScaledVector(o.userData.ex, t); });
    v.fades.forEach((f) => {
      f.mat.opacity = f.base * Math.max(0, 1 - f.amount * t * 1.15);
      f.mat.visible = f.mat.opacity > 0.01;
    });
    hlCache.forEach((m) => { if (m.userData.src && m.userData.src.transparent) { m.opacity = m.userData.src.opacity; m.visible = m.userData.src.visible; } });
    QC.updateSpanners(v);
  }

  /* ---------------- materials / visibility ---------------- */
  function refreshMaterials() {
    dirtyMaterials = false;
    const active = new Set(VIEWS[state.view].roots);
    allMeshes.forEach((m) => {
      if (!active.has(m.userData.viewRoot)) return;
      const part = m.userData.part;
      const orig = m.userData.orig;
      const pick = (mat) => {
        let base = mat;
        if (state.tempMap && !mat.transparent && !(mat.map && part === 'pkgchip')) base = tempMaterial(m.userData.K);
        if (part === state.selected) return highlight(base, 'sel');
        if (part === state.hovered) return highlight(base, 'hov');
        return base;
      };
      m.material = Array.isArray(orig) ? orig.map(pick) : pick(orig);
      m.visible = !(state.isolate && state.selected) || part === state.selected;
    });
    const cry = QC.views.cryostat;
    cry.shields.forEach((g) => { g.visible = state.shields; });
  }

  /* ---------------- views ---------------- */
  function setView(id, opts) {
    const o = opts || {};
    state.view = id;
    const cfg = VIEWS[id];
    Object.values(QC.views).forEach((v) => { v.root.visible = cfg.roots.includes(v.id); });
    Object.entries(catchers).forEach(([k, c]) => { c.visible = k === id; });
    frameShadow(cfg);
    document.querySelectorAll('.view-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === id)));
    const cap = document.getElementById('caption');
    cap.textContent = cfg.caption;
    cap.hidden = !QC.SHOW_CAPTIONS; // hidden by choice: not enough space over the model
    const slider = document.getElementById('explode');
    // the whole-system view keeps the fridge assembled so it stays attached to its frame and hoses
    if (id === 'system') {
      if (state.savedCryo == null) state.savedCryo = state.explodeTarget.cryostat;
      state.explodeTarget.cryostat = 0;
    } else if (state.savedCryo != null) {
      state.explodeTarget.cryostat = state.savedCryo;
      state.savedCryo = null;
    }
    slider.disabled = id === 'system';
    slider.value = Math.round((state.explodeTarget[cfg.explodeRoot] || 0) * 100);
    updateSliderText();
    const cryoLike = id === 'system' || id === 'cryostat';
    document.getElementById('t-shields').disabled = !cryoLike;
    document.getElementById('t-signal').disabled = !cryoLike;
    if (!cryoLike && state.signal) setSignal(false);
    orbit.maxDist = id === 'system' ? 90 : 45;
    orbit.minDist = id === 'qubit' || id === 'chip' ? 0.4 : 0.8;
    if (!o.noCam) {
      const off = new T.Vector3().fromArray(cfg.offset);
      moveCamera(new T.Vector3().fromArray(cfg.cam).add(off), new T.Vector3().fromArray(cfg.target).add(off), o.instant);
    }
    dirtyMaterials = true;
    renderTree();
  }

  function frameShadow(cfg) {
    const S = cfg.shadow.size;
    const c = new T.Vector3().fromArray(cfg.shadow.center).add(new T.Vector3().fromArray(cfg.offset));
    keyLight.target.position.copy(c);
    keyLight.position.copy(c).add(new T.Vector3(0.45, 1, 0.38).normalize().multiplyScalar(S * 3));
    const sc = keyLight.shadow.camera;
    sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S;
    sc.near = S * 0.5; sc.far = S * 6;
    sc.updateProjectionMatrix();
    keyLight.target.updateMatrixWorld();
  }

  function moveCamera(pos, target, instant) {
    if (instant || reduceMotion) {
      camera.position.copy(pos);
      orbit.target.copy(target);
      orbit.stop();
      tween = null;
      return;
    }
    tween = { p0: camera.position.clone(), t0: orbit.target.clone(), p1: pos, t1: target, start: performance.now(), dur: 1100 };
    orbit.stop();
  }

  function partBox(id) {
    const box = new T.Box3();
    const tmp = new T.Box3();
    const m4 = new T.Matrix4();
    (partMeshes[id] || []).forEach((m) => {
      if (!m.visible || !m.parent || !visibleChain(m)) return;
      m.updateWorldMatrix(true, false);
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      if (m.isInstancedMesh) {
        for (let i = 0; i < m.count; i++) {
          m.getMatrixAt(i, m4);
          m4.premultiply(m.matrixWorld);
          tmp.copy(m.geometry.boundingBox).applyMatrix4(m4);
          box.union(tmp);
        }
      } else {
        tmp.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);
        box.union(tmp);
      }
    });
    return box;
  }

  function focusPart(id) {
    const box = partBox(id);
    if (box.isEmpty()) return;
    const c = box.getCenter(new T.Vector3());
    const size = box.getSize(new T.Vector3()).length() / 2;
    const dir = camera.position.clone().sub(orbit.target).normalize();
    if (dir.y < 0.15) { dir.y = 0.35; dir.normalize(); }
    const dist = Math.max(size / Math.sin((camera.fov * Math.PI) / 360) * 1.25, orbit.minDist * 1.5);
    moveCamera(c.clone().addScaledVector(dir, dist), c);
  }

  /* ---------------- selection ---------------- */
  function select(id, opts) {
    const o = opts || {};
    if (id && partMeshes[id]) {
      const inView = partMeshes[id].some((m) => VIEWS[state.view].roots.includes(m.userData.viewRoot));
      if (!inView) setView(QC.PARTS[id].view, { noCam: true });
    }
    state.selected = id;
    if (!id) state.isolate = false;
    dirtyMaterials = true;
    renderInfo();
    renderTree();
    if (id && o.focus) focusPart(id);
    try { history.replaceState(null, '', id ? '#' + id : location.pathname + location.search); } catch (e) { /* file:// */ }
  }

  function visibleChain(o) {
    let p = o;
    while (p) { if (!p.visible) return false; p = p.parent; }
    return true;
  }

  function pickAt(clientX, clientY) {
    const r = stageEl.getBoundingClientRect();
    const ndc = new T.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const roots = VIEWS[state.view].roots.map((id) => QC.views[id].root);
    const hits = raycaster.intersectObjects(roots, true).filter((h) => {
      const m = h.object;
      if (!m.isMesh || !m.userData.part || !visibleChain(m)) return false;
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      if (!mat.visible || (mat.transparent && mat.opacity < 0.04)) return false;
      return true;
    });
    const solid = hits.find((h) => !h.object.userData.shield);
    const hit = solid || hits[0];
    return hit ? hit.object.userData.part : null;
  }

  function setupPicking() {
    const canvas = renderer.domElement;
    let down = null;
    canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 5) return;
      const id = pickAt(e.clientX, e.clientY);
      if (id) {
        select(id);
        openPanel('info');
      } else select(null);
    });
    let pending = null;
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || e.buttons) return;
      pending = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointerleave', () => { pending = null; setHover(null); });
    QC._hoverTick = () => {
      if (!pending) return;
      const id = pickAt(pending.x, pending.y);
      pending = null;
      setHover(id);
    };
  }
  function setHover(id) {
    if (id === state.hovered) return;
    state.hovered = id;
    renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    dirtyMaterials = true;
    const tip = document.getElementById('hovertip');
    if (id && id !== state.selected) { tip.textContent = QC.PARTS[id].name; tip.hidden = false; } else tip.hidden = true;
  }

  /* ---------------- labels ---------------- */
  function buildLabels() {
    Object.values(QC.views).forEach((v) => {
      v.labels.forEach((L) => {
        const b = document.createElement('button');
        b.className = 'tag';
        b.type = 'button';
        b.textContent = L.text;
        b.addEventListener('click', () => { select(L.part); openPanel('info'); });
        labelsEl.appendChild(b);
        labelEls.push({ el: b, L, view: v.id });
      });
    });
  }
  const tmpV = new T.Vector3();
  function updateLabels() {
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    const active = VIEWS[state.view].roots;
    const placed = [];
    const items = [];
    labelEls.forEach((it) => {
      const show = active.includes(it.view) && (state.labels || it.L.part === state.selected) && visibleChain(it.L.obj);
      const meshesVisible = (partMeshes[it.L.part] || []).some((m) => m.visible && visibleChain(m) && !(m.material.transparent && m.material.opacity < 0.04));
      if (!show || !meshesVisible) { it.el.hidden = true; return; }
      it.L.obj.getWorldPosition(tmpV);
      const dist = tmpV.distanceTo(camera.position);
      tmpV.project(camera);
      if (tmpV.z > 1 || tmpV.x < -1.1 || tmpV.x > 1.1 || tmpV.y < -1.1 || tmpV.y > 1.1) { it.el.hidden = true; return; }
      items.push({ it, x: (tmpV.x * 0.5 + 0.5) * w, y: (-tmpV.y * 0.5 + 0.5) * h, dist, sel: it.L.part === state.selected, hov: it.L.part === state.hovered });
    });
    items.sort((a, b) => (b.sel - a.sel) || (b.hov - a.hov) || a.dist - b.dist);
    const shownParts = new Set();
    items.forEach((p) => {
      const est = p.it.L.text.length * 6.6 + 26;
      const rect = { x0: p.x - 6, y0: p.y - 12, x1: p.x + est, y1: p.y + 12 };
      const overlaps = placed.some((q) => !(rect.x1 < q.x0 || rect.x0 > q.x1 || rect.y1 < q.y0 || rect.y0 > q.y1));
      const dup = shownParts.has(p.it.L.part + p.it.L.text) && !p.sel;
      if ((overlaps || dup) && !p.sel) { p.it.el.hidden = true; return; }
      placed.push(rect);
      shownParts.add(p.it.L.part + p.it.L.text);
      p.it.el.hidden = false;
      p.it.el.classList.toggle('is-selected', p.sel);
      p.it.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    });
  }

  /* ---------------- signal animation ---------------- */
  function setSignal(on) {
    state.signal = on;
    document.getElementById('t-signal').setAttribute('aria-pressed', String(on));
    pulses.forEach((p) => scene.remove(p.mesh));
    pulses = [];
    const cap = document.getElementById('signalcap');
    cap.hidden = !on;
    if (!on) return;
    const mk = (color) => {
      const g = new T.Group();
      const core = new T.Mesh(new T.SphereGeometry(0.09, 16, 12), new T.MeshBasicMaterial({ color }));
      const glow = new T.Mesh(new T.SphereGeometry(0.22, 16, 12), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false }));
      g.add(core); g.add(glow);
      scene.add(g);
      return g;
    };
    for (let k = 0; k < 3; k++) {
      pulses.push({ path: 'drive', phase: k / 3, mesh: mk(0xff8a2a) });
      pulses.push({ path: 'readout', phase: k / 3 + 0.15, mesh: mk(0x2ab4ee) });
    }
  }
  function updatePulses(time) {
    if (!pulses.length) return;
    const cry = QC.views.cryostat;
    const lines = {};
    ['drive', 'readout'].forEach((k) => {
      const pts = cry.paths[k].map((a) => a.getWorldPosition(new T.Vector3()));
      const lens = [0];
      for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
      lines[k] = { pts, lens, total: lens[lens.length - 1] };
    });
    pulses.forEach((p) => {
      const L = lines[p.path];
      const s = (((time / 7000) + p.phase) % 1) * L.total;
      let i = 1;
      while (i < L.lens.length - 1 && L.lens[i] < s) i++;
      const t = (s - L.lens[i - 1]) / Math.max(L.lens[i] - L.lens[i - 1], 1e-6);
      p.mesh.position.lerpVectors(L.pts[i - 1], L.pts[i], t);
      // drive pulses fade as they are attenuated going down
      const u = s / L.total;
      const sc = p.path === 'drive' ? 1.25 - 0.8 * u : 0.45 + 0.9 * u;
      p.mesh.scale.setScalar(sc);
    });
  }

  /* ---------------- UI: tree ---------------- */
  function renderTree() {
    const tree = document.getElementById('tree');
    const q = (document.getElementById('search').value || '').trim().toLowerCase();
    const byView = {};
    Object.entries(QC.PARTS).forEach(([id, p]) => {
      if (q && !(p.name.toLowerCase().includes(q) || p.text.join(' ').toLowerCase().includes(q) || p.cat.toLowerCase().includes(q))) return;
      ((byView[p.view] = byView[p.view] || {})[p.cat] = byView[p.view][p.cat] || []).push([id, p]);
    });
    const html = [];
    Object.keys(VIEWS).forEach((vid) => {
      if (!byView[vid]) return;
      const open = q || vid === state.view ? ' open' : '';
      html.push(`<details class="tree-group"${open}><summary>${QC.VIEW_NAMES[vid]}</summary>`);
      Object.entries(byView[vid]).forEach(([cat, items]) => {
        html.push(`<p class="tree-cat">${cat}</p><ul>`);
        items.forEach(([id, p]) => {
          html.push(`<li><button type="button" class="tree-item${id === state.selected ? ' is-selected' : ''}" data-part="${id}">${p.name}</button></li>`);
        });
        html.push('</ul>');
      });
      html.push('</details>');
    });
    if (!html.length) html.push('<p class="empty">No parts match. Try a shorter word, such as \u201cfilter\u201d or \u201camplifier\u201d.</p>');
    tree.innerHTML = html.join('');
  }

  /* ---------------- UI: info panel ---------------- */
  function renderInfo() {
    const el = document.getElementById('info-body');
    const id = state.selected;
    if (!id) {
      el.innerHTML = `
        <h2 class="info-title">Pick any part</h2>
        <p class="info-text">Click a component in the model, a label, or a name in the parts list to see what it does and where it sits.</p>
        <p class="info-text">Signals travel down to the chip through filters and attenuators; results travel back up through amplifiers. Heat travels the other way, removed stage by stage.</p>
        <div class="howto">
          <p><strong>Rotate</strong> drag</p>
          <p><strong>Pan</strong> right-drag or shift-drag</p>
          <p><strong>Zoom</strong> scroll or pinch</p>
        </div>`;
      return;
    }
    const p = QC.PARTS[id];
    const links = (p.links || []).filter((l) => QC.PARTS[l]).map((l) => `<button type="button" class="chip-link" data-part="${l}">${QC.PARTS[l].name}</button>`).join('');
    const detail = p.detail ? `<button type="button" class="btn btn-primary" data-open="${p.detail}">Open ${QC.VIEW_NAMES[p.detail].toLowerCase()} view</button>` : '';
    el.innerHTML = `
      <h2 class="info-title">${p.name}</h2>
      <dl class="facts">
        <div><dt>Location</dt><dd>${p.where}</dd></div>
        <div><dt>Temperature</dt><dd><span class="swatch" style="background:#${tempColor(tempT(p.tempK)).getHexString()}"></span>${p.temp}</dd></div>
      </dl>
      ${p.text.map((t) => `<p class="info-text">${t}</p>`).join('')}
      <div class="info-actions">
        <button type="button" class="btn" data-act="focus">Zoom to part</button>
        <button type="button" class="btn" data-act="isolate" aria-pressed="${state.isolate}">${state.isolate ? 'Show everything' : 'Show only this'}</button>
        ${detail}
      </div>
      ${links ? `<p class="related-title">Related parts</p><div class="related">${links}</div>` : ''}`;
  }

  function openPanel(which) {
    if (window.innerWidth > 900) return;
    document.body.dataset.panel = which;
  }

  /* ---------------- tour ---------------- */
  function tourGo(i) {
    const n = QC.TOUR.length;
    if (i < 0 || i >= n) { endTour(); return; }
    state.tour = i;
    const step = QC.TOUR[i];
    const p = QC.PARTS[step.part];
    state.isolate = false;
    if (p.view !== state.view) setView(p.view, { noCam: true });
    if (step.part === 'plate50' || step.part === 'pulsetube' || step.part === 'still' || step.part === 'mxc') {
      state.explodeTarget.cryostat = Math.max(state.explodeTarget.cryostat, 0.5);
      state.savedCryo = null;
      document.getElementById('explode').value = Math.round(state.explodeTarget.cryostat * 100);
      updateSliderText();
    }
    select(step.part);
    setTimeout(() => focusPart(step.part), reduceMotion ? 0 : 60);
    const bar = document.getElementById('tourbar');
    bar.hidden = false;
    bar.querySelector('.tour-count').textContent = `Stop ${i + 1} of ${n}`;
    bar.querySelector('.tour-note').textContent = step.note;
    bar.querySelector('[data-tour="prev"]').disabled = i === 0;
    bar.querySelector('[data-tour="next"]').textContent = i === n - 1 ? 'Finish' : 'Next';
    document.getElementById('t-tour').setAttribute('aria-pressed', 'true');
  }
  function endTour() {
    state.tour = -1;
    document.getElementById('tourbar').hidden = true;
    document.getElementById('t-tour').setAttribute('aria-pressed', 'false');
  }

  /* ---------------- controls wiring ---------------- */
  function updateSliderText() {
    const s = document.getElementById('explode');
    const val = Number(s.value);
    if (s.disabled) { document.getElementById('explode-out').textContent = 'Switch to the cryostat to take it apart'; return; }
    document.getElementById('explode-out').textContent = val === 0 ? 'Assembled' : val === 100 ? 'Fully apart' : `${val}% apart`;
  }
  function toggle(id, key, after) {
    const b = document.getElementById(id);
    b.addEventListener('click', () => {
      state[key] = !state[key];
      b.setAttribute('aria-pressed', String(state[key]));
      dirtyMaterials = true;
      if (after) after(state[key]);
    });
  }

  function setupUI() {
    document.querySelectorAll('.view-btn').forEach((b) => {
      b.querySelector('.view-scale').textContent = SCALE[b.dataset.view];
      b.addEventListener('click', () => { endTour(); setView(b.dataset.view); });
    });
    const slider = document.getElementById('explode');
    slider.addEventListener('input', () => {
      state.explodeTarget[VIEWS[state.view].explodeRoot] = Number(slider.value) / 100;
      updateSliderText();
    });
    toggle('t-shields', 'shields');
    toggle('t-labels', 'labels');
    toggle('t-temp', 'tempMap', (on) => { document.getElementById('legend').hidden = !on; });
    document.getElementById('t-signal').addEventListener('click', () => setSignal(!state.signal));
    document.getElementById('t-tour').addEventListener('click', () => { if (state.tour >= 0) endTour(); else tourGo(0); });
    document.getElementById('t-reset').addEventListener('click', () => { setView(state.view); });
    document.getElementById('tourbar').addEventListener('click', (e) => {
      const a = e.target.closest('[data-tour]');
      if (!a) return;
      if (a.dataset.tour === 'next') tourGo(state.tour + 1);
      else if (a.dataset.tour === 'prev') tourGo(state.tour - 1);
      else endTour();
    });
    document.getElementById('search').addEventListener('input', renderTree);
    document.getElementById('tree').addEventListener('click', (e) => {
      const b = e.target.closest('[data-part]');
      if (!b) return;
      const id = b.dataset.part;
      if (QC.PARTS[id].view !== state.view) setView(QC.PARTS[id].view, { noCam: true });
      select(id, { focus: true });
      openPanel('info');
    });
    document.getElementById('info').addEventListener('click', (e) => {
      const l = e.target.closest('[data-part]');
      if (l) { const id = l.dataset.part; if (QC.PARTS[id].view !== state.view) setView(QC.PARTS[id].view, { noCam: true }); select(id, { focus: true }); return; }
      const o = e.target.closest('[data-open]');
      if (o) { setView(o.dataset.open); select(null); return; }
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'focus' && state.selected) focusPart(state.selected);
      if (a.dataset.act === 'isolate') { state.isolate = !state.isolate; dirtyMaterials = true; renderInfo(); }
    });
    document.querySelectorAll('[data-panel-open]').forEach((b) => b.addEventListener('click', () => {
      document.body.dataset.panel = document.body.dataset.panel === b.dataset.panelOpen ? '' : b.dataset.panelOpen;
    }));
    document.querySelectorAll('[data-panel-close]').forEach((b) => b.addEventListener('click', () => { document.body.dataset.panel = ''; }));
    window.addEventListener('keydown', (e) => {
      if (e.target.matches('input')) { if (e.key === 'Escape') e.target.blur(); return; }
      if (e.key === 'Escape') { if (state.tour >= 0) endTour(); else select(null); }
      if (e.key === '/') { e.preventDefault(); document.getElementById('search').focus(); }
      if (state.tour >= 0 && e.key === 'ArrowRight') tourGo(state.tour + 1);
      if (state.tour >= 0 && e.key === 'ArrowLeft') tourGo(state.tour - 1);
    });
    // temperature legend ticks
    const ticks = [[300, '300 K'], [50, '50 K'], [4, '4 K'], [0.8, '800 mK'], [0.1, '100 mK'], [0.01, '10 mK']];
    const grad = tempStops.map(([u, c]) => `#${new T.Color(c).getHexString()} ${u * 100}%`).join(', ');
    document.getElementById('legend').innerHTML = `
      <p class="legend-title">Temperature</p>
      <div class="legend-scale"><div class="legend-bar" style="background:linear-gradient(to top, ${grad})"></div>
      <ul>${ticks.map(([K, t]) => `<li style="bottom:${(tempT(K) * 100).toFixed(1)}%">${t}</li>`).join('')}</ul></div>`;
  }

  /* ---------------- loop ---------------- */
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function loop(now) {
    requestAnimationFrame(loop);
    // explode smoothing
    Object.keys(state.explodeTarget).forEach((r) => {
      const cur = state.explode[r], tgt = state.explodeTarget[r];
      if (Math.abs(cur - tgt) > 0.0005) {
        state.explode[r] = reduceMotion ? tgt : cur + (tgt - cur) * 0.12;
        if (Math.abs(state.explode[r] - tgt) < 0.0005) state.explode[r] = tgt;
        applyExplode(QC.views[r], state.explode[r]);
      }
    });
    if (tween) {
      const k = Math.min(1, (now - tween.start) / tween.dur);
      const e = ease(k);
      camera.position.lerpVectors(tween.p0, tween.p1, e);
      orbit.target.lerpVectors(tween.t0, tween.t1, e);
      camera.lookAt(orbit.target);
      if (k >= 1) tween = null;
    } else orbit.update();
    if (QC._hoverTick) QC._hoverTick();
    if (dirtyMaterials) refreshMaterials();
    updatePulses(now);
    renderer.render(scene, camera);
    updateLabels();
  }

  QC.start = function () {
    setupRenderer();
    buildModel();
    buildLabels();
    setupUI();
    setupPicking();
    renderInfo();
    const hash = decodeURIComponent((location.hash || '').slice(1));
    if (hash && QC.PARTS[hash]) {
      setView(QC.PARTS[hash].view, { instant: true });
      select(hash, { focus: true });
    } else {
      setView('cryostat', { instant: true });
      // opening moment: the cans lower and the stages part slightly
      const start = VIEWS.cryostat;
      camera.position.set(start.cam[0] * 1.35, start.cam[1] * 1.2, start.cam[2] * 1.35);
      moveCamera(new T.Vector3().fromArray(start.cam), new T.Vector3().fromArray(start.target), false);
      setTimeout(() => {
        state.explodeTarget.cryostat = 0.35;
        document.getElementById('explode').value = 35;
        updateSliderText();
      }, reduceMotion ? 0 : 700);
    }
    document.getElementById('loading').hidden = true;
    requestAnimationFrame(loop);
  };

  QC.showLoadError = function (msg) {
    const l = document.getElementById('loading');
    l.hidden = false;
    l.classList.add('is-error');
    l.innerHTML = msg;
  };
})();
