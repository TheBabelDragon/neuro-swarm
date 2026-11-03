/**
 * Host mock of ESP32-S3 native backend boundary.
 * Capabilities follow config only. Never actuators. hardware_validated always false.
 */
const AutonomyNativeBackendMock = (() => {
  const { BackendType, emptyCapabilities, FlightMode } = AutonomyTypes;

  function create(hwConfig = {}) {
    const cfg = Object.assign(
      {
        configured: false,
        imu_present: false,
        baro_present: false,
        gnss_present: false,
        battery_adc_present: false,
        radio_present: false,
      },
      hwConfig
    );

    function deriveCaps() {
      const c = emptyCapabilities();
      if (!cfg.configured) return c;
      if (cfg.imu_present) c.attitude_estimation = true;
      if (cfg.imu_present && cfg.baro_present) c.altitude_hold = true;
      if (cfg.imu_present && cfg.baro_present && cfg.gnss_present) {
        c.position_hold = true;
        c.waypoint_navigation = true;
        c.return_home = true;
      }
      return c;
    }

    function capabilities() {
      return {
        aircraft_id: hwConfig.aircraft_id || "NS-S3-MOCK",
        platform: "esp32-s3",
        flight_backend: BackendType.NATIVE,
        protocol_version: 1,
        autonomy_message_version: 1,
        capabilities: deriveCaps(),
        safety: {
          supervisor_present: true,
          hardware_validated: false,
        },
        hw_config: Object.assign({}, cfg),
      };
    }

    /** Native mock does not run a mission loop — use sim backend for that. */
    function isOperational() {
      return false; // not operational until validated hardware path exists
    }

    function requestNav() {
      return { ok: false, error: "native_backend_not_operational", actuators_enabled: false };
    }

    return {
      capabilities,
      isOperational,
      requestNav,
      mode: FlightMode.DISARMED,
      configure(next) {
        Object.assign(cfg, next);
        return capabilities();
      },
    };
  }

  return { create };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AutonomyNativeBackendMock;
}
