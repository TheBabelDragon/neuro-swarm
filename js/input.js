const Input = (() => {
  const keys = new Set();
  const boostIds = new Set();
  const fireIds = new Set();
  const state = { x: 0, y: 0, boost: false, fire: false, restart: false };

  let stickId = null;
  let origin = { x: 0, y: 0 };
  let vec = { x: 0, y: 0 };
  const RADIUS = 54;

  const knob = () => document.getElementById("knob");
  const stickEl = () => document.getElementById("stick");
  const boostEl = () => document.getElementById("boost");
  const fireEl = () => document.getElementById("fire");

  function setKnob(x, y) {
    const k = knob();
    if (k) k.style.transform = `translate(${x * RADIUS}px, ${y * RADIUS}px)`;
  }

  function paint() {
    boostEl().classList.toggle("hot", state.boost);
    const f = fireEl();
    if (f) f.classList.toggle("hot", state.fire);
  }

  function applyStick(clientX, clientY) {
    let dx = clientX - origin.x;
    let dy = clientY - origin.y;
    const mag = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(1, mag / RADIUS);
    vec.x = (dx / mag) * clamped;
    vec.y = (dy / mag) * clamped;
    setKnob(vec.x, vec.y);
  }

  function parkStick() {
    const s = stickEl();
    s.style.left = "";
    s.style.top = "";
    s.style.bottom = "";
    s.style.opacity = "";
    stickId = null;
    vec.x = 0;
    vec.y = 0;
    setKnob(0, 0);
  }

  function bind() {
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      keys.add(k);
      SFX.resume();
      if (k === "r") { state.restart = true; e.preventDefault(); }
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    }, { passive: false });

    window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => {
      keys.clear();
      boostIds.clear();
      fireIds.clear();
      parkStick();
    });

    const boost = boostEl();
    const fire = fireEl();
    const gen = document.getElementById("nextgen");

    boost.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      boostIds.add("btn");
      SFX.resume();
      SFX.boost();
    });
    const releaseBtn = (e) => { e.preventDefault(); boostIds.delete("btn"); };
    boost.addEventListener("pointerup", releaseBtn);
    boost.addEventListener("pointerleave", releaseBtn);
    boost.addEventListener("pointercancel", releaseBtn);

    if (fire) {
      fire.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        fireIds.add("btn");
        SFX.resume();
      });
      const releaseFire = (e) => { e.preventDefault(); fireIds.delete("btn"); };
      fire.addEventListener("pointerup", releaseFire);
      fire.addEventListener("pointerleave", releaseFire);
      fire.addEventListener("pointercancel", releaseFire);
    }

    gen.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.restart = true;
      SFX.resume();
    });

    window.addEventListener("pointerdown", (e) => {
      SFX.resume();
      if (e.target.closest("#boost") || e.target.closest("#nextgen") || e.target.closest("#fire")) return;
      if (e.clientX >= window.innerWidth * 0.58) {
        boostIds.add(e.pointerId);
        SFX.boost();
        return;
      }
      if (stickId !== null) return;
      stickId = e.pointerId;
      origin = { x: e.clientX, y: e.clientY };
      const s = stickEl();
      s.style.left = `${e.clientX - 66}px`;
      s.style.bottom = "auto";
      s.style.top = `${e.clientY - 66}px`;
      s.style.opacity = "0.85";
      applyStick(e.clientX, e.clientY);
    }, { passive: false });

    window.addEventListener("pointermove", (e) => {
      if (e.pointerId === stickId) applyStick(e.clientX, e.clientY);
    }, { passive: false });

    const end = (e) => {
      if (e.pointerId === stickId) parkStick();
      boostIds.delete(e.pointerId);
      fireIds.delete(e.pointerId);
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);

    document.addEventListener("gesturestart", (e) => e.preventDefault());
    document.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function poll() {
    let x = vec.x;
    let y = vec.y;
    if (keys.has("arrowleft") || keys.has("a")) x -= 1;
    if (keys.has("arrowright") || keys.has("d")) x += 1;
    if (keys.has("arrowup") || keys.has("w")) y -= 1;
    if (keys.has("arrowdown") || keys.has("s")) y += 1;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    state.x = x;
    state.y = y;
    state.boost = boostIds.size > 0 || keys.has(" ") || keys.has("shift");
    state.fire = fireIds.size > 0 || keys.has("f") || keys.has("j") || keys.has("k") || keys.has("control");
    paint();
    return state;
  }

  function consumeRestart() {
    const r = state.restart;
    state.restart = false;
    return r;
  }

  return { bind, poll, consumeRestart, state };
})();
