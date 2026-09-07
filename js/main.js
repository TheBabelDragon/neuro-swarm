(() => {
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d", { alpha: false });
  const elGen = document.getElementById("gen");
  const elBest = document.getElementById("best");
  const elAlive = document.getElementById("alive");
  const elHits = document.getElementById("hits");
  const toast = document.getElementById("toast");

  const keys = new Set();
  const input = { x: 0, y: 0, boost: false, restart: false };

  let state = null;
  let last = performance.now();
  let toastUntil = 0;

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!state) state = World.create(w, h);
    else World.resize(state, w, h);
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    toastUntil = performance.now() + 1400;
  }

  function pollInput() {
    let x = 0, y = 0;
    if (keys.has("arrowleft") || keys.has("a")) x -= 1;
    if (keys.has("arrowright") || keys.has("d")) x += 1;
    if (keys.has("arrowup") || keys.has("w")) y -= 1;
    if (keys.has("arrowdown") || keys.has("s")) y += 1;
    input.x = x;
    input.y = y;
    input.boost = keys.has(" ") || keys.has("shift");
  }

  function draw() {
    const { w, h, player, agents, generation } = state;
    ctx.fillStyle = "#07090c";
    ctx.fillRect(0, 0, w, h);

    const g = ctx.createRadialGradient(player.x, player.y, 20, player.x, player.y, 280);
    g.addColorStop(0, "rgba(126,231,255,0.07)");
    g.addColorStop(1, "rgba(7,9,12,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    for (const a of agents) {
      if (!a.alive || a.trail.length < 4) continue;
      const heat = a.hue;
      ctx.strokeStyle = `rgba(${Math.floor(180 + 75 * heat)}, ${Math.floor(70 + 40 * (1 - heat))}, ${Math.floor(70 + 20 * (1 - heat))}, 0.28)`;
      ctx.beginPath();
      ctx.moveTo(a.trail[0], a.trail[1]);
      for (let i = 2; i < a.trail.length; i += 2) ctx.lineTo(a.trail[i], a.trail[i + 1]);
      ctx.stroke();
    }

    for (const a of agents) {
      if (!a.alive) continue;
      const ang = Math.atan2(a.vy, a.vx);
      const r = World.AI_R;
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(ang);
      ctx.fillStyle = `rgb(${Math.floor(200 + 55 * a.hue)}, ${Math.floor(60 + 30 * (1 - a.hue))}, ${70})`;
      ctx.beginPath();
      ctx.moveTo(r + 3, 0);
      ctx.lineTo(-r, r * 0.7);
      ctx.lineTo(-r * 0.4, 0);
      ctx.lineTo(-r, -r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const pr = World.PLAYER_R + (player.boost ? 2 : 0);
    ctx.save();
    ctx.translate(player.x, player.y);
    const pang = Math.hypot(player.vx, player.vy) > 8 ? Math.atan2(player.vy, player.vx) : 0;
    ctx.rotate(pang);
    ctx.shadowColor = player.flash > 0 ? "#ff5d6c" : "#7ee7ff";
    ctx.shadowBlur = 16 + player.flash * 24;
    ctx.fillStyle = player.flash > 0 ? "#ff8a96" : "#7ee7ff";
    ctx.beginPath();
    ctx.moveTo(pr + 4, 0);
    ctx.lineTo(-pr, pr * 0.75);
    ctx.lineTo(-pr * 0.35, 0);
    ctx.lineTo(-pr, -pr * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.shadowBlur = 0;
    const remain = Math.max(0, World.GEN_TIME - state.genT);
    ctx.fillStyle = "rgba(125,255,178,0.18)";
    ctx.fillRect(0, 0, w * (remain / World.GEN_TIME), 2);

    elGen.textContent = String(generation);
    elBest.textContent = state.best.toFixed(1);
    elAlive.textContent = String(agents.filter((a) => a.alive).length);
    elHits.textContent = String(state.hits);
  }

  function frame(now) {
    const dt = (now - last) / 1000;
    last = now;
    pollInput();
    const { rolled } = World.step(state, input, dt);
    if (input.restart) input.restart = false;
    if (rolled) showToast(`GENERATION ${state.generation}`);
    if (toastUntil && now > toastUntil) {
      toast.classList.remove("show");
      toastUntil = 0;
    }
    draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys.add(k);
    if (k === "r") {
      input.restart = true;
      e.preventDefault();
    }
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("resize", size);
  window.addEventListener("blur", () => keys.clear());

  size();
  showToast("FIELD ONLINE");
  requestAnimationFrame(frame);
})();
