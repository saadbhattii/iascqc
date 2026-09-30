/* Lightweight orbit controls: drag to rotate, right-drag or shift-drag to pan,
   wheel or pinch to zoom, two-finger drag to pan. */
(function () {
  const QC = (window.QC = window.QC || {});
  const T = THREE;

  QC.Orbit = function (camera, el) {
    const self = this;
    this.camera = camera;
    this.target = new T.Vector3();
    this.minDist = 0.3;
    this.maxDist = 120;
    this.enabled = true;
    this.onInteract = null;
    let sph = new T.Spherical();
    let dTheta = 0, dPhi = 0, dScale = 1;
    const panOff = new T.Vector3();
    const offset = new T.Vector3();
    let mode = null, sx = 0, sy = 0, pinchDist = 0, pinchMid = { x: 0, y: 0 };
    const pointers = new Map();

    this.sync = function () {
      offset.subVectors(camera.position, self.target);
      sph.setFromVector3(offset);
    };
    this.sync();

    function pan(dx, dy) {
      const dist = camera.position.distanceTo(self.target);
      const h = el.clientHeight || 1;
      const scale = (2 * dist * Math.tan((camera.fov * Math.PI) / 360)) / h;
      const right = new T.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const upv = new T.Vector3().setFromMatrixColumn(camera.matrix, 1);
      panOff.addScaledVector(right, -dx * scale);
      panOff.addScaledVector(upv, dy * scale);
    }

    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      if (!self.enabled) return;
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        mode = e.button === 2 || e.shiftKey || e.button === 1 ? 'pan' : 'rotate';
        sx = e.clientX; sy = e.clientY;
      } else if (pointers.size === 2) {
        mode = 'pinch';
        const p = [...pointers.values()];
        pinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        pinchMid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
      }
      if (self.onInteract) self.onInteract();
    });
    el.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === 'rotate') {
        const dx = e.clientX - sx, dy = e.clientY - sy;
        sx = e.clientX; sy = e.clientY;
        dTheta -= (2 * Math.PI * dx) / (el.clientHeight || 1) * 0.9;
        dPhi -= (2 * Math.PI * dy) / (el.clientHeight || 1) * 0.9;
      } else if (mode === 'pan') {
        pan(e.clientX - sx, e.clientY - sy);
        sx = e.clientX; sy = e.clientY;
      } else if (mode === 'pinch' && pointers.size === 2) {
        const p = [...pointers.values()];
        const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        const mid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
        if (pinchDist > 0) dScale *= pinchDist / d;
        pan(mid.x - pinchMid.x, mid.y - pinchMid.y);
        pinchDist = d; pinchMid = mid;
      }
    });
    function end(e) {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) mode = null;
      else if (pointers.size === 1) {
        const p = [...pointers.values()][0];
        mode = 'rotate'; sx = p.x; sy = p.y;
      }
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', (e) => {
      if (!self.enabled) return;
      e.preventDefault();
      dScale *= Math.pow(1.0015, e.deltaY);
      if (self.onInteract) self.onInteract();
    }, { passive: false });

    this.update = function () {
      offset.subVectors(camera.position, self.target);
      sph.setFromVector3(offset);
      sph.theta += dTheta * 0.18;
      sph.phi += dPhi * 0.18;
      dTheta *= 0.82; dPhi *= 0.82;
      sph.phi = Math.max(0.05, Math.min(Math.PI - 0.05, sph.phi));
      const zoom = Math.pow(dScale, 0.2);
      sph.radius = Math.max(self.minDist, Math.min(self.maxDist, sph.radius * zoom));
      dScale = Math.pow(dScale, 0.8);
      const pstep = panOff.clone().multiplyScalar(0.25);
      self.target.add(pstep);
      panOff.sub(pstep);
      offset.setFromSpherical(sph);
      camera.position.copy(self.target).add(offset);
      camera.lookAt(self.target);
    };
    this.stop = function () { dTheta = dPhi = 0; dScale = 1; panOff.set(0, 0, 0); };
  };
})();
