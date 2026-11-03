/**
 * Normalize telemetry into a stable internal representation used by
 * dashboard, diagnostics, and future swarm analytics.
 * Keeps simulated vs physical sources distinct.
 */
const TelemetryNormalize = (() => {
  const SOURCE = {
    PHYSICAL: "physical",
    SIMULATED: "simulated",
    DEMO: "demo",
  };

  /**
   * @param {object} raw decoded telemetry (from schema.decode)
   * @param {object} [meta] receiver-side metadata
   * @returns {object} normalized aircraft snapshot
   */
  function fromDecoded(raw, meta = {}) {
    const status = raw.status || 0;
    const isDemo = !!(status & 0x8000) || meta.source === SOURCE.DEMO;
    const battV = (raw.battMv || 0) / 1000;
    let battState = "unknown";
    if (raw.battMv > 0) {
      if (battV >= 11.1) battState = "good";
      else if (battV >= 10.5) battState = "warn";
      else battState = "critical";
    }

    return {
      aircraftId: raw.aircraftId,
      sequence: raw.sequence,
      sourceMs: raw.sourceMs,
      uptimeS: raw.uptimeS,
      status,
      statusFlags: {
        ok: !!(status & 0x0001),
        sensorFault: !!(status & 0x0002),
        radioFault: !!(status & 0x0004),
        lowBattery: !!(status & 0x0008),
        armed: !!(status & 0x0010),
        gpsFix: !!(status & 0x0020),
        altitudeValid: !!(status & 0x0040),
        tempValid: !!(status & 0x0080),
        demo: isDemo,
      },
      battery: {
        mv: raw.battMv,
        v: battV,
        state: battState,
      },
      accel: { x: raw.accelX, y: raw.accelY, z: raw.accelZ, unit: "milli-g" },
      gyro: { x: raw.gyroX, y: raw.gyroY, z: raw.gyroZ, unit: "centi-deg/s" },
      altitudeCm: raw.altitudeCm,
      tempC: raw.tempC10 == null ? null : raw.tempC10 / 10,
      diag: raw.diag,
      // Receiver enrichment (optional)
      rssi: meta.rssi != null ? meta.rssi : null,
      snr: meta.snr != null ? meta.snr : null,
      recvTs: meta.recvTs != null ? meta.recvTs : Date.now(),
      source: isDemo ? SOURCE.DEMO : meta.source || SOURCE.PHYSICAL,
      packetLossEstimate: meta.packetLossEstimate != null ? meta.packetLossEstimate : null,
      ageMs: null, // filled by store on read
    };
  }

  return { SOURCE, fromDecoded };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = TelemetryNormalize;
}
