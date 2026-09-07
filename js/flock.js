/* Light Reynolds forces so gen-1 already murmurs. */
const Flock = (() => {
  const SEP_R = 22;
  const ALI_R = 56;
  const COH_R = 72;

  function accumulate(self, others) {
    let sx = 0, sy = 0, sn = 0;
    let ax = 0, ay = 0, an = 0;
    let cx = 0, cy = 0, cn = 0;

    for (const o of others) {
      if (o === self || !o.alive) continue;
      const dx = o.x - self.x;
      const dy = o.y - self.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 1e-4) continue;
      const d = Math.sqrt(d2);

      if (d < SEP_R) {
        sx -= dx / d;
        sy -= dy / d;
        sn++;
      }
      if (d < ALI_R) {
        ax += o.vx;
        ay += o.vy;
        an++;
      }
      if (d < COH_R) {
        cx += o.x;
        cy += o.y;
        cn++;
      }
    }

    const out = { sx: 0, sy: 0, ax: 0, ay: 0, cx: 0, cy: 0 };
    if (sn) { out.sx = sx / sn; out.sy = sy / sn; }
    if (an) { out.ax = ax / an; out.ay = ay / an; }
    if (cn) { out.cx = (cx / cn) - self.x; out.cy = (cy / cn) - self.y; }
    return out;
  }

  function nearest(self, others) {
    let best = null;
    let bestD = Infinity;
    for (const o of others) {
      if (o === self || !o.alive) continue;
      const dx = o.x - self.x;
      const dy = o.y - self.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) { bestD = d2; best = o; }
    }
    return { agent: best, dist: Math.sqrt(bestD) };
  }

  return { accumulate, nearest, SEP_R, ALI_R, COH_R };
})();
