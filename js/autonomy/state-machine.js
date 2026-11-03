/**
 * Conservative autonomy state machine.
 * Invalid transitions rejected. Safety may force FAILSAFE/FAULT.
 */
const AutonomyStateMachine = (() => {
  const { FlightMode, LEGAL_TRANSITIONS, FailsafeReason } = AutonomyTypes;

  function create(initial = FlightMode.DISARMED) {
    let mode = initial;
    let lastReason = FailsafeReason.NONE;
    const history = [];

    function canTransition(to) {
      const allowed = LEGAL_TRANSITIONS[mode] || [];
      return allowed.indexOf(to) >= 0;
    }

    function transition(to, reason) {
      if (to === mode) {
        return { ok: true, mode, noop: true };
      }
      if (!canTransition(to)) {
        return {
          ok: false,
          mode,
          error: "invalid_transition",
          from: mode,
          to,
          reason: reason || FailsafeReason.INVALID_TRANSITION,
        };
      }
      const from = mode;
      mode = to;
      lastReason = reason || FailsafeReason.NONE;
      history.push({ from, to, reason: lastReason, t: Date.now() });
      if (history.length > 64) history.shift();
      return { ok: true, mode, from, reason: lastReason };
    }

    /** Safety-forced transition: still must be legal, else escalate to FAULT if possible */
    function force(to, reason) {
      const r = transition(to, reason);
      if (r.ok) return r;
      if (mode !== FlightMode.FAULT && canTransition(FlightMode.FAULT)) {
        return transition(FlightMode.FAULT, reason || FailsafeReason.INVALID_TRANSITION);
      }
      return r;
    }

    return {
      get mode() {
        return mode;
      },
      get lastReason() {
        return lastReason;
      },
      get history() {
        return history.slice();
      },
      canTransition,
      transition,
      force,
    };
  }

  return { create, FlightMode, LEGAL_TRANSITIONS };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AutonomyStateMachine;
}
