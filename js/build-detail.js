/* Detailed views: sample package, chip, Josephson junction close-up. */
(function () {
  const QC = (window.QC = window.QC || {});
  const T = THREE;

  /* ================= Sample package ================= */
  QC.buildPackage = function () {
    const U = QC.U, M = QC.M;
    const v = U.view('package');
    const root = v.root;

    // base
    const base = new T.Group();
    root.add(base);
    U.box(8, 1.0, 8, M.copper, 'pkgbase', base, 0, -0.5, 0);
    U.box(1.2, 0.5, 8, M.copper, 'pkgbase', base, -4.6, -0.75, 0);
    U.box(1.2, 0.5, 8, M.copper, 'pkgbase', base, 4.6, -0.75, 0);
    [-3, 3].forEach((z) => [-4.6, 4.6].forEach((x) => U.cyl(0.22, 0.52, M.steelDark, 'pkgbase', base, x, -0.49, z, 16)));
    U.box(2.6, 0.06, 2.6, M.copperMatte, 'pkgbase', base, 0, 0.03, 0); // chip pedestal
    U.label('pkgbase', U.anchor(base, -4.2, -0.5, 3.6));

    // board layer: PCB + chip + wirebonds + connectors
    const board = new T.Group();
    root.add(board);
    U.explode(board, 0, 1.5, 0);
    const sh = new T.Shape();
    sh.moveTo(-3.6, -3.6); sh.lineTo(3.6, -3.6); sh.lineTo(3.6, 3.6); sh.lineTo(-3.6, 3.6); sh.closePath();
    const hole = new T.Path();
    hole.moveTo(-1.45, -1.45); hole.lineTo(-1.45, 1.45); hole.lineTo(1.45, 1.45); hole.lineTo(1.45, -1.45); hole.closePath();
    sh.holes.push(hole);
    const pg = new T.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: false });
    pg.rotateX(-Math.PI / 2);
    U.mesh(pg, M.pcb, 'pcb', board);
    U.label('pcb', U.anchor(board, 2.6, 0.16, 2.9));

    // chip with printed layout on top
    const chipTex = QC.chipTexture();
    const chipTop = new T.MeshStandardMaterial({ map: chipTex, metalness: 0.5, roughness: 0.3 });
    const chipMats = [M.silicon, M.silicon, chipTop, M.silicon, M.silicon, M.silicon];
    const chip = U.mesh(new T.BoxGeometry(2.5, 0.12, 2.5), chipMats, 'pkgchip', board);
    chip.position.set(0, 0.1, 0);
    U.label('pkgchip', chip);

    // traces, vias and connectors: 3 per side
    const conn = [];
    const sides = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const viaGeo = new T.CylinderGeometry(0.035, 0.035, 0.02, 8);
    const viaList = [];
    function seg(p1, p2, w, mat, part, parent, y) {
      const dx = p2.x - p1.x, dz = p2.z - p1.z;
      const L = Math.hypot(dx, dz);
      const m = U.box(L, 0.012, w, mat, part, parent, (p1.x + p2.x) / 2, y, (p1.z + p2.z) / 2);
      m.rotation.y = -Math.atan2(dz, dx);
      return m;
    }
    sides.forEach((ang) => {
      const c = Math.cos(ang), s = Math.sin(ang);
      const rot = (a, b) => ({ x: a * c - b * s, z: a * s + b * c });
      [-2.2, 0, 2.2].forEach((u, k) => {
        const pc = rot(3.05, u);
        const pe = rot(1.55, u * 0.32);
        const pm = rot(2.2, u * 0.75);
        seg(pc, pm, 0.12, M.pcbTrace, 'pcb', board, 0.166);
        seg(pm, pe, 0.12, M.pcbTrace, 'pcb', board, 0.166);
        // vias either side of the trace
        for (let t = 0.1; t < 1; t += 0.14) {
          [-1, 1].forEach((sd) => {
            const a = 1.55 + (3.05 - 1.55) * t;
            const b = u * (0.32 + 0.68 * t) + sd * 0.22;
            viaList.push(rot(a, b));
          });
        }
        // connector
        const cg = new T.Group();
        cg.position.set(pc.x, 0.16, pc.z);
        board.add(cg);
        U.box(0.6, 0.12, 0.6, M.gold, 'smp', cg, 0, 0.06, 0);
        U.cyl(0.2, 0.42, M.gold, 'smp', cg, 0, 0.33, 0, 20);
        U.cyl(0.08, 0.1, M.paint, 'smp', cg, 0, 0.55, 0, 12);
        conn.push(cg);
        // short coax leaving the package
        U.tube([
          new T.Vector3(pc.x, 0.75, pc.z),
          new T.Vector3(pc.x, 1.6, pc.z),
          new T.Vector3(pc.x * 1.15, 2.4, pc.z * 1.15),
        ], 0.09, M.steel, 'smp', board);
      });
    });
    U.label('smp', conn[1]);
    const vias = new T.InstancedMesh(viaGeo, M.pcbTrace, viaList.length);
    const m4 = new T.Matrix4();
    viaList.forEach((p, i) => { m4.makeTranslation(p.x, 0.17, p.z); vias.setMatrixAt(i, m4); });
    vias.userData.part = 'pcb';
    board.add(vias);

    // wirebonds (instanced arcs)
    const bondCurve = new T.CatmullRomCurve3([
      new T.Vector3(0, 0, 0), new T.Vector3(0.07, 0.2, 0), new T.Vector3(0.25, 0.24, 0), new T.Vector3(0.45, 0.0, 0),
    ]);
    const bondGeo = new T.TubeGeometry(bondCurve, 16, 0.012, 5, false);
    const bonds = [];
    sides.forEach((ang) => {
      const sig = [-0.7, 0, 0.7];
      for (let u = -1.1; u <= 1.101; u += 0.075) {
        const nearSig = sig.some((sv) => Math.abs(u - sv) < 0.12);
        if (nearSig) continue;
        bonds.push({ ang, u });
      }
      sig.forEach((sv) => [-0.04, 0, 0.04].forEach((d) => bonds.push({ ang, u: sv + d })));
    });
    const bm = new T.InstancedMesh(bondGeo, M.silver, bonds.length);
    const q = new T.Quaternion(), pos = new T.Vector3(), scl = new T.Vector3(1, 1, 1), axis = new T.Vector3(0, 1, 0);
    bonds.forEach((b, i) => {
      const c = Math.cos(b.ang), s = Math.sin(b.ang);
      pos.set(1.12 * c - b.u * s, 0.16, 1.12 * s + b.u * c);
      q.setFromAxisAngle(axis, -b.ang);
      m4.compose(pos, q, scl);
      bm.setMatrixAt(i, m4);
    });
    bm.userData.part = 'wirebonds';
    board.add(bm);
    U.label('wirebonds', U.anchor(board, 1.35, 0.3, -1.35));

    // absorber layer (sits inside the lid cavity)
    const abs = new T.Group();
    root.add(abs);
    U.explode(abs, 0, 3.1, 0);
    U.box(3.0, 0.08, 3.0, M.eccosorb, 'absorber', abs, 0, 1.05, 0);
    U.label('absorber', U.anchor(abs, 1.5, 1.05, 1.5));

    // lid
    const lid = new T.Group();
    root.add(lid);
    U.explode(lid, 0, 4.4, 0);
    const lsh = new T.Shape();
    lsh.moveTo(-2.7, -2.7); lsh.lineTo(2.7, -2.7); lsh.lineTo(2.7, 2.7); lsh.lineTo(-2.7, 2.7); lsh.closePath();
    const lh = new T.Path();
    lh.moveTo(-1.6, -1.6); lh.lineTo(-1.6, 1.6); lh.lineTo(1.6, 1.6); lh.lineTo(1.6, -1.6); lh.closePath();
    lsh.holes.push(lh);
    const lg = new T.ExtrudeGeometry(lsh, { depth: 0.95, bevelEnabled: false });
    lg.rotateX(-Math.PI / 2);
    lg.translate(0, 0.16, 0);
    U.mesh(lg, M.gold, 'pkglid', lid);
    U.box(5.4, 0.3, 5.4, M.gold, 'pkglid', lid, 0, 1.26, 0);
    [[-2.3, -2.3], [2.3, -2.3], [2.3, 2.3], [-2.3, 2.3]].forEach(([x, z]) => {
      U.cyl(0.16, 0.12, M.steelDark, 'pkglid', lid, x, 1.47, z, 6);
      U.cyl(0.07, 1.4, M.steel, 'pkglid', lid, x, 0.7, z, 10);
    });
    U.label('pkglid', U.anchor(lid, 2.7, 0.9, 2.7));

    // bias coil
    const coilG = new T.Group();
    root.add(coilG);
    U.explode(coilG, 0, 6.0, 0);
    U.cyl(0.95, 0.5, M.alu, 'coil', coilG, 0, 1.66, 0, 32);
    U.cyl(1.2, 0.05, M.alu, 'coil', coilG, 0, 1.43, 0, 32);
    U.cyl(1.2, 0.05, M.alu, 'coil', coilG, 0, 1.89, 0, 32);
    const coil = U.mesh(U.helixGeometry(1.0, 14, 0.028, 6), M.copper, 'coil', coilG);
    coil.position.y = 1.66;
    coil.scale.set(1, 0.42, 1);
    U.tube([new T.Vector3(1.0, 1.7, 0), new T.Vector3(1.8, 1.9, 0.3), new T.Vector3(2.6, 2.4, 0.6)], 0.02, M.copper, 'coil', coilG);
    U.label('coil', U.anchor(coilG, 1.2, 1.66, 0));

    return v;
  };

  /* ================= Chip ================= */
  QC.buildChip = function () {
    const U = QC.U, M = QC.M;
    const v = U.view('chip');
    const root = v.root;
    const W = 12, D = 10;
    const Y_GROUND = 0.03, Y_GAP = 0.034, Y_MET = 0.038;

    const sub = new T.Group();
    root.add(sub);
    U.box(W, 0.5, D, M.silicon, 'substrate', sub, 0, -0.25, 0);
    U.label('substrate', U.anchor(sub, W / 2, -0.25, D / 2));

    const circ = new T.Group();
    root.add(circ);
    U.explode(circ, 0, 0.9, 0);
    U.box(W - 0.1, 0.03, D - 0.1, M.film, 'groundplane', circ, 0, 0.015, 0);
    U.label('groundplane', U.anchor(circ, -W / 2 + 0.4, Y_GROUND, D / 2 - 0.4));

    const paths = []; // for keeping bumps and bridges clear
    function rect(x0, z0, x1, z1, y, h, mat, part) {
      const m = U.box(Math.abs(x1 - x0), h, Math.abs(z1 - z0), mat, part, circ, (x0 + x1) / 2, y, (z0 + z1) / 2);
      return m;
    }
    /* Coplanar waveguide along a Manhattan polyline. */
    function cpw(pts, w, g, part, opts) {
      const o = opts || {};
      paths.push({ pts, w: w + 2 * g, part, bridges: o.bridges });
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        const horiz = Math.abs(z1 - z0) < 1e-6;
        const eg = w / 2 + g, em = w / 2;
        const startCap = i === 0 ? (o.openStart ? g : 0) : eg;
        const endCap = i === pts.length - 2 ? (o.openEnd ? g : 0) : eg;
        const startM = i === 0 ? 0 : em, endM = i === pts.length - 2 ? 0 : em;
        if (horiz) {
          const dir = Math.sign(x1 - x0);
          rect(x0 - dir * startCap, z0 - eg, x1 + dir * endCap, z0 + eg, Y_GAP, 0.004, M.siliconGap, part);
          rect(x0 - dir * startM, z0 - em, x1 + dir * endM, z0 + em, Y_MET, 0.006, M.filmBright, part);
        } else {
          const dir = Math.sign(z1 - z0);
          rect(x0 - eg, z0 - dir * startCap, x0 + eg, z1 + dir * endCap, Y_GAP, 0.004, M.siliconGap, part);
          rect(x0 - em, z0 - dir * startM, x0 + em, z1 + dir * endM, Y_MET, 0.006, M.filmBright, part);
        }
      }
    }

    const QX = [-4, -2, 0, 2, 4];
    const ARM = 0.62, AW = 0.22, AG = 0.08;

    // Xmon qubits
    QX.forEach((x, i) => {
      rect(x - ARM - AG, -AW / 2 - AG, x + ARM + AG, AW / 2 + AG, Y_GAP, 0.004, M.siliconGap, 'xmon');
      rect(x - AW / 2 - AG, -ARM - AG, x + AW / 2 + AG, ARM + AG, Y_GAP, 0.004, M.siliconGap, 'xmon');
      rect(x - ARM, -AW / 2, x + ARM, AW / 2, Y_MET, 0.006, M.filmBright, 'xmon');
      const vert = rect(x - AW / 2, -ARM, x + AW / 2, ARM, Y_MET, 0.006, M.filmBright, 'xmon');
      if (i === 1) U.label('xmon', vert);
      // SQUID at the bottom arm
      rect(x - 0.12, ARM + AG, x + 0.12, ARM + AG + 0.2, Y_GAP, 0.004, M.siliconGap, 'squid');
      const sq = [
        [x - 0.07, ARM - 0.02, x - 0.05, ARM + AG + 0.2],
        [x + 0.05, ARM - 0.02, x + 0.07, ARM + AG + 0.2],
      ];
      sq.forEach((r) => rect(r[0], r[1], r[2], r[3], Y_MET, 0.006, M.alFilm, 'squid'));
      rect(x - 0.07, ARM + AG + 0.08, x - 0.05, ARM + AG + 0.11, Y_MET + 0.004, 0.006, M.oxide, 'squid');
      rect(x + 0.05, ARM + AG + 0.08, x + 0.07, ARM + AG + 0.11, Y_MET + 0.004, 0.006, M.oxide, 'squid');
      if (i === 2) U.label('squid', U.anchor(circ, x, Y_MET, ARM + AG + 0.1));
    });

    // tunable couplers between neighbours
    [-3, -1, 1, 3].forEach((c, i) => {
      cpw([[c - 0.3, 0], [c + 0.3, 0]], 0.1, 0.05, 'coupler', { openStart: true, openEnd: true });
      cpw([[c, 0.05], [c, 0.62]], 0.06, 0.04, 'coupler');
      rect(c - 0.09, 0.6, c + 0.09, 0.82, Y_GAP, 0.004, M.siliconGap, 'coupler');
      rect(c - 0.06, 0.6, c - 0.045, 0.82, Y_MET, 0.006, M.alFilm, 'coupler');
      rect(c + 0.045, 0.6, c + 0.06, 0.82, Y_MET, 0.006, M.alFilm, 'coupler');
      if (i === 1) U.label('coupler', U.anchor(circ, c, Y_MET, 0));
    });

    // readout resonators (meanders up to the Purcell filter)
    QX.forEach((x, i) => {
      const pts = [[x, -ARM - AG - 0.1], [x, -1.0]];
      let z = -1.0;
      let side = -1;
      pts.push([x - 0.36, -1.0]);
      for (let k = 0; k < 8; k++) {
        z -= 0.22;
        pts.push([x + side * 0.36, z]);
        side = -side;
        pts.push([x + side * 0.36, z]);
      }
      pts.push([x, z]);
      pts.push([x, -3.05]);
      // clean duplicate corners: build pairs of Manhattan moves
      const man = [pts[0]];
      for (let k = 1; k < pts.length; k++) {
        const [px, pz] = man[man.length - 1];
        const [nx, nz] = pts[k];
        if (px !== nx && pz !== nz) man.push([px, nz]);
        man.push([nx, nz]);
      }
      cpw(man, 0.05, 0.03, 'resonator', { openStart: true, openEnd: true });
      if (i === 3) U.label('resonator', U.anchor(circ, x + 0.36, Y_MET, -2.0));
    });

    // Purcell filter and feedline
    cpw([[-4.8, -3.28], [4.8, -3.28]], 0.08, 0.05, 'purcell', { openStart: true, openEnd: true, bridges: true });
    cpw([[-4.8, -3.36], [-4.8, -3.85]], 0.05, 0.03, 'purcell', { openEnd: true });
    cpw([[4.8, -3.36], [4.8, -3.85]], 0.05, 0.03, 'purcell', { openEnd: true });
    U.label('purcell', U.anchor(circ, -1, Y_MET, -3.28));
    cpw([[-5.35, -4.1], [5.35, -4.1]], 0.12, 0.07, 'feedline', { bridges: true });
    U.label('feedline', U.anchor(circ, 1, Y_MET, -4.1));

    // bond pads
    function pad(x, z, horizontal) {
      const pw = 0.46;
      rect(x - pw / 2 - 0.1, z - pw / 2 - 0.1, x + pw / 2 + 0.1, z + pw / 2 + 0.1, Y_GAP, 0.004, M.siliconGap, 'bondpad');
      return rect(x - pw / 2, z - pw / 2, x + pw / 2, z + pw / 2, Y_MET, 0.006, M.filmBright, 'bondpad');
    }
    pad(-5.55, -4.1); pad(5.55, -4.1);

    // control lines from the bottom edge
    const targets = [];
    QX.forEach((x) => {
      targets.push({ x: x - 0.42, z: 0.5, part: 'xyline', kind: 'xy' });
      targets.push({ x: x + 0.2, z: 0.98, part: 'zline', kind: 'z' });
    });
    [-3, -1, 1, 3].forEach((c) => targets.push({ x: c + 0.18, z: 0.98, part: 'zline', kind: 'cz' }));
    targets.sort((a, b) => a.x - b.x);
    const nP = targets.length;
    const padX = targets.map((_, i) => -5.2 + (10.4 * i) / (nP - 1));
    const right = [], left = [];
    targets.forEach((t, i) => { t.px = padX[i]; (t.x > t.px ? right : left).push(t); });
    right.sort((a, b) => a.px - b.px).forEach((t, r) => { t.zt = 1.55 + r * 0.22; });
    left.sort((a, b) => a.px - b.px).forEach((t, r) => { t.zt = 1.55 + (left.length - 1 - r) * 0.22; });
    let xyLabel = false, zLabel = false, padLabel = false;
    targets.forEach((t) => {
      const zp = 4.5;
      const p = pad(t.px, zp);
      if (!padLabel && t.px > 3) { U.label('bondpad', p); padLabel = true; }
      const pts = [[t.px, zp - 0.23], [t.px, t.zt], [t.x, t.zt], [t.x, t.z]];
      if (t.kind !== 'xy') pts.push([t.x - 0.12, t.z]);
      const clean = pts.filter((pp, k) => k === 0 || pp[0] !== pts[k - 1][0] || pp[1] !== pts[k - 1][1]);
      cpw(clean, 0.07, 0.045, t.part, { openEnd: t.kind === 'xy', bridges: true });
      if (t.kind === 'xy' && !xyLabel && t.x > -1) { U.label('xyline', U.anchor(circ, t.x, Y_MET, t.z + 0.3)); xyLabel = true; }
      if (t.kind === 'z' && !zLabel && t.x > 1) { U.label('zline', U.anchor(circ, t.x, Y_MET, t.z + 0.3)); zLabel = true; }
    });

    // airbridges across lines
    const bridges = new T.Group();
    root.add(bridges);
    U.explode(bridges, 0, 1.7, 0);
    const bridgeList = [];
    paths.forEach((p) => {
      if (!p.bridges) return;
      for (let i = 0; i < p.pts.length - 1; i++) {
        const [x0, z0] = p.pts[i], [x1, z1] = p.pts[i + 1];
        const L = Math.hypot(x1 - x0, z1 - z0);
        const n = Math.floor(L / 0.75);
        for (let k = 1; k <= n; k++) {
          const t = k / (n + 1);
          bridgeList.push({ x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, horiz: Math.abs(z1 - z0) < 1e-6, span: p.w / 2 + 0.05 });
        }
      }
    });
    const archCurve = new T.CatmullRomCurve3([
      new T.Vector3(-1, 0, 0), new T.Vector3(-0.85, 0.6, 0), new T.Vector3(0, 0.8, 0), new T.Vector3(0.85, 0.6, 0), new T.Vector3(1, 0, 0),
    ]);
    const archGeo = new T.TubeGeometry(archCurve, 12, 0.08, 4, false);
    archGeo.scale(1, 0.12, 0.35);
    const arches = new T.InstancedMesh(archGeo, M.alFilm, bridgeList.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), pos = new T.Vector3(), scl = new T.Vector3(), yAxis = new T.Vector3(0, 1, 0);
    bridgeList.forEach((b, i) => {
      pos.set(b.x, Y_MET, b.z);
      q.setFromAxisAngle(yAxis, b.horiz ? Math.PI / 2 : 0);
      scl.set(b.span, 1, 1);
      m4.compose(pos, q, scl);
      arches.setMatrixAt(i, m4);
    });
    arches.userData.part = 'airbridge';
    bridges.add(arches);
    if (bridgeList.length) {
      const b = bridgeList[Math.floor(bridgeList.length * 0.1)];
      U.label('airbridge', U.anchor(bridges, b.x, Y_MET + 0.1, b.z));
    }

    // flip-chip stack: indium bumps + wiring chip with TSVs
    function clear(x, z) {
      if (Math.abs(z) < 1.2 && x > -4.9 && x < 4.9) return false;
      for (const p of paths) {
        for (let i = 0; i < p.pts.length - 1; i++) {
          const [x0, z0] = p.pts[i], [x1, z1] = p.pts[i + 1];
          const dx = x1 - x0, dz = z1 - z0;
          const l2 = dx * dx + dz * dz || 1;
          let t = ((x - x0) * dx + (z - z0) * dz) / l2;
          t = Math.max(0, Math.min(1, t));
          const d = Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t));
          if (d < p.w / 2 + 0.16) return false;
        }
      }
      return true;
    }
    const bumpPos = [];
    for (let x = -5.6; x <= 5.61; x += 0.4) {
      for (let z = -4.6; z <= 4.61; z += 0.4) {
        if (clear(x, z)) bumpPos.push([x, z]);
      }
    }
    const bumpsG = new T.Group();
    root.add(bumpsG);
    U.explode(bumpsG, 0, 2.5, 0);
    const bumpGeo = new T.CylinderGeometry(0.07, 0.08, 0.7, 10);
    const bumps = new T.InstancedMesh(bumpGeo, M.indium, bumpPos.length);
    bumpPos.forEach(([x, z], i) => { m4.makeTranslation(x, 0.4, z); bumps.setMatrixAt(i, m4); });
    bumps.userData.part = 'bumps';
    bumpsG.add(bumps);
    U.label('bumps', U.anchor(bumpsG, bumpPos[0][0], 0.4, bumpPos[0][1]));

    const carrierG = new T.Group();
    root.add(carrierG);
    U.explode(carrierG, 0, 4.2, 0);
    const car = U.box(W, 0.4, D, M.glassChip, 'carrier', carrierG, 0, 0.95, 0);
    car.userData.shield = true;
    U.box(W - 0.1, 0.02, D - 0.1, QC.M.shield(0xcfd6de, 0.35), 'carrier', carrierG, 0, 0.74, 0).userData.shield = true;
    U.label('carrier', U.anchor(carrierG, -W / 2, 1.0, -D / 2 + 0.5));
    const tsvPos = [];
    for (let x = -5.5; x <= 5.51; x += 1.0) for (let z = -4.5; z <= 4.51; z += 1.0) if (clear(x, z)) tsvPos.push([x, z]);
    const tsvGeo = new T.CylinderGeometry(0.09, 0.09, 0.42, 12);
    const tsvs = new T.InstancedMesh(tsvGeo, M.gold, tsvPos.length);
    tsvPos.forEach(([x, z], i) => { m4.makeTranslation(x, 0.95, z); tsvs.setMatrixAt(i, m4); });
    tsvs.userData.part = 'tsv';
    carrierG.add(tsvs);
    U.label('tsv', U.anchor(carrierG, tsvPos[tsvPos.length - 1][0], 1.16, tsvPos[tsvPos.length - 1][1]));

    return v;
  };

  /* ================= Josephson junction close-up ================= */
  QC.buildQubit = function () {
    const U = QC.U, M = QC.M;
    const v = U.view('qubit');
    const root = v.root;

    const base = new T.Group();
    root.add(base);
    U.box(10, 0.6, 7, M.silicon, 'qsub', base, 0, -0.3, 0);
    U.label('qsub', U.anchor(base, -5, -0.3, 3.5));
    // island (left) and ground (right)
    U.box(3.6, 0.12, 2.6, M.film, 'qpad', base, -3.2, 0.06, 0);
    U.box(3.6, 0.12, 7, M.film, 'qpad', base, 3.2, 0.06, 0);
    U.label('qpad', U.anchor(base, -3.8, 0.12, 1.3));
    U.label('qpad', U.anchor(base, 4.2, 0.12, -3.2), 'Ground plane');
    // flux line end cut into the ground plane
    U.box(0.5, 0.125, 3.2, M.siliconGap, 'qflux', base, 2.05, 0.064, 1.9);
    U.box(0.22, 0.13, 3.0, M.filmBright, 'qflux', base, 2.05, 0.066, 2.0);
    U.box(0.6, 0.125, 0.18, M.siliconGap, 'qflux', base, 2.05, 0.064, 0.3);
    U.label('qflux', U.anchor(base, 2.05, 0.13, 2.4));

    // bottom electrodes
    const bottom = new T.Group();
    root.add(bottom);
    U.explode(bottom, 0, 0.9, 0);
    [-0.9, 0.9].forEach((z) => {
      U.box(2.4, 0.06, 0.18, M.alFilm, 'jjbottom', bottom, -0.5, 0.15, z);
    });
    U.box(0.25, 0.06, 2.0, M.alFilm, 'jjbottom', bottom, -1.6, 0.15, 0);
    U.label('jjbottom', U.anchor(bottom, -0.9, 0.18, 0.9));

    // oxide barriers
    const ox = new T.Group();
    root.add(ox);
    U.explode(ox, 0, 1.6, 0);
    [-0.9, 0.9].forEach((z) => U.box(0.3, 0.03, 0.26, M.oxide, 'jjoxide', ox, 0.55, 0.195, z));
    U.label('jjoxide', U.anchor(ox, 0.55, 0.21, 0.9));

    // top electrodes crossing over
    const top = new T.Group();
    root.add(top);
    U.explode(top, 0, 2.3, 0);
    [-1, 1].forEach((s) => {
      const z = 0.9 * s;
      U.box(0.16, 0.06, 0.9, M.alFilm, 'jjtop', top, 0.55, 0.24, z + s * 0.25);
      U.box(1.0, 0.06, 0.18, M.alFilm, 'jjtop', top, 1.0, 0.24, z + s * 0.62);
    });
    U.box(0.25, 0.06, 3.0, M.alFilm, 'jjtop', top, 1.55, 0.24, 0);
    U.label('jjtop', U.anchor(top, 0.55, 0.28, -1.3));

    // SQUID loop and flux arrows
    const loop = new T.Group();
    root.add(loop);
    U.explode(loop, 0, 0.9, 0);
    const lp = new T.Mesh(new T.PlaneGeometry(2.0, 1.55), new T.MeshStandardMaterial({ color: 0x5ab6d8, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false }));
    lp.rotation.x = -Math.PI / 2;
    lp.position.set(-0.45, 0.16, 0);
    lp.userData.part = 'qloop';
    loop.add(lp);
    const arrowMat = new T.MeshStandardMaterial({ color: 0x2a86b0, roughness: 0.4 });
    [[-0.9, -0.35], [0, -0.35], [-0.9, 0.35], [0, 0.35]].forEach(([x, z]) => {
      U.cyl(0.03, 0.8, arrowMat, 'qloop', loop, x, 0.6, z, 8);
      const cone = U.mesh(new T.ConeGeometry(0.09, 0.2, 12), arrowMat, 'qloop', loop);
      cone.position.set(x, 1.08, z);
    });
    U.label('qloop', U.anchor(loop, -0.45, 1.1, 0));

    return v;
  };
})();
