/* Dilution refrigerator ("chandelier") with wiring and readout chain. */
(function () {
  const QC = (window.QC = window.QC || {});
  const T = THREE;

  QC.buildCryostat = function () {
    const U = QC.U, M = QC.M;
    const v = U.view('cryostat');
    const root = v.root;

    const S = [
      { id: 'plate300', y: 10.0, r: 3.3, t: 0.28, K: 300, mat: M.steel },
      { id: 'plate50', y: 7.5, r: 3.05, t: 0.16, K: 50, mat: M.gold },
      { id: 'plate4', y: 5.3, r: 2.8, t: 0.14, K: 4, mat: M.gold },
      { id: 'platestill', y: 3.55, r: 2.5, t: 0.12, K: 0.8, mat: M.gold },
      { id: 'platecold', y: 2.2, r: 2.3, t: 0.1, K: 0.1, mat: M.gold },
      { id: 'platemxc', y: 0.8, r: 2.15, t: 0.16, K: 0.01, mat: M.gold },
    ];
    const N = S.length;

    const pol = (deg, R) => ({ x: R * Math.cos((deg * Math.PI) / 180), z: R * Math.sin((deg * Math.PI) / 180) });
    const R_LINE = 1.72;
    const kinds = ['drive', 'drive', 'flux', 'flux', 'drive', 'readin', 'pump', 'readin'];
    const inputs = kinds.map((k, i) => Object.assign(pol(128 + i * 14, R_LINE), { kind: k }));
    const outputs = [pol(-14, R_LINE), pol(14, R_LINE)];
    const PT = { x: -0.25, z: -1.85 };
    const PUMP = { x: 0.95, z: -1.35 };
    const COND = { x: 0.25, z: -1.2 };
    const DU = { x: 0.55, z: -0.55 };
    const HS = { x: -0.45, z: -1.2 };
    const FLEX = { x: -0.1, z: 1.85 };
    const DC = { x: 0.95, z: 1.45 };
    const THERMO = pol(62, 1.15);

    /* ---------- stage groups and plates ---------- */
    const G = S.map((s, i) => {
      const g = new T.Group();
      g.position.set(0, s.y, 0);
      g.userData.tempK = s.K;
      root.add(g);
      U.explode(g, 0, (N - 1 - i) * 1.75, 0);
      return g;
    });
    const top = (i) => S[i].t / 2;
    const bot = (i) => -S[i].t / 2;

    function plateGeo(s, i) {
      const sh = new T.Shape();
      sh.absarc(0, 0, s.r, 0, Math.PI * 2, false);
      const hole = (p, r) => { const h = new T.Path(); h.absarc(p.x, -p.z, r, 0, Math.PI * 2, true); sh.holes.push(h); };
      const rect = (p, w, d) => {
        const h = new T.Path();
        h.moveTo(p.x - w / 2, -p.z - d / 2); h.lineTo(p.x - w / 2, -p.z + d / 2);
        h.lineTo(p.x + w / 2, -p.z + d / 2); h.lineTo(p.x + w / 2, -p.z - d / 2); h.closePath();
        sh.holes.push(h);
      };
      inputs.concat(outputs).forEach((p) => hole(p, 0.06));
      if (i <= 1) hole(PT, 0.24);
      if (i <= 2) hole(PUMP, 0.22);
      if (i <= 3) hole(COND, 0.05);
      if (i === 3 || i === 4) hole(DU, 0.09);
      if (i <= 4) rect(FLEX, 0.7, 0.12);
      if (i <= 4) hole(DC, 0.09);
      if (i === 0) hole({ x: 0, z: 0 }, 0.35);
      const g = new T.ExtrudeGeometry(sh, { depth: s.t, bevelEnabled: false, curveSegments: 48 });
      g.rotateX(-Math.PI / 2);
      g.translate(0, -s.t / 2, 0);
      return g;
    }

    const boltGeo = new T.CylinderGeometry(0.045, 0.045, 0.05, 6);
    S.forEach((s, i) => {
      const g = G[i];
      U.mesh(plateGeo(s, i), QC.plateMaterial(s.mat, s.r), s.id, g);
      // bolt heads around the rim
      const n = 28;
      const bolts = new T.InstancedMesh(boltGeo, M.steelDark, n);
      const m4 = new T.Matrix4();
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        m4.makeTranslation(Math.cos(a) * (s.r - 0.12), top(i) + 0.025, Math.sin(a) * (s.r - 0.12));
        bolts.setMatrixAt(k, m4);
      }
      bolts.userData.part = s.id;
      g.add(bolts);
      U.label(s.id, U.anchor(g, s.r * 0.74, 0, s.r * 0.68));
      // thermometer
      const th = U.box(0.16, 0.06, 0.1, M.copper, 'thermo', g, THERMO.x, top(i) + 0.03, THERMO.z);
      U.box(0.1, 0.012, 0.06, M.paint, 'thermo', th, 0, 0.036, 0);
      U.tube([new T.Vector3(THERMO.x + 0.08, top(i) + 0.03, THERMO.z),
        new T.Vector3(THERMO.x + 0.25, top(i) + 0.06, THERMO.z + 0.1),
        new T.Vector3(DC.x - 0.05, top(i) + 0.05, DC.z - 0.05)], 0.008, M.copperMatte, 'thermo', g);
      if (i === 5) U.label('thermo', th);
    });

    /* ---------- support rods ---------- */
    for (let i = 0; i < N - 1; i++) {
      for (let k = 0; k < 3; k++) {
        const p = pol(96 + i * 22 + k * 120, S[i + 1].r * 0.9);
        const a = U.anchor(G[i], p.x, bot(i), p.z);
        const b = U.anchor(G[i + 1], p.x, top(i + 1), p.z);
        U.span('rod', a, b, { r: 0.05, mat: M.g10, part: 'rods', tempK: Math.sqrt(S[i].K * S[i + 1].K), seg: 12 });
        if (i === 2 && k === 0) U.label('rods', a);
      }
    }

    /* ---------- pulse tube ---------- */
    (function () {
      const g0 = G[0];
      // rotary valve and motor on top
      const rv = U.cyl(0.26, 0.5, M.steel, 'rotvalve', g0, PT.x, top(0) + 0.25, PT.z);
      U.box(0.36, 0.3, 0.28, M.paintDark, 'rotvalve', g0, PT.x + 0.35, top(0) + 0.62, PT.z);
      U.cyl(0.3, 0.08, M.steelDark, 'rotvalve', g0, PT.x, top(0) + 0.54, PT.z);
      U.label('rotvalve', rv);
      // helium hoses stubs
      [-0.12, 0.12].forEach((dz, k) => {
        U.tube([
          new T.Vector3(PT.x - 0.1, top(0) + 0.45, PT.z + dz),
          new T.Vector3(PT.x - 0.7, top(0) + 0.9, PT.z + dz),
          new T.Vector3(PT.x - 1.4, top(0) + 1.3 + k * 0.1, PT.z + dz - 0.4),
        ], 0.06, M.hoseShort, 'helines', g0);
      });
      // tubes (regenerator sections)
      const a0 = U.anchor(G[0], PT.x, bot(0), PT.z);
      const a1 = U.anchor(G[1], PT.x, top(1) + 0.2, PT.z);
      const a2 = U.anchor(G[1], PT.x, bot(1), PT.z);
      const a3 = U.anchor(G[2], PT.x, top(2) + 0.18, PT.z);
      U.span('rod', a0, a1, { r: 0.2, mat: M.steel, part: 'pulsetube', tempK: 120, seg: 24 });
      U.span('rod', a2, a3, { r: 0.12, mat: M.steel, part: 'pulsetube', tempK: 14, seg: 24 });
      // second thin tube (the pulse tube itself alongside the regenerator)
      const b0 = U.anchor(G[0], PT.x + 0.3, bot(0), PT.z + 0.05);
      const b1 = U.anchor(G[1], PT.x + 0.3, top(1) + 0.2, PT.z + 0.05);
      const b2 = U.anchor(G[1], PT.x + 0.22, bot(1), PT.z + 0.05);
      const b3 = U.anchor(G[2], PT.x + 0.22, top(2) + 0.18, PT.z + 0.05);
      U.span('rod', b0, b1, { r: 0.07, mat: M.steelDark, part: 'pulsetube', tempK: 120 });
      U.span('rod', b2, b3, { r: 0.05, mat: M.steelDark, part: 'pulsetube', tempK: 14 });
      U.label('pulsetube', a1);
      // cold head flanges + braids
      [1, 2].forEach((i) => {
        const g = G[i];
        const fl = U.cyl(i === 1 ? 0.36 : 0.28, 0.18, M.copper, 'pulsetube', g, PT.x + 0.1, top(i) + 0.09, PT.z);
        fl.userData.tempK = S[i].K;
        for (let k = 0; k < 4; k++) {
          const ang = -0.4 + k * 0.45;
          const sx = PT.x + 0.1 + Math.cos(ang) * 0.3, sz = PT.z + Math.sin(ang) * 0.3;
          const ex = PT.x + 0.1 + Math.cos(ang) * 0.95, ez = PT.z + 0.35 + Math.sin(ang) * 0.6;
          U.tube([
            new T.Vector3(sx, top(i) + 0.14, sz),
            new T.Vector3((sx + ex) / 2, top(i) + 0.42, (sz + ez) / 2),
            new T.Vector3(ex, top(i) + 0.05, ez),
          ], 0.035, M.copperMatte, 'braids', g);
          U.box(0.14, 0.04, 0.1, M.copper, 'braids', g, ex, top(i) + 0.02, ez);
        }
        if (i === 2) U.label('braids', U.anchor(g, PT.x + 0.7, top(i) + 0.3, PT.z + 0.4));
      });
    })();

    /* ---------- dilution unit ---------- */
    (function () {
      // pumping line
      const segs = [[0, 1], [1, 2], [2, 3]];
      segs.forEach(([i, j]) => {
        const a = U.anchor(G[i], PUMP.x, bot(i), PUMP.z);
        const b = U.anchor(G[j], PUMP.x, top(j) + (j === 3 ? 0.05 : 0.02), PUMP.z);
        U.span('rod', a, b, { r: 0.19, mat: M.steel, part: 'pumpline', tempK: Math.sqrt(S[i].K * S[j].K), seg: 24 });
        if (i === 1) U.label('pumpline', a);
      });
      // top elbow + KF flange
      const g0 = G[0];
      U.cyl(0.19, 0.8, M.steel, 'pumpline', g0, PUMP.x, top(0) + 0.4, PUMP.z);
      U.cyl(0.27, 0.06, M.steelDark, 'pumpline', g0, PUMP.x, top(0) + 0.82, PUMP.z);
      v.paths.pumpTop = U.anchor(g0, PUMP.x, top(0) + 0.85, PUMP.z);
      // still
      const gs = G[3];
      const still = U.cyl(0.4, 0.48, M.silver, 'still', gs, PUMP.x, bot(3) - 0.26, PUMP.z, 32);
      U.cyl(0.42, 0.05, M.copper, 'still', gs, PUMP.x, bot(3) - 0.06, PUMP.z, 32);
      U.cyl(0.41, 0.06, M.anodBlue, 'still', gs, PUMP.x, bot(3) - 0.3, PUMP.z, 32); // heater band
      U.label('still', still);
      // condensing line
      [[0, 1], [1, 2], [2, 3]].forEach(([i, j]) => {
        const a = U.anchor(G[i], COND.x, bot(i) - (i === 2 ? 0.34 : 0), COND.z);
        const b = U.anchor(G[j], COND.x, top(j), COND.z);
        U.span('rod', a, b, { r: 0.028, mat: M.copperMatte, part: 'condline', tempK: Math.sqrt(S[i].K * S[j].K) });
      });
      // flow impedance coil under the 4K plate
      const coil = U.mesh(U.helixGeometry(0.07, 6, 0.018), M.copperMatte, 'condline', G[2]);
      coil.position.set(COND.x, bot(2) - 0.17, COND.z);
      coil.scale.set(1, 0.3, 1);
      U.label('condline', coil);
      // condensing line into the continuous heat exchanger
      U.tube([
        new T.Vector3(COND.x, bot(3), COND.z),
        new T.Vector3(COND.x, bot(3) - 0.2, COND.z),
        new T.Vector3(DU.x, bot(3) - 0.2, DU.z),
        new T.Vector3(DU.x, bot(3) - 0.32, DU.z),
      ], 0.025, M.copperMatte, 'condline', gs);
      // continuous heat exchanger (helix spanner)
      const hxObj = new T.Mesh(U.helixGeometry(0.16, 11, 0.028, 8), M.silver);
      hxObj.userData.part = 'chx';
      const ha = U.anchor(gs, DU.x, bot(3) - 0.32, DU.z);
      const hb = U.anchor(G[4], DU.x, top(4) + 0.02, DU.z);
      U.span('group', ha, hb, { obj: hxObj, tempK: 0.3 });
      const core = U.span('rod', ha, hb, { r: 0.05, mat: M.steelDark, part: 'chx', tempK: 0.3 });
      U.label('chx', ha);
      // step heat exchangers under the cold plate
      const gc = G[4];
      const s1 = U.cyl(0.24, 0.17, M.silver, 'shx', gc, DU.x, bot(4) - 0.12, DU.z, 32);
      U.cyl(0.26, 0.03, M.copper, 'shx', gc, DU.x, bot(4) - 0.22, DU.z, 32);
      U.cyl(0.2, 0.15, M.silver, 'shx', gc, DU.x, bot(4) - 0.33, DU.z, 32);
      U.label('shx', s1);
      const sa = U.anchor(gc, DU.x, bot(4) - 0.41, DU.z);
      // mixing chamber on top of the MXC plate
      const gm = G[5];
      const mx = U.cyl(0.36, 0.44, M.silver, 'mxc', gm, DU.x, top(5) + 0.22, DU.z, 40);
      U.cyl(0.4, 0.05, M.copper, 'mxc', gm, DU.x, top(5) + 0.025, DU.z, 40);
      U.cyl(0.38, 0.04, M.copper, 'mxc', gm, DU.x, top(5) + 0.44, DU.z, 40);
      const sb = U.anchor(gm, DU.x, top(5) + 0.46, DU.z);
      U.span('rod', sa, sb, { r: 0.045, mat: M.steel, part: 'shx', tempK: 0.03 });
      U.label('mxc', mx);
      // dilute return line from mixing chamber back up to the still (thin)
      const ra = U.anchor(gm, DU.x + 0.22, top(5) + 0.44, DU.z + 0.1);
      const rb = U.anchor(gs, PUMP.x - 0.2, bot(3) - 0.5, PUMP.z + 0.25);
      U.span('curve', ra, rb, { r: 0.022, mat: M.steelDark, part: 'chx', tempK: 0.1, da: new T.Vector3(0, 1, 0), db: new T.Vector3(0, -1, 0), k: 0.35 });
    })();

    /* ---------- heat switches ---------- */
    [[2, 3], [3, 5]].forEach(([i, j], n) => {
      const p = { x: HS.x + n * 0.15, z: HS.z + n * 0.28 };
      const body = U.cyl(0.11, 0.34, M.copper, 'heatswitch', G[i], p.x, bot(i) - 0.19, p.z);
      U.cyl(0.13, 0.04, M.steelDark, 'heatswitch', G[i], p.x, bot(i) - 0.36, p.z);
      const a = U.anchor(G[i], p.x, bot(i) - 0.38, p.z);
      const b = U.anchor(G[j], p.x, top(j), p.z);
      U.span('rod', a, b, { r: 0.04, mat: M.copperMatte, part: 'heatswitch', tempK: 0.5 });
      if (n === 0) U.label('heatswitch', body);
    });

    /* ---------- coax lines, bulkheads, attenuators ---------- */
    const nutGeo = new T.CylinderGeometry(0.075, 0.075, 0.06, 6);
    const attTex = QC.textTexture('20 dB', '#1c2733', '#f1d9a8');
    const attMat = new T.MeshStandardMaterial({ map: attTex, metalness: 0.3, roughness: 0.4 });
    const driveAnchors = [];
    function bulkhead(i, p) {
      const g = G[i];
      const n = U.mesh(nutGeo, M.steelDark, 'bulkheads', g);
      n.position.set(p.x, top(i) + 0.03, p.z);
      U.cyl(0.042, 0.12, M.gold, 'bulkheads', g, p.x, top(i) + 0.1, p.z, 12);
      U.cyl(0.05, 0.03, M.gold, 'bulkheads', g, p.x, bot(i) - 0.015, p.z, 12);
      return U.anchor(g, p.x, top(i) + 0.16, p.z);
    }
    function attenuator(i, p, y) {
      const g = G[i];
      const a = U.mesh(new T.CylinderGeometry(0.058, 0.058, 0.2, 16), attMat, 'att', g);
      a.position.set(p.x, y, p.z);
      U.cyl(0.05, 0.05, M.gold, 'att', g, p.x, y + 0.12, p.z, 12);
      U.cyl(0.05, 0.05, M.gold, 'att', g, p.x, y - 0.12, p.z, 12);
      return a;
    }

    const allLines = inputs.map((p, idx) => Object.assign(p, { out: false, idx })).concat(outputs.map((p, idx) => Object.assign(p, { out: true, idx, kind: 'readout' })));
    allLines.forEach((L) => {
      // feedthrough on top
      const g0 = G[0];
      U.cyl(0.045, 0.3, M.steel, 'coax', g0, L.x, top(0) + 0.15, L.z, 12);
      U.cyl(0.06, 0.08, M.gold, 'coax', g0, L.x, top(0) + 0.32, L.z, 12);
      const topAnchor = U.anchor(g0, L.x, top(0) + 0.36, L.z);
      const bh = S.map((s, i) => bulkhead(i, L));
      for (let i = 0; i < N - 1; i++) {
        const a = U.anchor(G[i], L.x, bot(i) - 0.03, L.z);
        const b = bh[i + 1];
        const sc = L.out && i >= 2;
        U.span('rod', a, b, { r: 0.027, mat: sc ? M.nbti : M.steel, part: sc ? 'coaxsc' : 'coax', tempK: Math.sqrt(S[i].K * S[i + 1].K) });
        if (!L.out && L.idx === 1 && i === 1) U.label('coax', a);
        if (L.out && L.idx === 0 && i === 3) U.label('coaxsc', a);
      }
      if (!L.out) {
        const attStages = L.kind === 'flux' ? [2] : [2, 3, 4, 5];
        attStages.forEach((i) => {
          const at = attenuator(i, L, bot(i) - 0.16);
          if (L.idx === 0 && i === 3) U.label('att', at);
        });
        // filter bank under the mixing chamber plate
        const gm = G[5];
        const y0 = bot(5) - (L.kind === 'flux' ? 0.2 : 0.45);
        const ir = U.cyl(0.085, 0.3, M.copper, 'irfilter', gm, L.x, y0 - 0.18, L.z, 20);
        U.cyl(0.04, 0.06, M.gold, 'irfilter', gm, L.x, y0 - 0.36, L.z, 12);
        const lp = U.box(0.13, 0.22, 0.13, M.alu, 'lpf', gm, L.x, y0 - 0.52, L.z);
        U.cyl(0.035, 0.06, M.gold, 'lpf', gm, L.x, y0 - 0.66, L.z, 12);
        if (L.idx === 4) { U.label('irfilter', ir); U.label('lpf', lp); }
        L.bottom = U.anchor(gm, L.x, y0 - 0.69, L.z);
        if (L.idx === 0) driveAnchors.push(topAnchor, ...bh.slice(0, 6), L.bottom);
      } else {
        L.topAnchor = topAnchor;
        L.bh = bh;
      }
    });

    /* ---------- HEMT amplifiers at 4 K ---------- */
    outputs.forEach((p, k) => {
      const g = G[2];
      const h = U.box(0.34, 0.2, 0.3, M.gold, 'hemt', g, p.x, bot(2) - 0.22, p.z);
      U.box(0.36, 0.03, 0.32, M.goldDark, 'hemt', g, p.x, bot(2) - 0.11, p.z);
      for (let q = 0; q < 3; q++) U.cyl(0.012, 0.12, M.steel, 'hemt', g, p.x + 0.19, bot(2) - 0.2 - q * 0.04, p.z - 0.08 + q * 0.08, 6).rotation.z = Math.PI / 2;
      U.tube([new T.Vector3(p.x + 0.25, bot(2) - 0.2, p.z), new T.Vector3(p.x + 0.4, bot(2) - 0.05, p.z + 0.2), new T.Vector3(DC.x, bot(2) - 0.02, DC.z)], 0.012, M.copperMatte, 'dcloom', g);
      if (k === 0) { U.label('hemt', h); outputs[k].hemt = U.anchor(g, p.x, bot(2) - 0.22, p.z); }
    });

    /* ---------- readout towers under the mixing chamber plate ---------- */
    const towers = outputs.map((p, k) => {
      const g = G[5];
      const b = bot(5);
      const parts = [
        { id: 'isolator', y: -0.38, w: 0.22, h: 0.26, d: 0.18, mat: M.ferrite },
        { id: 'twpa', y: -0.8, w: 0.28, h: 0.34, d: 0.2, mat: M.gold },
        { id: 'dircoupler', y: -1.12, w: 0.1, h: 0.16, d: 0.1, mat: M.alu },
        { id: 'isolator', y: -1.4, w: 0.22, h: 0.26, d: 0.18, mat: M.ferrite },
        { id: 'isolator', y: -1.7, w: 0.22, h: 0.26, d: 0.18, mat: M.ferrite },
      ];
      // mounting bracket
      U.box(0.04, 1.75, 0.3, M.copper, 'isolator', g, p.x + 0.2, b - 0.9, p.z);
      let prevY = b;
      const meshes = {};
      parts.forEach((q) => {
        const m = U.box(q.w, q.h, q.d, q.mat, q.id, g, p.x, b + q.y, p.z);
        meshes[q.id + q.y] = m;
        if (q.id === 'isolator') {
          U.cyl(0.03, 0.08, M.gold, 'isolator', g, p.x - q.w / 2 - 0.04, b + q.y, p.z, 10).rotation.z = Math.PI / 2;
          U.box(q.w + 0.01, 0.03, q.d + 0.01, M.alu, 'isolator', g, p.x, b + q.y + q.h / 2 - 0.02, p.z);
        }
        if (q.id === 'twpa') U.box(q.w * 0.7, 0.01, q.d + 0.012, M.goldDark, 'twpa', g, p.x, b + q.y, p.z);
        const segTop = prevY, segBot = b + q.y + q.h / 2;
        if (segTop - segBot > 0.01) {
          const c = U.cyl(0.022, segTop - segBot, M.nbti, 'coaxsc', g, p.x, (segTop + segBot) / 2, p.z, 8);
          c.userData.tempK = 0.01;
        }
        prevY = b + q.y - q.h / 2;
      });
      if (k === 0) {
        U.label('twpa', meshes['twpa-0.8']);
        U.label('isolator', meshes['isolator-1.4']);
        U.label('dircoupler', meshes['dircoupler-1.12']);
      }
      return {
        bottom: U.anchor(g, p.x, prevY, p.z),
        top: U.anchor(g, p.x, b, p.z),
        coupler: U.anchor(g, p.x - 0.05, b - 1.12, p.z),
      };
    });

    /* ---------- flex cables and DC loom ---------- */
    for (let i = 0; i < N - 1; i++) {
      const a = U.anchor(G[i], FLEX.x, bot(i), FLEX.z);
      const b = U.anchor(G[i + 1], FLEX.x, top(i + 1) + 0.08, FLEX.z);
      U.span('ribbon', a, b, { w: 0.6, d: 0.03, mat: M.goldDark, part: 'flex', tempK: Math.sqrt(S[i].K * S[i + 1].K) });
      U.box(0.72, 0.1, 0.16, M.alu, 'flex', G[i + 1], FLEX.x, top(i + 1) + 0.05, FLEX.z); // clamp
      if (i === 1) U.label('flex', a);
      for (let w = 0; w < 3; w++) {
        const da = U.anchor(G[i], DC.x + (w - 1) * 0.035, bot(i), DC.z + (w % 2) * 0.03);
        const db = U.anchor(G[i + 1], DC.x + (w - 1) * 0.035, top(i + 1) + 0.04, DC.z + (w % 2) * 0.03);
        U.span('rod', da, db, { r: 0.012, mat: w === 1 ? M.copperMatte : M.nbti, part: 'dcloom', tempK: Math.sqrt(S[i].K * S[i + 1].K), seg: 6 });
        if (i === 1 && w === 1) U.label('dcloom', da);
      }
      U.cyl(0.07, 0.07, M.black, 'dcloom', G[i + 1], DC.x, top(i + 1) + 0.035, DC.z, 16);
    }
    U.cyl(0.1, 0.25, M.steelDark, 'dcloom', G[0], DC.x, top(0) + 0.125, DC.z, 16);
    U.cyl(0.13, 0.06, M.black, 'dcloom', G[0], DC.x, top(0) + 0.28, DC.z, 16);
    U.box(0.72, 0.18, 0.2, M.steelDark, 'flex', G[0], FLEX.x, top(0) + 0.09, FLEX.z);

    /* ---------- sample stage ---------- */
    const sample = new T.Group();
    sample.position.set(0, bot(5), 0);
    G[5].add(sample);
    U.explode(sample, 0, -2.2, 0);
    const cf = U.cyl(0.1, 2.28, M.copper, 'coldfinger', sample, 0, -1.14, 0, 20);
    U.cyl(0.2, 0.05, M.copper, 'coldfinger', sample, 0, -0.03, 0, 24);
    U.label('coldfinger', U.anchor(sample, 0, -0.6, 0));
    const pkg = new T.Group();
    pkg.position.set(0, -2.45, 0);
    sample.add(pkg);
    U.box(0.74, 0.2, 0.74, M.copper, 'package', pkg, 0, -0.1, 0);
    U.box(0.74, 0.16, 0.74, M.gold, 'package', pkg, 0, 0.08, 0);
    const pkgPorts = [];
    const nPorts = inputs.length + outputs.length;
    for (let k = 0; k < nPorts; k++) {
      const a = (k / nPorts) * Math.PI * 2 + 0.2;
      const x = Math.cos(a) * 0.27, z = Math.sin(a) * 0.27;
      U.cyl(0.033, 0.09, M.gold, 'package', pkg, x, 0.2, z, 10);
      pkgPorts.push({ a: U.anchor(pkg, x, 0.24, z), ang: a });
    }
    U.label('package', U.anchor(pkg, 0.37, 0, 0.37));
    // shields around the package
    const scMat = QC.M.shield(0xe4e7ea, 0.4);
    const sc = new T.Group();
    sc.position.set(0, -0.92, 0);
    sample.add(sc);
    U.mesh(U.canGeometry(0.6, 2.0, 0.08), scMat, 'scshield', sc);
    U.mesh(new T.CylinderGeometry(0.64, 0.64, 0.05, 48), M.alu, 'scshield', sc).position.y = -0.02;
    U.explode(sc, 1.8, -0.2, 1.1);
    U.label('scshield', U.anchor(sc, 0.6, -1.2, 0));
    const mgMat = QC.M.shield(0x9aa0a7, 0.42);
    const mg = new T.Group();
    mg.position.set(0, -0.72, 0);
    sample.add(mg);
    U.mesh(U.canGeometry(0.76, 2.35, 0.1), mgMat, 'magshield', mg);
    U.mesh(new T.CylinderGeometry(0.8, 0.8, 0.05, 48), M.steelDark, 'magshield', mg).position.y = -0.02;
    U.explode(mg, -2.0, -0.4, 1.1);
    U.label('magshield', U.anchor(mg, -0.76, -1.5, 0));

    // cables from filter banks and readout towers into the package
    const ordered = inputs.map((p) => p).concat(outputs.map((p) => p));
    ordered.forEach((p, k) => {
      // pick the package port whose angle is closest to the line's angle
      const ang = Math.atan2(p.z, p.x);
      let best = 0, bd = 9;
      pkgPorts.forEach((pp, idx) => {
        if (pp.used) return;
        let d = Math.abs(Math.atan2(Math.sin(pp.ang - ang), Math.cos(pp.ang - ang)));
        if (d < bd) { bd = d; best = idx; }
      });
      pkgPorts[best].used = true;
      const start = k < inputs.length ? inputs[k].bottom : towers[k - inputs.length].bottom;
      const isOut = k >= inputs.length;
      U.span('curve', start, pkgPorts[best].a, { r: 0.022, mat: isOut ? M.nbti : M.steel, part: isOut ? 'coaxsc' : 'coax', tempK: 0.01, k: 0.45 });
      if (k === 0) driveAnchors.push(pkgPorts[best].a);
      if (k === inputs.length) outputs[0].pkg = pkgPorts[best].a;
    });
    // TWPA pump line into the directional coupler
    const pumpLine = inputs.find((p) => p.kind === 'pump');
    U.span('curve', pumpLine.bottom, towers[0].coupler, { r: 0.018, mat: M.steel, part: 'coax', tempK: 0.01, db: new T.Vector3(-1, 0, 0), k: 0.5 });

    /* ---------- radiation shields and vacuum can ---------- */
    const shieldSpec = [
      { id: 'ovc', stage: 0, r: 3.18, bottom: -3.55, color: 0xdfe3e7, op: 0.17, K: 300 },
      { id: 'shield50', stage: 1, r: 2.92, bottom: -3.2, color: 0xd2d7dc, op: 0.14, K: 50 },
      { id: 'shield4', stage: 2, r: 2.65, bottom: -2.95, color: 0xe7a883, op: 0.13, K: 4 },
      { id: 'shieldstill', stage: 3, r: 2.38, bottom: -2.7, color: 0xf0c872, op: 0.13, K: 0.8 },
    ];
    v.shields = [];
    shieldSpec.forEach((sp, n) => {
      const s = S[sp.stage];
      const yTop = s.y - s.t / 2;
      const g = new T.Group();
      g.position.set(0, yTop, 0);
      g.userData.tempK = sp.K;
      root.add(g);
      const mat = QC.M.shield(sp.color, sp.op);
      const can = U.mesh(U.canGeometry(sp.r, yTop - sp.bottom, 0.35), mat, sp.id, g);
      can.userData.shield = true;
      const rimMat = QC.M.shield(sp.color, Math.min(1, sp.op * 4));
      const rim = U.mesh(new T.CylinderGeometry(sp.r + 0.08, sp.r + 0.08, 0.1, 64, 1, true), rimMat, sp.id, g);
      rim.position.y = -0.06;
      rim.userData.shield = true;
      U.fade(mat, 1);
      U.fade(rimMat, 1);
      U.explode(g, 0, -(9 + n * 1.2), 0);
      U.label(sp.id, U.anchor(g, -sp.r * 0.7, -(yTop - sp.bottom) * 0.55, sp.r * 0.7));
      v.shields.push(g);
    });

    /* ---------- signal paths for the animation ---------- */
    v.paths.drive = driveAnchors;
    // the readout path should climb, so order bulkheads upward
    v.paths.readout = [outputs[0].pkg, towers[0].bottom, towers[0].top, outputs[0].bh[4], outputs[0].bh[3], outputs[0].hemt, outputs[0].bh[1], outputs[0].bh[0], outputs[0].topAnchor];

    v.stageGroups = G;
    v.stages = S;
    return v;
  };
})();
