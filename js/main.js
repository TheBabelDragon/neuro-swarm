(() => {
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d", { alpha: false });
  const elGen = document.getElementById("gen");
  const elBest = document.getElementById("best");
  const elAlive = document.getElementById("alive");
  const elHits = document.getElementById("hits");
  const elKills = document.getElementById("kills");
  const elThreat = document.getElementById("threat");
  const toast = document.getElementById("toast");

  let state = null;
  let last = performance.now();
  let toastUntil = 0;
  let camX = 0, camY = 0;
  const view = { w: 0, h: 0 };

  function dpr() {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  function size() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    view.w = w;
    view.h = h;
    canvas.width = Math.floor(w * dpr());
    canvas.height = Math.floor(h * dpr());
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const fieldW = w * 1.35;
    const fieldH = h * 1.35;
    if (!state) {
      state = World.create(fieldW, fieldH);
      camX = state.player.x - w / 2;
      camY = state.player.y - h / 2;
    } else World.resize(state, fieldW, fieldH);
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    toastUntil = performance.now() + 1500;
  }

  function screen(x, y) {
    return [x - camX, y - camY];
  }

  function drawGrid() {
    const step = 56;
    const ox = -((camX % step) + step) % step;
    const oy = -((camY % step) + step) % step;
    ctx.strokeStyle = "rgba(80, 120, 110, 0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ox; x < view.w + step; x += step) {
      ctx.moveTo(x, 0); ctx.lineTo(x, view.h);
    }
    for (let y = oy; y < view.h + step; y += step) {
      ctx.moveTo(0, y); ctx.lineTo(view.w, y);
    }
    ctx.stroke();
  }

  function drawTrail(trail, rgba) {
    if (!trail || trail.length < 6) return;
    ctx.beginPath();
    for (let i = 0; i < trail.length; i += 3) {
      const [sx, sy] = screen(trail[i], trail[i + 1]);
      if (i === 0) ctx.moveTo(sx, sy + trail[i + 2] * 0.4);
      else ctx.lineTo(sx, sy + trail[i + 2] * 0.4);
    }
    ctx.strokeStyle = rgba;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  function drawQuad(ent, isPlayer) {
    const [sx, sy] = screen(ent.x, ent.y);
    const sc = 0.62 + ent.z * 0.02;
    const shadowY = sy + ent.z * 0.55 + 10;

    ctx.save();
    ctx.translate(sx, shadowY);
    ctx.scale(sc, sc * 0.35);
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(sc, sc * (0.78 + Math.abs(ent.bank) * 0.08));
    ctx.rotate(ent.heading);
    ctx.rotate(ent.bank * 0.45);

    const heat = isPlayer ? 0 : (ent.heat || 0);
    const body = isPlayer
      ? (ent.flash > 0 ? "#ff8a96" : "#c6f4ff")
      : `rgb(${Math.floor(30 + 40 * heat)}, ${Math.floor(18 + 10 * (1 - heat))}, ${Math.floor(18 + 8 * (1 - heat))})`;
    const arm = isPlayer ? "#7ee7ff" : `rgb(${Math.floor(160 + 80 * heat)}, ${Math.floor(40 + 20 * (1 - heat))}, 48)`;

    ctx.strokeStyle = arm;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-11, -11); ctx.lineTo(11, 11);
    ctx.moveTo(11, -11); ctx.lineTo(-11, 11);
    ctx.stroke();

    const discs = [[-11, -11], [11, -11], [11, 11], [-11, 11]];
    for (const [rx, ry] of discs) {
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(ent.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.2, 6.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = isPlayer ? "rgba(180,240,255,0.18)" : "rgba(255,90,70,0.14)";
      ctx.fill();
      ctx.strokeStyle = isPlayer ? "rgba(180,240,255,0.45)" : "rgba(255,120,80,0.35)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
      ctx.moveTo(0, -6); ctx.lineTo(0, 6);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, 4.2);
    ctx.lineTo(-3.5, 0);
    ctx.lineTo(-6, -4.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ff3b3b";
    ctx.beginPath(); ctx.arc(-5.5, -2.2, 1.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3dff7a";
    ctx.beginPath(); ctx.arc(-5.5, 2.2, 1.05, 0, Math.PI * 2); ctx.fill();

    if (isPlayer && ent.boost > 0.05) {
      ctx.fillStyle = `rgba(255,180,84,${0.25 + ent.boost * 0.45})`;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(-12 - ent.boost * 8, 3);
      ctx.lineTo(-12 - ent.boost * 8, -3);
      ctx.fill();
    }

    ctx.restore();
  }

  function draw() {
    const { player, agents, sparks, generation, threat, shake } = state;
    ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    ctx.translate((Math.random() - 0.5) * shake * 10, (Math.random() - 0.5) * shake * 10);

    ctx.fillStyle = "#05070a";
    ctx.fillRect(-20, -20, view.w + 40, view.h + 40);

    const [px, py] = screen(player.x, player.y);
    const glow = ctx.createRadialGradient(px, py, 10, px, py, 340);
    glow.addColorStop(0, `rgba(126,231,255,${0.07 + player.boost * 0.05})`);
    glow.addColorStop(0.45, `rgba(255,80,70,${0.04 * threat})`);
    glow.addColorStop(1, "rgba(5,7,10,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-20, -20, view.w + 40, view.h + 40);

    drawGrid();
    drawTrail(player.trail, "rgba(126,231,255,0.22)");
    for (const a of agents) {
      const h = a.heat;
      drawTrail(a.trail, `rgba(${180 + 60 * h | 0},${50 + 20 * (1 - h) | 0},50,0.18)`);
    }

    const drawList = agents.slice().sort((a, b) => (a.y + a.z) - (b.y + b.z));
    for (const a of drawList) if (a.alive) drawQuad(a, false);
    if (!player.dead) drawQuad(player, true);

    for (const b of state.bolts) {
      const [sx, sy] = screen(b.x, b.y);
      const hx = Math.cos(b.heading);
      const hy = Math.sin(b.heading);
      ctx.strokeStyle = b.friendly ? "rgba(180,255,255,0.95)" : "rgba(255,90,70,0.9)";
      ctx.shadowColor = b.friendly ? "#7ee7ff" : "#ff5d6c";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(sx - hx * 11, sy - hy * 11);
      ctx.lineTo(sx + hx * 7, sy + hy * 7);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    for (const boom of state.booms) {
      const [sx, sy] = screen(boom.x, boom.y);
      const u = boom.t / boom.life;
      const r = (12 + boom.power * 28) * (0.25 + u);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.strokeStyle = boom.friendly
        ? `rgba(255,210,140,${1 - u})`
        : `rgba(255,80,70,${1 - u})`;
      ctx.lineWidth = 3 * (1 - u);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,240,200,${0.35 * (1 - u)})`;
      ctx.fill();
    }

    for (const s of sparks) {
      const [sx, sy] = screen(s.x, s.y);
      ctx.fillStyle = `rgba(255,210,140,${Math.max(0, s.life * 2)})`;
      ctx.fillRect(sx, sy, 2, 2);
    }

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(12, view.h - 14, 88, 5);
    ctx.fillStyle = player.hp > 0.35 ? "#7dffb2" : "#ff5d6c";
    ctx.fillRect(12, view.h - 14, 88 * Math.max(0, player.hp), 5);

    const remain = Math.max(0, World.GEN_TIME - state.genT);
    ctx.fillStyle = "rgba(125,255,178,0.22)";
    ctx.fillRect(0, 0, view.w * (remain / World.GEN_TIME), 2);

    const vig = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.25, view.w / 2, view.h / 2, view.h * 0.78);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, view.w, view.h);

    elGen.textContent = String(generation);
    elBest.textContent = state.best.toFixed(1);
    elAlive.textContent = String(agents.filter((a) => a.alive).length);
    elHits.textContent = String(state.hits);
    if (elKills) elKills.textContent = String(state.kills);
    const label = threat > 0.72 ? "LOCK" : threat > 0.4 ? "CLOSE" : "LOW";
    elThreat.textContent = label;
    elThreat.style.color = threat > 0.72 ? "#ff5d6c" : threat > 0.4 ? "#ffb454" : "#7dffb2";
  }

  function frame(now) {
    const dt = (now - last) / 1000;
    last = now;
    const input = Input.poll();
    input.restart = Input.consumeRestart();
    const { rolled } = World.step(state, input, dt);

    const targetX = state.player.x - view.w * 0.5 + state.player.vx * 0.12;
    const targetY = state.player.y - view.h * 0.5 + state.player.vy * 0.12;
    camX += (targetX - camX) * Math.min(1, 4.2 * dt);
    camY += (targetY - camY) * Math.min(1, 4.2 * dt);
    camX = Math.max(-40, Math.min(state.w - view.w + 40, camX));
    camY = Math.max(-40, Math.min(state.h - view.h + 40, camY));

    SFX.setField(state.threat, input.boost);
    if (rolled) {
      showToast(`GENERATION ${state.generation}`);
      SFX.gen();
    }
    if (toastUntil && now > toastUntil) {
      toast.classList.remove("show");
      toastUntil = 0;
    }
    draw();
    requestAnimationFrame(frame);
  }

  Input.bind();
  size();
  window.addEventListener("resize", size);
  showToast("FIELD ONLINE");
  requestAnimationFrame(frame);
})();
