/**
 * Neuro-Swarm Autonomy Core — types & enums (hardware-independent).
 * Units and frames are explicit. No vendor-specific types.
 *
 * Coordinate frames (documentation):
 *  - NED: North-East-Down, meters, origin = home / mission origin
 *  - Body: forward-right-down relative to aircraft
 * Timestamps: always labeled by source (est_ms, sensor_ms, host_ms).
 */
const AutonomyTypes = (() => {
  const FlightMode = Object.freeze({
    DISARMED: "DISARMED",
    PREFLIGHT: "PREFLIGHT",
    READY: "READY",
    MANUAL: "MANUAL",
    ASSISTED: "ASSISTED",
    AUTONOMOUS: "AUTONOMOUS",
    RETURN_HOME: "RETURN_HOME",
    LANDING: "LANDING",
    LANDED: "LANDED",
    FAILSAFE: "FAILSAFE",
    FAULT: "FAULT",
  });

  const FailsafeReason = Object.freeze({
    NONE: "NONE",
    SENSOR_STALE: "SENSOR_STALE",
    SENSOR_INVALID: "SENSOR_INVALID",
    NAV_INVALID: "NAV_INVALID",
    CAPABILITY_MISSING: "CAPABILITY_MISSING",
    BATTERY_CRITICAL: "BATTERY_CRITICAL",
    BATTERY_WARNING: "BATTERY_WARNING",
    GEOFENCE: "GEOFENCE",
    MISSION_BOUNDS: "MISSION_BOUNDS",
    BACKEND_HEALTH: "BACKEND_HEALTH",
    LINK_LOSS: "LINK_LOSS",
    WATCHDOG: "WATCHDOG",
    OPERATOR_ABORT: "OPERATOR_ABORT",
    INVALID_TRANSITION: "INVALID_TRANSITION",
    UNKNOWN: "UNKNOWN",
  });

  const LinkLossPolicy = Object.freeze({
    HOLD: "HOLD",
    RETURN_HOME: "RETURN_HOME",
    LAND: "LAND",
    DISARM_REQUEST: "DISARM_REQUEST", // software signal only; no actuator in this milestone
  });

  const BackendType = Object.freeze({
    SIMULATION: "simulation",
    NATIVE: "native",
    EXTERNAL_FC: "external_fc",
    NONE: "none",
  });

  /** Legal transitions: from -> allowed set */
  const LEGAL_TRANSITIONS = Object.freeze({
    DISARMED: ["PREFLIGHT", "FAULT"],
    PREFLIGHT: ["READY", "DISARMED", "FAULT", "FAILSAFE"],
    READY: ["MANUAL", "ASSISTED", "AUTONOMOUS", "DISARMED", "FAULT", "FAILSAFE"],
    MANUAL: ["ASSISTED", "AUTONOMOUS", "LANDING", "DISARMED", "FAILSAFE", "FAULT"],
    ASSISTED: ["MANUAL", "AUTONOMOUS", "LANDING", "RETURN_HOME", "FAILSAFE", "FAULT"],
    AUTONOMOUS: ["ASSISTED", "MANUAL", "RETURN_HOME", "LANDING", "FAILSAFE", "FAULT"],
    RETURN_HOME: ["LANDING", "FAILSAFE", "FAULT", "AUTONOMOUS"],
    LANDING: ["LANDED", "FAILSAFE", "FAULT"],
    LANDED: ["DISARMED", "READY", "FAULT"],
    FAILSAFE: ["LANDING", "DISARMED", "FAULT", "READY"],
    FAULT: ["DISARMED"],
  });

  function emptyCapabilities() {
    return {
      attitude_estimation: false,
      altitude_hold: false,
      position_hold: false,
      waypoint_navigation: false,
      return_home: false,
      obstacle_avoidance: false,
    };
  }

  function defaultSafetyPolicy() {
    return {
      battery_warning_mv: 10800,
      battery_critical_mv: 10200,
      sensor_max_age_ms: 500,
      link_max_age_ms: 2000,
      link_loss_policy: LinkLossPolicy.RETURN_HOME,
      geofence_radius_m: 50,
      geofence_enabled: true,
      max_altitude_m: 30,
      min_altitude_m: 0,
    };
  }

  return {
    FlightMode,
    FailsafeReason,
    LinkLossPolicy,
    BackendType,
    LEGAL_TRANSITIONS,
    emptyCapabilities,
    defaultSafetyPolicy,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AutonomyTypes;
}
