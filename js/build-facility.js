/* Room-temperature equipment around the fridge. */
(function () {
  const QC = (window.QC = window.QC || {});
  const T = THREE;

  function panelTexture(kind) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    if (kind === 'ghs') {
      g.fillStyle = '#e4e9ee'; g.fillRect(0, 0, 512, 256);
      g.strokeStyle = '#34506e'; g.lineWidth = 5;
      g.beginPath();
      g.moveTo(40, 60); g.lineTo(470, 60); g.lineTo(470, 200); g.lineTo(40, 200); g.closePath();
      g.moveTo(150, 60); g.lineTo(150, 200); g.moveTo(300, 60); g.lineTo(300, 200);
      g.stroke();
      const valves = [[40, 130], [150, 110], [150, 160], [300, 90], [300, 170], [470, 130], [220, 60], [380, 200], [100, 200]];
      valves.forEach(([x, y], i) => {
        g.fillStyle = i % 3 === 0 ? '#3fae6a' : '#e4e9ee';
        g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#34506e'; g.lineWidth = 4; g.stroke();
      });
      g.fillStyle = '#34506e';
      g.font = '600 26px "IBM Plex Sans", Arial, sans-serif';
      g.fillText('Mixture circuit', 40, 36);
    } else {
      g.fillStyle = '#56606b'; g.fillRect(0, 0, 512, 256);
      g.fillStyle = '#3d454e';
      for (let i = 0; i < 16; i++) g.fillRect(40 + i * 28, 40, 14, 176);
    }
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    return t;
  }

  QC.buildFacility = function (cry) {
    const U = QC.U, M = QC.M;
    const v = U.view('system');
    const root = v.root;
    const FLOOR = -5.6;

    // floor with subtle grid
    const floor = new T.Mesh(new T.CircleGeometry(40, 64), M.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR;
    root.add(floor);
    const grid = new T.GridHelper(70, 35, 0x9aa6b2, 0xaab5c0);
    grid.position.y = FLOOR + 0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.18;
    root.add(grid);

    /* ---------- frame ---------- */
    const F = 3.75, beam = 0.22, topY = 9.72;
    const legH = topY - FLOOR;
    [[-F, -F], [F, -F], [F, F], [-F, F]].forEach(([x, z]) => {
      U.box(beam, legH, beam, M.alu, 'frame', root, x, FLOOR + legH / 2, z);
      U.box(0.7, 0.05, 0.7, M.rubber, 'frame', root, x, FLOOR + 0.025, z);
    });
    [[0, -F, 2 * F + beam, beam], [0, F, 2 * F + beam, beam]].forEach(([x, z, w, d]) => U.box(w, beam, d, M.alu, 'frame', root, x, topY, z));
    [[-F, 0], [F, 0]].forEach(([x, z]) => U.box(beam, beam, 2 * F, M.alu, 'frame', root, x, topY, z));
    // cross supports under the plate rim
    [[-F, 0, 'x'], [F, 0, 'x'], [0, -F, 'z'], [0, F, 'z']].forEach(([x, z, ax]) => {
      const len = F - 3.0;
      const m = U.box(ax === 'x' ? len : beam, beam, ax === 'x' ? beam : len, M.alu, 'frame', root,
        ax === 'x' ? x - Math.sign(x) * len / 2 : 0, topY, ax === 'z' ? z - Math.sign(z) * len / 2 : 0);
      return m;
    });
    // lower brace ring
    [[0, -F, 2 * F, beam], [0, F, 2 * F, beam]].forEach(([x, z, w, d]) => U.box(w, beam * 0.8, d, M.alu, 'frame', root, x, FLOOR + 1.2, z));
    U.label('frame', U.anchor(root, F, 2, F));

    /* ---------- control rack ---------- */
    const RX = 11, RZ = -1, RW = 2.6, RD = 2.3, RH = 10;
    const rack = new T.Group();
    rack.position.set(RX, FLOOR, RZ);
    root.add(rack);
    // open frame
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => U.box(0.12, RH, 0.12, M.rackPanel, 'rack', rack, sx * RW / 2, RH / 2, sz * RD / 2));
    U.box(RW, 0.14, RD, M.rackPanel, 'rack', rack, 0, RH, 0);
    U.box(RW, 0.14, RD, M.rackPanel, 'rack', rack, 0, 0.07, 0);
    U.box(0.05, RH, RD, M.rackPanel, 'rack', rack, -RW / 2, RH / 2, 0);
    U.box(0.05, RH, RD, M.rackPanel, 'rack', rack, RW / 2, RH / 2, 0);
    U.box(RW, RH, 0.05, M.rackPanel, 'rack', rack, 0, RH / 2, -RD / 2);
    U.label('rack', U.anchor(rack, RW / 2, RH - 0.3, RD / 2));

    const units = [
      { id: 'clock', h: 0.45, screen: true },
      { id: 'awg', h: 1.1, ports: 12 },
      { id: 'awg', h: 1.1, ports: 12 },
      { id: 'lo', h: 0.9, ports: 6, screen: true },
      { id: 'adc', h: 1.1, ports: 8, screen: true },
      { id: 'dcsrc', h: 0.7, knobs: 6 },
      { id: 'rtamp', h: 0.6, ports: 6 },
      { id: 'adc', h: 1.3, pc: true },
    ];
    let y = RH - 0.4;
    const fz = RD / 2 - 0.12;
    units.forEach((u, idx) => {
      y -= u.h + 0.12;
      const cy = y + u.h / 2;
      const body = U.box(RW - 0.2, u.h, RD - 0.3, M.paintDark, u.id, rack, 0, cy, -0.05);
      const face = U.box(RW - 0.14, u.h - 0.04, 0.05, idx % 2 ? M.rackPanel : M.paintDark, u.id, rack, 0, cy, fz);
      if (u.screen) {
        U.box(0.7, u.h * 0.5, 0.02, M.screen, u.id, rack, -0.65, cy + 0.02, fz + 0.035);
      }
      if (u.ports) {
        for (let p = 0; p < u.ports; p++) {
          const px = -0.15 + (p % 6) * 0.2 - (u.screen ? -0.2 : 0.4);
          const py = cy + (u.ports > 6 ? (p < 6 ? 0.18 : -0.18) : 0);
          const c = U.cyl(0.045, 0.1, M.gold, u.id, rack, px, py, fz + 0.06, 10);
          c.rotation.x = Math.PI / 2;
        }
      }
      if (u.knobs) {
        for (let p = 0; p < u.knobs; p++) {
          const c = U.cyl(0.08, 0.08, M.black, u.id, rack, -0.9 + p * 0.3, cy, fz + 0.06, 16);
          c.rotation.x = Math.PI / 2;
        }
      }
      if (u.pc) {
        for (let p = 0; p < 4; p++) U.box(0.4, 0.08, 0.02, M.black, u.id, rack, -0.6 + p * 0.45, cy + 0.2, fz + 0.035);
      }
      U.box(0.05, 0.05, 0.02, idx % 3 === 0 ? M.ledAmber : M.ledGreen, u.id, rack, RW / 2 - 0.25, cy + u.h / 2 - 0.12, fz + 0.035);
      if (!u.pc && [0, 1, 3, 4, 5, 6].includes(idx)) U.label(u.id, U.anchor(rack, -RW / 2, cy, fz));
      body.userData.unit = true;
    });

    // cables from rack to the fridge top
    for (let k = 0; k < 5; k++) {
      U.tube([
        new T.Vector3(RX - 0.6 + k * 0.25, FLOOR + RH + 0.05, RZ + 0.3),
        new T.Vector3(RX - 1.5, FLOOR + RH + 2.2, RZ + 0.3),
        new T.Vector3(6, 13.4, 0.2 + k * 0.1),
        new T.Vector3(-0.8 - k * 0.1, 11.2, 1.25 + k * 0.05),
        new T.Vector3(-1.1 - k * 0.12, 10.55, 1.2 - k * 0.1),
      ], 0.05, M.rubber, 'rtwiring', root, 80);
    }
    U.label('rtwiring', U.anchor(root, 6, 13.4, 0.5));

    /* ---------- gas handling system ---------- */
    const GX = -11, GZ = -0.5;
    const ghs = new T.Group();
    ghs.position.set(GX, FLOOR, GZ);
    root.add(ghs);
    U.box(3.2, 4.6, 2.4, M.paint, 'ghs', ghs, 0, 2.3, 0);
    const pm = new T.MeshPhysicalMaterial({ map: panelTexture('ghs'), roughness: 0.4, clearcoat: 0.4 });
    U.box(2.7, 1.35, 0.03, pm, 'ghs', ghs, 0, 3.4, 1.21);
    U.box(0.6, 0.35, 0.03, M.screen, 'ghs', ghs, 0.95, 2.35, 1.21);
    U.box(3.25, 0.1, 2.45, M.paintDark, 'ghs', ghs, 0, 4.6, 0);
    U.label('ghs', U.anchor(ghs, 1.6, 3.8, 1.2));
    // turbo pump
    const tb = new T.Group();
    tb.position.set(-0.6, 4.65, 0);
    ghs.add(tb);
    U.cyl(0.5, 0.9, M.alu, 'turbo', tb, 0, 0.45, 0, 32);
    for (let k = 0; k < 5; k++) U.cyl(0.56, 0.04, M.steelDark, 'turbo', tb, 0, 0.12 + k * 0.17, 0, 32);
    U.cyl(0.62, 0.08, M.steel, 'turbo', tb, 0, 0.95, 0, 32);
    U.label('turbo', U.anchor(tb, 0.5, 0.6, 0));
    // cold trap
    const ct = U.cyl(0.33, 1.5, M.steel, 'coldtrap', ghs, 1.1, 5.4, -0.5, 24);
    U.cyl(0.38, 0.1, M.steelDark, 'coldtrap', ghs, 1.1, 6.2, -0.5, 24);
    U.label('coldtrap', ct);
    // scroll pump
    const sp = new T.Group();
    sp.position.set(-2.8, 0, 1.6);
    ghs.add(sp);
    U.box(1.3, 0.8, 0.9, M.anodBlue, 'scroll', sp, 0, 0.55, 0);
    U.cyl(0.35, 0.95, M.paint, 'scroll', sp, 0.2, 0.55, 0, 24).rotation.z = Math.PI / 2;
    U.box(1.5, 0.12, 1.0, M.rubber, 'scroll', sp, 0, 0.06, 0);
    U.label('scroll', U.anchor(sp, 0, 1.0, 0.45));
    U.tube([new T.Vector3(GX - 2.6, FLOOR + 0.9, GZ + 1.6), new T.Vector3(GX - 2.4, FLOOR + 3, GZ + 1.0), new T.Vector3(GX - 1.6, FLOOR + 3.9, GZ + 0.4)], 0.09, M.hose, 'scroll', root);
    // tanks
    [-0.8, 0.8].forEach((dx, k) => {
      const t = U.cyl(0.62, 3.6, M.paint, 'tanks', ghs, dx, 1.8, -2.4, 32);
      U.mesh(new T.SphereGeometry(0.62, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.paint, 'tanks', ghs).position.set(dx, 3.6, -2.4);
      U.cyl(0.1, 0.3, M.steelDark, 'tanks', ghs, dx, 4.2, -2.4, 12);
      if (k === 0) U.label('tanks', t);
    });
    // wide pumping line from the turbo to the still pumping line on the fridge
    const pt = new T.Vector3();
    cry.paths.pumpTop.getWorldPosition(pt);
    U.tube([
      new T.Vector3(GX - 0.6, FLOOR + 5.7, GZ),
      new T.Vector3(GX - 0.6, 12.6, GZ),
      new T.Vector3(-4.5, 13.2, -1.4),
      new T.Vector3(pt.x, 12.4, pt.z),
      new T.Vector3(pt.x, pt.y, pt.z),
    ], 0.18, M.hose, 'helines', root, 100);

    /* ---------- pulse tube compressor ---------- */
    const CX = -9, CZ = 6.5;
    const comp = new T.Group();
    comp.position.set(CX, FLOOR, CZ);
    root.add(comp);
    U.box(2.4, 2.8, 1.8, M.paint, 'compressor', comp, 0, 1.4, 0);
    const gm = new T.MeshStandardMaterial({ map: panelTexture('grille'), roughness: 0.6, metalness: 0.4 });
    U.box(1.8, 0.9, 0.03, gm, 'compressor', comp, 0, 1.1, 0.91);
    U.box(0.5, 0.3, 0.03, M.screen, 'compressor', comp, 0.6, 2.3, 0.91);
    [[-0.5, 0], [-0.2, 0]].forEach(([dx]) => U.cyl(0.1, 0.25, M.gold, 'compressor', comp, dx, 2.9, 0.3, 16));
    U.label('compressor', U.anchor(comp, 1.2, 2.3, 0.9));
    // helium hoses up to the rotary valve
    [[-0.5, 0], [-0.2, 0.24]].forEach(([dx, dz], k) => {
      U.tube([
        new T.Vector3(CX + dx, FLOOR + 3.0, CZ + 0.3),
        new T.Vector3(CX + dx + 0.5, FLOOR + 6.5, CZ - 1),
        new T.Vector3(-5.5, 13.6 + k * 0.2, 0),
        new T.Vector3(-1.9, 11.7, -2.1 + dz),
        new T.Vector3(-1.65, 11.44 + k * 0.1, -2.25 + dz - 0.12),
      ], 0.07, M.hose, 'helines', root, 90);
    });
    U.label('helines', U.anchor(root, -5.5, 13.7, 0));

    return v;
  };
})();
