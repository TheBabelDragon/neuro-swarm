/**
 * FlightBackend interface documentation as a thin registry.
 * Implementations: simulation (js/autonomy/sim-backend.js),
 * native ESP32-S3 (firmware boundary), external FC adapter.
 */
const FlightBackendRegistry = (() => {
  /**
   * Required methods on any backend:
   *  capabilities()
   *  sensorState()
   *  requestMode(to, reason)
   *  loadMission(plan) — optional if no nav
   *  startAutonomous() — optional
   *  step(dt) — sim / host
   *
   * Physical backends MUST report safety.hardware_validated: false until
   * documented validation. Simulation tests do not promote physical readiness.
   */
  function assertInterface(backend) {
    if (!backend || typeof backend.capabilities !== "function") {
      return { ok: false, error: "missing_capabilities" };
    }
    const c = backend.capabilities();
    if (!c.safety || c.safety.hardware_validated === true) {
      // physical claim must be explicit elsewhere; sim always false
      if (c.flight_backend !== "simulation" && c.safety && c.safety.hardware_validated === true) {
        return { ok: false, error: "unverified_hardware_claim" };
      }
    }
    return { ok: true };
  }

  return { assertInterface };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = FlightBackendRegistry;
}
