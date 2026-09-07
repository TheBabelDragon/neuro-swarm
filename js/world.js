const World = (() => {
  const SWARM = 48;
  const GEN_TIME = 22;
  const HIT_R = 14;
  const PLAYER_R = 8;
  const AI_R = 5.5;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function wrap(v, max) {
    if (v < 0) return v + max;
    if (v >= max) return v - max;
    return v;
  }

  function heading(vx, vy) {
    return Math.atan2(vy, vx);
  }

  function makeAgent(genome, w, h) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 40;
    return {
      genome,
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      fitness: 0,
      alive: true,
      hue: 0,
      trail: [],
    };
  }

  function create(w, h) {
    const agents = [];
    for (let i = 0; i < SWARM; i++) agents.push(makeAgent(Net.randomGenome(), w, h));
    return {
      w, h,
      generation: 1,
      t: 0,
      genT: 0,
      best: 0,
      hits: 0,
      player: {
        x: w * 0.5,
        y: h * 0.5,
        vx: 0,
        vy: 0,
        boost: 0,
        flash: 0,
      },
      agents,
    };
  }

  function resize(state, w, h) {
    const sx = w / state.w;
    const sy = h / state.h;
    state.w = w;
    state.h = h;
    state.player.x *= sx;
    state.player.y *= sy;
    for (const a of state.agents) {
      a.x *= sx;
      a.y *= sy;
    }
  }

  function restartGeneration(state, genomes) {
    const { w, h } = state;
    state.generation += 1;
    state.genT = 0;
    state.agents = genomes.map((g) => makeAgent(g, w, h));
    state.player.x = w * 0.5;
    state.player.y = h * 0.5;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.flash = 0.6;
  }

  function sense(state, a) {
    const p = state.player;
    let dx = p.x - a.x;
    let dy = p.y - a.y;
    if (dx > state.w / 2) dx -= state.w;
    if (dx < -state.w / 2) dx += state.w;
    if (dy > state.h / 2) dy -= state.h;
    if (dy < -state.h / 2) dy += state.h;
    const dist = Math.hypot(dx, dy) || 1;
    const ndx = dx / state.w;
    const ndy = dy / state.h;
    const spd = Math.hypot(a.vx, a.vy);
    const n = Flock.nearest(a, state.agents);
    let nx = 0, ny = 0;
    if (n.agent) {
      nx = (n.agent.x - a.x) / state.w;
      ny = (n.agent.y - a.y) / state.h;
    }
    return [
      clamp(ndx * 2, -1, 1),
      clamp(ndy * 2, -1, 1),
      clamp(1 - dist / 420, -1, 1),
      clamp(a.vx / 180, -1, 1),
      clamp(a.vy / 180, -1, 1),
      clamp(spd / 180, 0, 1),
      clamp(nx * 3, -1, 1),
      clamp(ny * 3, -1, 1),
    ];
  }

  function stepPlayer(state, input, dt) {
    const p = state.player;
    const accel = input.boost ? 420 : 240;
    const max = input.boost ? 260 : 160;
    p.vx += input.x * accel * dt;
    p.vy += input.y * accel * dt;
    p.vx *= Math.pow(0.08, dt);
    p.vy *= Math.pow(0.08, dt);
    const s = Math.hypot(p.vx, p.vy);
    if (s > max) {
      p.vx = (p.vx / s) * max;
      p.vy = (p.vy / s) * max;
    }
    p.x = wrap(p.x + p.vx * dt, state.w);
    p.y = wrap(p.y + p.vy * dt, state.h);
    p.boost = input.boost ? 1 : Math.max(0, p.boost - dt * 3);
    p.flash = Math.max(0, p.flash - dt);
  }

  function stepAgents(state, dt) {
    const flockMix = Math.max(0.18, 0.55 - state.generation * 0.02);
    const netMix = 1 - flockMix * 0.35;
    let alive = 0;
    let hitsThis = 0;

    for (const a of state.agents) {
      if (!a.alive) continue;
      alive++;
      const out = Net.forward(a.genome, sense(state, a));
      const turn = out[0] * 7.5;
      const thrust = (out[1] + 1) * 0.5;
      const ang = heading(a.vx, a.vy) + turn * dt;
      const want = 50 + thrust * 160;
      let nvx = Math.cos(ang) * want;
      let nvy = Math.sin(ang) * want;

      const f = Flock.accumulate(a, state.agents);
      nvx += (f.sx * 90 + f.ax * 0.35 + f.cx * 0.9) * flockMix;
      nvy += (f.sy * 90 + f.ay * 0.35 + f.cy * 0.9) * flockMix;

      a.vx = a.vx * (1 - netMix * 0.12) + nvx * netMix * 0.12;
      a.vy = a.vy * (1 - netMix * 0.12) + nvy * netMix * 0.12;
      const spd = Math.hypot(a.vx, a.vy);
      const cap = 190;
      if (spd > cap) {
        a.vx = (a.vx / spd) * cap;
        a.vy = (a.vy / spd) * cap;
      }

      a.x = wrap(a.x + a.vx * dt, state.w);
      a.y = wrap(a.y + a.vy * dt, state.h);

      a.trail.push(a.x, a.y);
      if (a.trail.length > 28) a.trail.splice(0, 2);

      let pdx = state.player.x - a.x;
      let pdy = state.player.y - a.y;
      if (pdx > state.w / 2) pdx -= state.w;
      if (pdx < -state.w / 2) pdx += state.w;
      if (pdy > state.h / 2) pdy -= state.h;
      if (pdy < -state.h / 2) pdy += state.h;
      const pd = Math.hypot(pdx, pdy);

      a.fitness += dt * (1.6 / (1 + pd / 80));
      a.fitness += dt * 0.08 * Math.min(1, spd / 140);
      if (pd < 90) a.fitness += dt * 0.7;

      if (pd < HIT_R) {
        a.fitness += 8;
        state.player.flash = 1;
        hitsThis++;
        a.x = wrap(a.x - pdx * 2, state.w);
        a.y = wrap(a.y - pdy * 2, state.h);
      }

      a.hue = clamp(1 - pd / 360, 0, 1);
    }

    state.hits += hitsThis;
    return alive;
  }

  function step(state, input, dt) {
    dt = clamp(dt, 0, 0.05);
    state.t += dt;
    state.genT += dt;
    stepPlayer(state, input, dt);
    const alive = stepAgents(state, dt);

    let best = 0;
    for (const a of state.agents) if (a.fitness > best) best = a.fitness;
    if (best > state.best) state.best = best;

    let rolled = false;
    if (input.restart || state.genT >= GEN_TIME) {
      const { genomes, best: genBest } = GA.nextGeneration(state.agents);
      if (genBest > state.best) state.best = genBest;
      restartGeneration(state, genomes);
      rolled = true;
    }

    return { alive, rolled };
  }

  return { create, resize, step, SWARM, GEN_TIME, PLAYER_R, AI_R };
})();
