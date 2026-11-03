/**
 * Autonomy status message v1 — separate from telemetry v1 binary frame.
 * Carries mode, failsafe reason, mission index, backend type.
 */
const AutonomyStatusMessage = (() => {
  const MESSAGE_VERSION = 1;
  const MESSAGE_TYPE = "ns.autonomy.status";

  function encode(s) {
    if (!s || s.aircraft_id == null) return { ok: false, error: "missing_aircraft_id" };
    const body = {
      message_type: MESSAGE_TYPE,
      message_version: MESSAGE_VERSION,
      aircraft_id: s.aircraft_id,
      flight_mode: s.flight_mode || "DISARMED",
      failsafe_reason: s.failsafe_reason || "NONE",
      mission_index: s.mission_index != null ? s.mission_index : null,
      mission_paused: !!s.mission_paused,
      mission_completed: !!s.mission_completed,
      mission_aborted: !!s.mission_aborted,
      backend: s.backend || "none",
      hardware_validated: false, // never trust caller to elevate
      actuators_enabled: false,
      host_ms: s.host_ms != null ? s.host_ms : Date.now(),
    };
    // Force safety claims off regardless of input
    body.hardware_validated = false;
    body.actuators_enabled = false;
    return { ok: true, json: body, text: JSON.stringify(body) };
  }

  function decode(textOrObj) {
    let obj = textOrObj;
    if (typeof textOrObj === "string") {
      try {
        obj = JSON.parse(textOrObj);
      } catch (e) {
        return { ok: false, error: "json_parse" };
      }
    }
    if (!obj || obj.message_type !== MESSAGE_TYPE) return { ok: false, error: "bad_type" };
    if (obj.message_version !== MESSAGE_VERSION)
      return { ok: false, error: "version_mismatch", version: obj.message_version };
    // Strip any elevated claims from untrusted sources
    obj.hardware_validated = false;
    obj.actuators_enabled = false;
    return { ok: true, status: obj };
  }

  return { MESSAGE_VERSION, MESSAGE_TYPE, encode, decode };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AutonomyStatusMessage;
}
