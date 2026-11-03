/**
 * Host mock of external flight-controller adapter.
 * Vendor-agnostic; rejects nav until configured and never claims validation.
 */
const AutonomyExternalFcMock = (() => {
  const { BackendType, emptyCapabilities, FlightMode } = AutonomyTypes;

  function create(opts = {}) {
    let connected = !!opts.connected;
    let configured = !!opts.configured;

    function capabilities() {
      return {
        aircraft_id: opts.aircraft_id || "NS-FC-MOCK",
        platform: "external_fc",
        flight_backend: BackendType.EXTERNAL_FC,
        protocol_version: 1,
        autonomy_message_version: 1,
        capabilities: emptyCapabilities(), // unknown until FC reports — do not invent
        safety: {
          supervisor_present: true,
          hardware_validated: false,
        },
        adapter: { connected, configured },
      };
    }

    function pollStatus() {
      if (!configured) {
        return {
          ok: false,
          connected: false,
          armed: false,
          failsafe: false,
          backend_healthy: false,
        };
      }
      return {
        ok: true,
        connected,
        armed: false,
        failsafe: false,
        backend_healthy: connected,
        mode: FlightMode.DISARMED,
      };
    }

    function requestNav() {
      if (!configured || !connected) {
        return { ack: "UNAVAILABLE", actuators_enabled: false };
      }
      // Even when connected, this milestone does not delegate actuators
      return { ack: "REJECTED", reason: "actuator_path_disabled", actuators_enabled: false };
    }

    return {
      capabilities,
      pollStatus,
      requestNav,
      setConnected(v) {
        connected = !!v;
      },
      setConfigured(v) {
        configured = !!v;
      },
    };
  }

  return { create };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AutonomyExternalFcMock;
}
