const SFX = (() => {
  let ctx = null;
  let master = null;
  let swarm = null;
  let swarmGain = null;
  let noise = null;
  let ready = false;

  function boot() {
    if (ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);

    swarm = ctx.createOscillator();
    swarm.type = "sawtooth";
    swarm.frequency.value = 42;
    const swarmFilter = ctx.createBiquadFilter();
    swarmFilter.type = "lowpass";
    swarmFilter.frequency.value = 180;
    swarmGain = ctx.createGain();
    swarmGain.gain.value = 0.08;
    swarm.connect(swarmFilter);
    swarmFilter.connect(swarmGain);
    swarmGain.connect(master);
    swarm.start();

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "bandpass";
    nFilter.frequency.value = 900;
    nFilter.Q.value = 0.6;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.03;
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(master);
    noise.start();

    ready = true;
    if (ctx.state === "suspended") ctx.resume();
  }

  function resume() {
    boot();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function blip(freq, dur, type, vol) {
    if (!ready) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.value = vol || 0.08;
    o.connect(g);
    g.connect(master);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.stop(ctx.currentTime + dur + 0.02);
  }

  function hit() {
    if (!ready) return;
    blip(90, 0.18, "sawtooth", 0.12);
    blip(240, 0.08, "square", 0.05);
  }

  function zap(friendly) {
    if (!ready) return;
    blip(friendly ? 1400 : 880, 0.06, "square", friendly ? 0.045 : 0.035);
  }

  function boom() {
    if (!ready) return;
    blip(55, 0.28, "sawtooth", 0.16);
    blip(180, 0.12, "triangle", 0.07);
  }

  function boost() {
    if (!ready) return;
    blip(160, 0.12, "triangle", 0.05);
  }

  function gen() {
    if (!ready) return;
    blip(520, 0.12, "sine", 0.06);
    setTimeout(() => blip(780, 0.16, "sine", 0.05), 90);
  }

  function setField(threat, boosting) {
    if (!ready || !swarm) return;
    const t = Math.min(1, threat);
    swarm.frequency.setTargetAtTime(38 + t * 70 + (boosting ? 18 : 0), ctx.currentTime, 0.08);
    swarmGain.gain.setTargetAtTime(0.05 + t * 0.14, ctx.currentTime, 0.1);
  }

  return { resume, hit, boost, gen, zap, boom, setField };
})();
