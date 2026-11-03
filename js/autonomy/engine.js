/**
 * Autonomy engine — single gate for mode/mission requests.
 * Safety supervisor always evaluates before mission authority applies.
 * Physical actuator paths are not exposed here.
 *
 * Recovery NEVER clears sensors, watchdog, backend health, or link age.
 * Operator acknowledgement is required but not sufficient.
 */
const AutonomyEngine = (() => {
  const { FlightMode, FailsafeReason } = AutonomyTypes;

  function create(backend, opts = {}) {
    if (!backend) throw new Error("backend_required");
    const requireOperatorAck = opts.requireOperatorAck !== false;
    let operatorAckClear = false;

    function evaluateSafety() {
      if (typeof backend.runSafety === "function") return backend.runSafety();
      if (typeof backend.step === "function") {
        const snap = backend.step(0);
        return {
          result: snap.safety,
          applied: {
            allowMission:
              snap.mode !== FlightMode.FAILSAFE && snap.mode !== FlightMode.FAULT,
          },
        };
      }
      return {
        result: { clear: true, reason: FailsafeReason.NONE },
        applied: { allowMission: true },
      };
    }

    function acknowledgeClear() {
      operatorAckClear = true;
      return { ok: true };
    }

    /**
     * Attempt recovery from FAILSAFE/FAULT/LANDED when conditions allow.
     * Does not manufacture healthy conditions. Does not arm or enable actuators.
     * Does not resume missions.
     */
    function attemptRecovery(targetMode) {
      const to = targetMode || FlightMode.DISARMED;
      if (to !== FlightMode.DISARMED && to !== FlightMode.READY) {
        return { ok: false, error: "recovery_target_restricted" };
      }
      const mode = backend.mode;
      if (
        mode !== FlightMode.FAILSAFE &&
        mode !== FlightMode.FAULT &&
        mode !== FlightMode.LANDED
      ) {
        return { ok: false, error: "not_in_recoverable_mode", mode };
      }
      if (mode === FlightMode.FAULT && to !== FlightMode.DISARMED) {
        return { ok: false, error: "fault_only_to_disarmed" };
      }
      if (requireOperatorAck && !operatorAckClear) {
        return { ok: false, error: "operator_ack_required" };
      }

      // Observe only — never call test injectors or clear faults here
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
        return {
          ok: false,
          error: "safety_blocked",
          safety: safety.result,
          mode: backend.mode,
        };
      }
      return backend.startAutonomous();
    }

    function gatedLoadMission(plan) {
      if (backend.mode === FlightMode.FAULT) {
        return { ok: false, error: "fault_state" };
      }
      if (
        backend.mode === FlightMode.AUTONOMOUS ||
        backend.mode === FlightMode.RETURN_HOME ||
        backend.mode === FlightMode.LANDING
      ) {
        return { ok: false, error: "mission_in_progress_stop_first" };
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
        hardware_validated: false,
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
