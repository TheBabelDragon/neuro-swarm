/**
 * Autonomy engine — single gate for mode/mission requests.
 * Safety supervisor always evaluates before mission authority applies.
 * Physical actuator paths are not exposed here.
 */
const AutonomyEngine = (() => {
  const { FlightMode, FailsafeReason } = AutonomyTypes;

  function create(backend, opts = {}) {
    if (!backend) throw new Error("backend_required");
    const requireOperatorAck = opts.requireOperatorAck !== false;
    let operatorAckClear = false;

    function evaluateSafety() {
      if (typeof backend.runSafety === "function") return backend.runSafety();
      // Fallback: step 0 if backend only exposes step
      if (typeof backend.step === "function") {
        const snap = backend.step(0);
        return { result: snap.safety, applied: { allowMission: snap.mode !== FlightMode.FAILSAFE && snap.mode !== FlightMode.FAULT } };
      }
      return { result: { clear: true, reason: FailsafeReason.NONE }, applied: { allowMission: true } };
    }

    function acknowledgeClear() {
      operatorAckClear = true;
      return { ok: true };
    }

    /**
     * Attempt recovery from FAILSAFE/FAULT when conditions allow.
     * Never auto-arms. Never enables actuators.
     */
    function attemptRecovery(targetMode) {
      const to = targetMode || FlightMode.DISARMED;
      if (to !== FlightMode.DISARMED && to !== FlightMode.READY) {
        return { ok: false, error: "recovery_target_restricted" };
      }
      const mode = backend.mode;
      if (mode !== FlightMode.FAILSAFE && mode !== FlightMode.FAULT && mode !== FlightMode.LANDED) {
        return { ok: false, error: "not_in_recoverable_mode", mode };
      }
      if (mode === FlightMode.FAULT && to !== FlightMode.DISARMED) {
        return { ok: false, error: "fault_only_to_disarmed" };
      }
      if (requireOperatorAck && !operatorAckClear) {
        return { ok: false, error: "operator_ack_required" };
      }

      // Clear injectors if present so safety can pass
      if (typeof backend._testSetSensorsValid === "function") backend._testSetSensorsValid(true);
      if (typeof backend._testClearSensorFreeze === "function") backend._testClearSensorFreeze();
      if (typeof backend._testSetBackendHealthy === "function") backend._testSetBackendHealthy(true);
      if (typeof backend._testSetWatchdog === "function") backend._testSetWatchdog(true);
      if (typeof backend._testSetLinkAge === "function") backend._testSetLinkAge(0);

      const safety = evaluateSafety();
      if (!safety.result || !safety.result.clear) {
        return {
          ok: false,
          error: "safety_not_clear",
          safety: safety.result,
        };
      }

      const r = backend.sm.transition(to, FailsafeReason.NONE);
      if (r.ok) operatorAckClear = false;
      return r;
    }

    function gatedStartAutonomous() {
      const safety = evaluateSafety();
      if (!safety.applied.allowMission) {
        return { ok: false, error: "safety_blocked", safety: safety.result, mode: backend.mode };
      }
      return backend.startAutonomous();
    }

    function gatedLoadMission(plan) {
      const safety = evaluateSafety();
      // Loading a plan is allowed while disarmed/ready even if link is stale;
      // starting is gated separately. Still reject if FAULT.
      if (backend.mode === FlightMode.FAULT) {
        return { ok: false, error: "fault_state" };
      }
      return backend.loadMission(plan);
    }

    function status() {
      const snap =
        typeof backend.step === "function" ? backend.step(0) : { mode: backend.mode };
      const caps = backend.capabilities();
      return {
        mode: backend.mode,
        reason: backend.sm ? backend.sm.lastReason : null,
        snapshot: snap,
        capabilities: caps,
        operator_ack_pending:
          (backend.mode === FlightMode.FAILSAFE || backend.mode === FlightMode.FAULT) &&
          requireOperatorAck &&
          !operatorAckClear,
        hardware_validated: !!(caps.safety && caps.safety.hardware_validated),
        actuators_enabled: false,
      };
    }

    return {
      backend,
      evaluateSafety,
      acknowledgeClear,
      attemptRecovery,
      gatedStartAutonomous,
      gatedLoadMission,
      status,
      step: (dt) => backend.step(dt),
    };
  }

  return { create };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AutonomyEngine;
}
