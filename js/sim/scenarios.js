/**
 * Deterministic scenario definitions for kinematic simulation.
 * Fault timing uses simulation time (seconds), not wall clock.
 */
const SimScenarios = (() => {
  const catalog = [
    { id: "normal_waypoints", name: "Normal waypoint mission", seed: 1 },
    { id: "link_loss", name: "Ground-link loss", seed: 2, fault: { at_s: 8, type: "link_loss" } },
    { id: "stale_imu", name: "Stale IMU", seed: 3, fault: { at_s: 6, type: "sensor_stale" } },
    { id: "gnss_loss", name: "GNSS loss (sensor invalid)", seed: 4, fault: { at_s: 7, type: "sensor_invalid" } },
    { id: "low_battery", name: "Low battery", seed: 5, fault: { at_s: 10, type: "battery_critical" } },
    { id: "geofence_breach", name: "Geofence breach", seed: 6, fault: { at_s: 5, type: "geofence" } },
    { id: "backend_fail", name: "Backend failure", seed: 7, fault: { at_s: 4, type: "backend" } },
    { id: "watchdog", name: "Watchdog failure", seed: 8, fault: { at_s: 3, type: "watchdog" } },
    { id: "sensor_recovery", name: "Sensor recovery", seed: 9, fault: { at_s: 5, type: "sensor_invalid", clear_at_s: 12 } },
    { id: "abort_rth", name: "Mission abort and RTH", seed: 10, fault: { at_s: 9, type: "operator_abort" } },
  ];

  function list() {
    return catalog.map((c) => ({ id: c.id, name: c.name, seed: c.seed }));
  }

  function get(id) {
    return catalog.find((c) => c.id === id) || null;
  }

  /**
   * Apply scenario fault at sim time using TEST-ONLY injector.
   */
  function tickFault(scenario, sim_t, injector, log, aircraft_id) {
    if (!scenario || !scenario.fault || !injector) return;
    const f = scenario.fault;
    if (f._applied && !f.clear_at_s) return;
    if (!f._applied && sim_t >= f.at_s) {
      f._applied = true;
      if (f.type === "link_loss") injector.setLinkAge(5000);
      if (f.type === "sensor_stale") injector.setSensorStale();
      if (f.type === "sensor_invalid") injector.setSensorsValid(false);
      if (f.type === "battery_critical") injector.setBattery(9000);
      if (f.type === "geofence") injector.setPosition({ north_m: 2000, east_m: 0, down_m: -20 });
      if (f.type === "backend") injector.setBackendHealthy(false);
      if (f.type === "watchdog") injector.setWatchdog(false);
      if (f.type === "operator_abort") {
        /* handled by console calling abort */
      }
      if (log) {
        log.push({
          sim_t,
          type: "fault_inject",
          aircraft_id,
          scenario_id: scenario.id,
          reason: f.type,
        });
      }
    }
    if (f.clear_at_s && f._applied && !f._cleared && sim_t >= f.clear_at_s) {
      f._cleared = true;
      if (f.type === "sensor_invalid") {
        injector.setSensorsValid(true);
        injector.clearSensorFreeze();
      }
      if (log) {
        log.push({
          sim_t,
          type: "fault_clear",
          aircraft_id,
          scenario_id: scenario.id,
          reason: f.type,
        });
      }
    }
  }

  function resetFaultFlags(scenario) {
    if (scenario && scenario.fault) {
      scenario.fault._applied = false;
      scenario.fault._cleared = false;
    }
  }

  return { list, get, tickFault, resetFaultFlags };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SimScenarios;
}
