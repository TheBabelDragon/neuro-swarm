/**
 * Separately versioned capability / autonomy status message.
 * Does NOT modify telemetry protocol v1 (44-byte frame).
 * JSON for ground app; binary optional later.
 */
const AutonomyCapabilityMessage = (() => {
  const MESSAGE_VERSION = 1;
  const MESSAGE_TYPE = "ns.autonomy.capability";

  function encode(report) {
    if (!report || report.aircraft_id == null) {
      return { ok: false, error: "missing_aircraft_id" };
    }
    const body = {
      message_type: MESSAGE_TYPE,
      message_version: MESSAGE_VERSION,
      aircraft_id: report.aircraft_id,
      platform: report.platform || "unknown",
      flight_backend: report.flight_backend || "none",
      protocol_version: report.protocol_version != null ? report.protocol_version : 1,
      capabilities: Object.assign(
        {
          attitude_estimation: false,
          altitude_hold: false,
          position_hold: false,
          waypoint_navigation: false,
          return_home: false,
          obstacle_avoidance: false,
        },
        report.capabilities || {}
      ),
      safety: Object.assign(
        {
          supervisor_present: true,
          hardware_validated: false,
        },
        report.safety || {}
      ),
      flight_mode: report.flight_mode || null,
      failsafe_reason: report.failsafe_reason || null,
      host_ms: report.host_ms != null ? report.host_ms : Date.now(),
    };
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
    if (!obj || obj.message_type !== MESSAGE_TYPE) {
      return { ok: false, error: "bad_type" };
    }
    if (obj.message_version !== MESSAGE_VERSION) {
      return { ok: false, error: "version_mismatch", version: obj.message_version };
    }
    if (obj.aircraft_id == null) return { ok: false, error: "missing_aircraft_id" };
    return { ok: true, report: obj };
  }

  return { MESSAGE_VERSION, MESSAGE_TYPE, encode, decode };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AutonomyCapabilityMessage;
}
