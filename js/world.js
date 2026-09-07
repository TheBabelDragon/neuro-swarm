const World = (() => {
  const SWARM = 56;
  const GEN_TIME = 26;
  const HIT_R = 16;
  const PLAYER_R = 9;
  const AI_R = 6;
  const BOLT_SPEED = 640;
  const BOLT_LIFE = 0.42;
  const PLAYER_COOL = 0.16;
  const AI_COOL = 0.55;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function makeAgent(genome, w, h) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 36 + Math.random() * 50;
    return {
      genome,
      x: 80 + Math.random() * (w - 160),
      y: 80 + Math.random() * (h - 160),
      z: 10 + Math.random() * 26,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: (Math.random() - 0.5) * 8,
      heading: angle,
      bank: 0,
      rot: Math.random() * Math.PI * 2,
      fitness: 0,
      alive: true,
      heat: 0,
      cool: Math.random() * 0.4,
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
      kills: 0,
      threat: 0,
      shake: 0,
      sparks: [],
      bolts: [],
      booms: [],
      player: {
        x: w * 0.5,
        y: h * 0.5,
        z: 18,
        vx: 0,
        vy: 0,
        vz: 0,
        heading: -Math.PI / 2,
        bank: 0,
        rot: 0,
        boost: 0,
        flash: 0,
        hp: 1,
        cool: 0,
        dead: false,
        trail: [],
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
    for (const a of state.agents) { a.x *= sx; a.y *= sy; }
  }

  function restartGeneration(state, genomes) {
    const { w, h } = state;
    state.generation += 1;
    state.genT = 0;
    state.agents = genomes.map((g) => makeAgent(g, w, h));
    state.bolts = [];
    state.player.x = w * 0.5;
    state.player.y = h * 0.5;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.hp = 1;
    state.player.dead = false;
    state.player.flash = 0.45;
    state.player.trail = [];
    state.player.cool = 0;
  }

  function sense(state, a) {
    const p = state.player;
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    const n = Flock.nearest(a, state.agents);
    let nx = 0, ny = 0;
    if (n.agent) {
      nx = (n.agent.x - a.x) / state.w;
      ny = (n.agent.y - a.y) / state.h;
    }
    return [
      clamp(dx / (state.w * 0.5), -1, 1),
      clamp(dy / (state.h * 0.5), -1, 1),
      clamp(1 - dist / 380, -1, 1),
      clamp(a.vx / 180, -1, 1),
      clamp(a.vy / 180, -1, 1),
      clamp(Math.hypot(a.vx, a.vy) / 180, 0, 1),
      clamp(nx * 3, -1, 1),
      clamp(ny * 3, -1, 1),
    ];
  }

  function confine(ent, w, h, margin) {
    if (ent.x < margin) ent.vx += (margin - ent.x) * 0.08;
    if (ent.y < margin) ent.vy += (margin - ent.y) * 0.08;
    if (ent.x > w - margin) ent.vx -= (ent.x - (w - margin)) * 0.08;
    if (ent.y > h - margin) ent.vy -= (ent.y - (h - margin)) * 0.08;
    ent.x = clamp(ent.x, 8, w - 8);
    ent.y = clamp(ent.y, 8, h - 8);
    ent.z = clamp(ent.z, 6, 42);
  }

  function pushTrail(ent, max) {
    ent.trail.push(ent.x, ent.y, ent.z);
    if (ent.trail.length > max * 3) ent.trail.splice(0, 3);
  }

  function spark(state, x, y, z, n, speed) {
    const spd = speed || 140;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = spd * (0.3 + Math.random());
      state.sparks.push({
        x, y, z,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.22 + Math.random() * 0.4,
      });
    }
  }

  function boom(state, x, y, z, power, friendly) {
    state.booms.push({
      x, y, z,
      t: 0,
      life: 0.38 + power * 0.12,
      power,
      friendly: !!friendly,
    });
    spark(state, x, y, z, 14 + (power * 10) | 0, 80 + power * 90);
    state.shake = Math.max(state.shake, 0.45 + power * 0.4);
    SFX.boom();
    if (navigator.vibrate) navigator.vibrate(power > 1.2 ? [18, 30, 40] : 16);
  }

  function fire(state, ent, friendly) {
    const hx = Math.cos(ent.heading);
    const hy = Math.sin(ent.heading);
    state.bolts.push({
      x: ent.x + hx * 14,
      y: ent.y + hy * 14,
      z: ent.z,
      vx: hx * BOLT_SPEED + ent.vx * 0.25,
      vy: hy * BOLT_SPEED + ent.vy * 0.25,
      heading: ent.heading,
      life: BOLT_LIFE,
      friendly,
    });
    SFX.zap(friendly);
  }

  function killAgent(state, a) {
    if (!a.alive) return;
    a.alive = false;
    a.fitness -= 4;
    state.kills += 1;
    boom(state, a.x, a.y, a.z, 1, true);
  }

  function destroyPlayer(state) {
    const p = state.player;
    if (p.dead) return;
    p.dead = true;
    p.hp = 0;
    boom(state, p.x, p.y, p.z, 1.8, false);
    p.flash = 1;
  }

  function stepPlayer(state, input, dt) {
    const p = state.player;
    if (p.dead) return;
    const accel = input.boost ? 520 : 280;
    const max = input.boost ? 280 : 168;
    p.vx += input.x * accel * dt;
    p.vy += input.y * accel * dt;
    p.vz += ((input.boost ? 24 : 16) - p.z) * 1.8 * dt;
    p.vx *= Math.pow(0.06, dt);
    p.vy *= Math.pow(0.06, dt);
    p.vz *= Math.pow(0.12, dt);
    const s = Math.hypot(p.vx, p.vy);
    if (s > max) { p.vx = (p.vx / s) * max; p.vy = (p.vy / s) * max; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    if (s > 12) p.heading = Math.atan2(p.vy, p.vx);
    const desiredBank = clamp(p.vx / 220, -1, 1);
    p.bank += (desiredBank - p.bank) * 6 * dt;
    p.rot += (8 + s / 18 + (input.boost ? 10 : 0)) * dt;
    p.boost += ((input.boost ? 1 : 0) - p.boost) * 8 * dt;
    p.flash = Math.max(0, p.flash - dt);
    p.cool = Math.max(0, p.cool - dt);
    if (input.fire && p.cool <= 0) {
      fire(state, p, true);
      p.cool = PLAYER_COOL;
    }
    confine(p, state.w, state.h, 36);
    pushTrail(p, 16);
  }

  function stepAgents(state, dt) {
    const flockMix = Math.max(0.16, 0.52 - state.generation * 0.018);
    const netMix = 1 - flockMix * 0.32;
    let alive = 0;
    let closest = 1e9;
    let hitsThis = 0;

    for (const a of state.agents) {
      if (!a.alive) continue;
      alive++;
      const out = Net.forward(a.genome, sense(state, a));
      const turn = out[0] * 6.8;
      const thrust = (out[1] + 1) * 0.5;
      a.heading += turn * dt;
      const want = 48 + thrust * 168;
      let nvx = Math.cos(a.heading) * want;
      let nvy = Math.sin(a.heading) * want;

      const f = Flock.accumulate(a, state.agents);
      nvx += (f.sx * 95 + f.ax * 0.38 + f.cx * 0.85) * flockMix;
      nvy += (f.sy * 95 + f.ay * 0.38 + f.cy * 0.85) * flockMix;

      a.vx = a.vx * (1 - netMix * 0.14) + nvx * netMix * 0.14;
      a.vy = a.vy * (1 - netMix * 0.14) + nvy * netMix * 0.14;
      a.vz += ((14 + Math.sin(state.t * 0.7 + a.x * 0.01) * 8) - a.z) * 1.4 * dt;
      const spd = Math.hypot(a.vx, a.vy);
      if (spd > 198) { a.vx = (a.vx / spd) * 198; a.vy = (a.vy / spd) * 198; }
      if (spd > 10) a.heading = Math.atan2(a.vy, a.vx);
      a.bank += (clamp(a.vx / 200, -1, 1) - a.bank) * 5 * dt;
      a.rot += (7 + spd / 16) * dt;
      a.cool = Math.max(0, a.cool - dt);

      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.z += a.vz * dt;
      confine(a, state.w, state.h, 28);
      pushTrail(a, 12);

      const pdx = state.player.x - a.x;
      const pdy = state.player.y - a.y;
      const pdz = state.player.z - a.z;
      const pd = Math.hypot(pdx, pdy, pdz * 0.6);
      if (pd < closest) closest = pd;

      a.fitness += dt * (1.7 / (1 + pd / 70));
      a.fitness += dt * 0.07 * Math.min(1, spd / 140);
      if (pd < 80) a.fitness += dt * 0.85;
      a.heat += ((pd < 140 ? 1 - pd / 140 : 0) - a.heat) * 4 * dt;

      const aimDot = (pdx * Math.cos(a.heading) + pdy * Math.sin(a.heading)) / (pd || 1);
      if (!state.player.dead && a.cool <= 0 && out[2] > 0.35 && pd < 320 && aimDot > 0.35) {
        fire(state, a, false);
        a.cool = AI_COOL + Math.random() * 0.2;
        a.fitness += 0.4;
      }

      if (!state.player.dead && pd < HIT_R + a.z * 0.04) {
        a.fitness += 8;
        state.player.flash = 1;
        state.player.hp -= 0.18;
        hitsThis++;
        spark(state, a.x, a.y, a.z, 8, 110);
        a.vx -= pdx * 8;
        a.vy -= pdy * 8;
        if (state.player.hp <= 0) destroyPlayer(state);
      }
    }

    state.hits += hitsThis;
    state.threat = clamp(1 - closest / 220, 0, 1);
    if (hitsThis) {
      SFX.hit();
      if (navigator.vibrate) navigator.vibrate(18);
    }
    return alive;
  }

  function stepBolts(state, dt) {
    for (let i = state.bolts.length - 1; i >= 0; i--) {
      const b = state.bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.y < 0 || b.x > state.w || b.y > state.h) {
        state.bolts.splice(i, 1);
        continue;
      }
      let hit = false;
      if (b.friendly) {
        for (const a of state.agents) {
          if (!a.alive) continue;
          const d = Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * 0.45);
          if (d < 13) {
            a.fitness -= 2;
            killAgent(state, a);
            hit = true;
            break;
          }
        }
      } else if (!state.player.dead) {
        const p = state.player;
        const d = Math.hypot(p.x - b.x, p.y - b.y, (p.z - b.z) * 0.45);
        if (d < 14) {
          p.hp -= 0.22;
          p.flash = 1;
          spark(state, b.x, b.y, b.z, 8, 100);
          SFX.hit();
          if (p.hp <= 0) destroyPlayer(state);
          hit = true;
        }
      }
      if (hit) state.bolts.splice(i, 1);
    }
  }

  function stepFx(state, dt) {
    for (let i = state.sparks.length - 1; i >= 0; i--) {
      const s = state.sparks[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.9;
      s.vy *= 0.9;
      if (s.life <= 0) state.sparks.splice(i, 1);
    }
    for (let i = state.booms.length - 1; i >= 0; i--) {
      const b = state.booms[i];
      b.t += dt;
      if (b.t >= b.life) state.booms.splice(i, 1);
    }
    state.shake = Math.max(0, state.shake - dt * 3.2);
  }

  function step(state, input, dt) {
    dt = clamp(dt, 0, 0.05);
    state.t += dt;
    state.genT += dt;
    stepPlayer(state, input, dt);
    const alive = stepAgents(state, dt);
    stepBolts(state, dt);
    stepFx(state, dt);

    let best = 0;
    for (const a of state.agents) if (a.fitness > best) best = a.fitness;
    if (best > state.best) state.best = best;

    const wipe = alive === 0;
    const down = state.player.dead && state.genT > 0.55;
    let rolled = false;
    if (input.restart || state.genT >= GEN_TIME || wipe || down) {
      const { genomes, best: genBest } = GA.nextGeneration(state.agents);
      if (genBest > state.best) state.best = genBest;
      restartGeneration(state, genomes);
      rolled = true;
    }
    return { alive, rolled };
  }

  return { create, resize, step, SWARM, GEN_TIME, PLAYER_R, AI_R };
})();
