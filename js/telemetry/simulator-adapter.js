/**
 * Expose simulated aircraft as telemetry-compatible snapshots.
 * Does NOT alter the genetic algorithm or world physics.
 * Pure observation adapter for future swarm analytics / dual-domain UI.
 */
const SimulatorAdapter = (() => {
  // Stable synthetic IDs in a reserved high range so they never collide
  // with physical aircraft IDs (which should be assigned below 0xF0000000).
  const SIM_ID_BASE = 0xf0000000;

  function agentToTelemetry(agent, index, generation, tMs) {
    if (!agent) return null;
    const status =
      0x0001 | // OK
      (agent.alive ? 0 : 0x0002) |
      0x8000; // DEMO / simulated marker

    // Map simulation kinematics into plausible sensor ranges for dashboard exercise.
    const accelX = Math.round(agent.vx * 2); // crude mapping
    const accelY = Math.round(agent.vy * 2);
    const accelZ = Math.round(1000 + agent.vz * 5); // ~1g + vertical
    const gyroZ = Math.round((agent.bank || 0) * 1000);

    return {
      aircraftId: (SIM_ID_BASE + (index & 0x0fffffff)) >>> 0,
      sequence: Math.floor(tMs / 50) & 0xffff,
      sourceMs: tMs >>> 0,
      uptimeS: Math.min(0xffff, Math.floor(tMs / 1000)),
      status,
      battMv: 11800 + Math.round((Math.sin(tMs / 5000 + index) * 200)),
      accelX,
      accelY,
      accelZ,
      gyroX: 0,
      gyroY: Math.round((agent.heading || 0) * 10),
      gyroZ,
      altitudeCm: Math.round((agent.z || 0) * 10),
      tempC10: 250 + Math.round(Math.sin(tMs / 8000) * 15),
      diag: (generation & 0xffff),
      reserved: 0,
    };
  }

  /**
   * Produce an array of normalized snapshots from a World state.
   * Only alive agents (plus optional player) are emitted.
   */
  function fromWorldState(state, opts = {}) {
    if (!state || !state.agents) return [];
    const tMs = Math.floor((state.t || 0) * 1000);
    const out = [];
    const max = opts.maxAgents != null ? opts.maxAgents : 8;
    let n = 0;
    for (let i = 0; i < state.agents.length && n < max; i++) {
      const a = state.agents[i];
      if (!a.alive && !opts.includeDead) continue;
      const raw = agentToTelemetry(a, i, state.generation || 1, tMs);
      if (!raw) continue;
      const encoded = TelemetrySchema.encode(raw);
      const decoded = TelemetrySchema.decode(encoded);
      if (!decoded.ok) continue;
      const norm = TelemetryNormalize.fromDecoded(decoded.telemetry, {
        source: TelemetryNormalize.SOURCE.SIMULATED,
        recvTs: Date.now(),
        rssi: null,
        snr: null,
      });
      out.push(norm);
      n++;
    }
    return out;
  }

  return {
    SIM_ID_BASE,
    agentToTelemetry,
    fromWorldState,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SimulatorAdapter;
}
