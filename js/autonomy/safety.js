/**
 * Independent safety supervisor.
 * Outranks mission and swarm authority. Never fabricates sensors.
 */
const AutonomySafety = (() => {
  const { FailsafeReason, FlightMode, LinkLossPolicy } = AutonomyTypes;

  /**
   * @param {object} input
   * @param {object} policy from defaultSafetyPolicy()
   * @param {object} capabilities
   * @param {string} currentMode
   * @returns {{ action: string|null, reason: string, details: object }}
   */
  function evaluate(input, policy, capabilities, currentMode) {
    const details = {};
    const now = input.host_ms != null ? input.host_ms : Date.now();

    // Backend health
    if (input.backend_healthy === false) {
      return act("FAILSAFE", FailsafeReason.BACKEND_HEALTH, details);
    }

    // Watchdog
    if (input.watchdog_ok === false) {
      return act("FAULT", FailsafeReason.WATCHDOG, details);
    }

    // Sensors
    const sensors = input.sensors || {};
    if (sensors.valid === false) {
      return act("FAILSAFE", FailsafeReason.SENSOR_INVALID, details);
    }
    if (sensors.timestamp_ms != null) {
      const age = now - sensors.timestamp_ms;
      details.sensor_age_ms = age;
      if (age > policy.sensor_max_age_ms) {
        return act("FAILSAFE", FailsafeReason.SENSOR_STALE, details);
      }
    }

    // Navigation validity when in autonomous-ish modes
    const navModes = [
      FlightMode.AUTONOMOUS,
      FlightMode.RETURN_HOME,
      FlightMode.ASSISTED,
      FlightMode.LANDING,
    ];
    if (navModes.indexOf(currentMode) >= 0) {
      if (input.nav && input.nav.valid === false) {
        return act("FAILSAFE", FailsafeReason.NAV_INVALID, details);
      }
    }

    // Capability gates for autonomous ops
    if (currentMode === FlightMode.AUTONOMOUS) {
      if (!capabilities.waypoint_navigation && !capabilities.position_hold) {
        return act("FAILSAFE", FailsafeReason.CAPABILITY_MISSING, details);
      }
    }
    if (currentMode === FlightMode.RETURN_HOME && !capabilities.return_home) {
      return act("FAILSAFE", FailsafeReason.CAPABILITY_MISSING, details);
    }

    // Battery
    if (input.battery_mv != null) {
      details.battery_mv = input.battery_mv;
      if (input.battery_mv <= policy.battery_critical_mv) {
        return act("FAILSAFE", FailsafeReason.BATTERY_CRITICAL, details);
      }
      // warning does not force failsafe by itself — reported only
      if (input.battery_mv <= policy.battery_warning_mv) {
        details.battery_warning = true;
      }
    }

    // Geofence (NED horizontal radius from home)
    if (policy.geofence_enabled && input.position_ned) {
      const n = input.position_ned.north_m || 0;
      const e = input.position_ned.east_m || 0;
      const r = Math.sqrt(n * n + e * e);
      details.geofence_radius_m = r;
      if (r > policy.geofence_radius_m) {
        return act("FAILSAFE", FailsafeReason.GEOFENCE, details);
      }
      const alt = -(input.position_ned.down_m || 0); // up positive altitude
      details.altitude_m = alt;
      if (alt > policy.max_altitude_m || alt < policy.min_altitude_m) {
        return act("FAILSAFE", FailsafeReason.MISSION_BOUNDS, details);
      }
    }

    // Link loss
    if (input.link_age_ms != null && input.link_age_ms > policy.link_max_age_ms) {
      details.link_age_ms = input.link_age_ms;
      details.link_loss_policy = policy.link_loss_policy;
      // Do not continue mission on link loss — request policy action
      if (policy.link_loss_policy === LinkLossPolicy.RETURN_HOME) {
        return act("RETURN_HOME", FailsafeReason.LINK_LOSS, details);
      }
      if (policy.link_loss_policy === LinkLossPolicy.LAND) {
        return act("LANDING", FailsafeReason.LINK_LOSS, details);
      }
      if (policy.link_loss_policy === LinkLossPolicy.HOLD) {
        return act("HOLD", FailsafeReason.LINK_LOSS, details);
      }
      return act("FAILSAFE", FailsafeReason.LINK_LOSS, details);
    }

    return {
      action: null,
      reason: FailsafeReason.NONE,
      details,
      clear: true,
    };
  }

  function act(action, reason, details) {
    return { action, reason, details, clear: false };
  }

  /**
   * Apply safety result onto state machine. Mission requests must call this first.
   * Returns whether mission may proceed.
   */
  function applyToMachine(sm, safetyResult) {
    if (!safetyResult || safetyResult.clear) {
      return { allowMission: true, transition: null };
    }
    const { action, reason } = safetyResult;
    if (action === "FAILSAFE") {
      return { allowMission: false, transition: sm.force(FlightMode.FAILSAFE, reason) };
    }
    if (action === "FAULT") {
      return { allowMission: false, transition: sm.force(FlightMode.FAULT, reason) };
    }
    if (action === "RETURN_HOME") {
      return { allowMission: false, transition: sm.force(FlightMode.RETURN_HOME, reason) };
    }
    if (action === "LANDING") {
      return { allowMission: false, transition: sm.force(FlightMode.LANDING, reason) };
    }
    if (action === "HOLD") {
      // stay in mode but block mission advance
      return { allowMission: false, transition: null, hold: true, reason };
    }
    return { allowMission: false, transition: null };
  }

  return { evaluate, applyToMachine };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AutonomySafety;
}
