/**
 * Deterministic simulation flight backend.
 * Software behaviors only — never claims hardware validation.
 */
const AutonomySimBackend = (() => {
  const { FlightMode, BackendType, emptyCapabilities } = AutonomyTypes;

  function create(opts = {}) {
    const caps = Object.assign(emptyCapabilities(), {
      attitude_estimation: true,
      altitude_hold: true,
      position_hold: true,
      waypoint_navigation: true,
      return_home: true,
      obstacle_avoidance: false,
    }, opts.capabilities || {});

    const sm = AutonomyStateMachine.create(FlightMode.DISARMED);
    const policy = Object.assign(AutonomyTypes.defaultSafetyPolicy(), opts.policy || {});

    let position = { north_m: 0, east_m: 0, down_m: 0 };
    let velocity = { north_m_s: 0, east_m_s: 0, down_m_s: 0 };
    let missionRt = null;
    let hostMs = 0;
    let sensorMs = 0;
    let linkAgeMs = 0;
    let batteryMv = opts.battery_mv != null ? opts.battery_mv : 11800;
    let backendHealthy = true;
    let watchdogOk = true;
    let sensorsValid = true;
    let hold = false;
    const speed_m_s = opts.speed_m_s != null ? opts.speed_m_s : 2.0;

    function capabilities() {
      return {
        aircraft_id: opts.aircraft_id || "SIM-0001",
        platform: "simulation",
        flight_backend: BackendType.SIMULATION,
        protocol_version: 1,
        autonomy_message_version: 1,
        capabilities: Object.assign({}, caps),
        safety: {
          supervisor_present: true,
          hardware_validated: false,
        },
      };
    }

    function sensorState() {
      return {
        valid: sensorsValid,
        timestamp_ms: sensorMs,
        position_ned: Object.assign({}, position),
        velocity_ned: Object.assign({}, velocity),
        battery_mv: batteryMv,
      };
    }

    function safetyInput() {
      return {
        host_ms: hostMs,
        sensors: { valid: sensorsValid, timestamp_ms: sensorMs },
        nav: { valid: true },
        position_ned: position,
        battery_mv: batteryMv,
        link_age_ms: linkAgeMs,
        backend_healthy: backendHealthy,
        watchdog_ok: watchdogOk,
      };
    }

    function runSafety() {
      const result = AutonomySafety.evaluate(safetyInput(), policy, caps, sm.mode);
      const applied = AutonomySafety.applyToMachine(sm, result);
      if (applied.hold) hold = true;
      if (result.clear) hold = false;
      return { result, applied };
    }

    function requestMode(to, reason) {
      const safety = runSafety();
      if (!safety.applied.allowMission && to === FlightMode.AUTONOMOUS) {
        return { ok: false, error: "safety_blocked", safety: safety.result, mode: sm.mode };
      }
      // Still allow transitions into safer modes
      return sm.transition(to, reason);
    }

    function armPreflight() {
      let r = sm.transition(FlightMode.PREFLIGHT);
      if (!r.ok) return r;
      return sm.transition(FlightMode.READY);
    }

    function loadMission(plan) {
      const v = AutonomyMission.validatePlan(plan, caps);
      if (!v.ok) return v;
      missionRt = AutonomyMission.createRuntime(plan);
      return { ok: true, mission: missionRt };
    }

    function startAutonomous() {
      const safety = runSafety();
      if (!safety.applied.allowMission) {
        return { ok: false, error: "safety_blocked", safety: safety.result, mode: sm.mode };
      }
      if (!missionRt || missionRt.aborted) {
        return { ok: false, error: "no_mission" };
      }
      if (sm.mode === FlightMode.DISARMED || sm.mode === FlightMode.PREFLIGHT) {
        const a = armPreflight();
        if (!a.ok) return a;
      }
      return sm.transition(FlightMode.AUTONOMOUS);
    }

    function pauseMission() {
      if (missionRt) AutonomyMission.pause(missionRt);
      return { ok: true, paused: true };
    }
    function resumeMission() {
      if (missionRt) AutonomyMission.resume(missionRt);
      return { ok: true, paused: false };
    }
    function abortMission() {
      if (missionRt) AutonomyMission.abort(missionRt);
      return sm.transition(FlightMode.LANDING, AutonomyTypes.FailsafeReason.OPERATOR_ABORT);
    }

    function requestReturnHome() {
      return sm.transition(FlightMode.RETURN_HOME);
    }

    function step(dt_s) {
      hostMs += Math.round(dt_s * 1000);
      sensorMs = hostMs; // sim sensors are fresh unless tests corrupt them
      const safety = runSafety();

      if (sm.mode === FlightMode.FAULT || sm.mode === FlightMode.DISARMED) {
        velocity = { north_m_s: 0, east_m_s: 0, down_m_s: 0 };
        return snapshot(safety);
      }

      if (sm.mode === FlightMode.FAILSAFE) {
        // soft hold in place
        velocity = { north_m_s: 0, east_m_s: 0, down_m_s: 0 };
        return snapshot(safety);
      }

      if (sm.mode === FlightMode.LANDING) {
        // descend toward down_m = 0 (ground in NED: down positive, home at 0)
        const targetDown = 0;
        const err = targetDown - position.down_m;
        velocity.down_m_s = Math.max(-1.0, Math.min(1.0, err));
        velocity.north_m_s = 0;
        velocity.east_m_s = 0;
        position.down_m += velocity.down_m_s * dt_s;
        if (Math.abs(position.down_m) < 0.05) {
          position.down_m = 0;
          sm.transition(FlightMode.LANDED);
        }
        return snapshot(safety);
      }

      if (sm.mode === FlightMode.RETURN_HOME) {
        const home = (missionRt && missionRt.home) || { north_m: 0, east_m: 0, down_m: -5 };
        moveToward(home, dt_s);
        if (AutonomyMission.distanceHorizontal(position, home) < 1.0) {
          sm.transition(FlightMode.LANDING);
        }
        return snapshot(safety);
      }

      if (sm.mode === FlightMode.AUTONOMOUS && missionRt && !hold) {
        if (!missionRt.paused && !missionRt.aborted && !missionRt.completed) {
          const wp = AutonomyMission.currentWaypoint(missionRt);
          if (wp) {
            moveToward(wp, dt_s);
            AutonomyMission.tick(missionRt, position);
          }
          if (missionRt.completed) {
            sm.transition(FlightMode.LANDING);
          }
        } else if (missionRt.paused) {
          // position hold
          velocity = { north_m_s: 0, east_m_s: 0, down_m_s: 0 };
        }
      }

      return snapshot(safety);
    }

    function moveToward(target, dt_s) {
      const dn = (target.north_m || 0) - position.north_m;
      const de = (target.east_m || 0) - position.east_m;
      const dd = (target.down_m || 0) - position.down_m;
      const dist = Math.sqrt(dn * dn + de * de + dd * dd) || 1;
      const step = Math.min(speed_m_s * dt_s, dist);
      position.north_m += (dn / dist) * step;
      position.east_m += (de / dist) * step;
      position.down_m += (dd / dist) * step;
      velocity.north_m_s = (dn / dist) * speed_m_s;
      velocity.east_m_s = (de / dist) * speed_m_s;
      velocity.down_m_s = (dd / dist) * speed_m_s;
    }

    function snapshot(safety) {
      return {
        mode: sm.mode,
        reason: sm.lastReason,
        position_ned: Object.assign({}, position),
        velocity_ned: Object.assign({}, velocity),
        mission: missionRt
          ? {
              index: missionRt.index,
              paused: missionRt.paused,
              aborted: missionRt.aborted,
              completed: missionRt.completed,
            }
          : null,
        safety: safety ? safety.result : null,
        capabilities: capabilities(),
        battery_mv: batteryMv,
        host_ms: hostMs,
        hardware_validated: false,
        backend: BackendType.SIMULATION,
      };
    }

    // Test injectors — never used as production sensor fabrication
    function _testSetBattery(mv) {
      batteryMv = mv;
    }
    function _testSetLinkAge(ms) {
      linkAgeMs = ms;
    }
    function _testSetSensorsValid(v) {
      sensorsValid = v;
    }
    function _testSetSensorStale() {
      sensorMs = hostMs - (policy.sensor_max_age_ms + 100);
    }
    function _testSetBackendHealthy(v) {
      backendHealthy = v;
    }
    function _testSetWatchdog(v) {
      watchdogOk = v;
    }
    function _testSetPosition(ned) {
      position = Object.assign({}, position, ned);
    }

    return {
      capabilities,
      sensorState,
      requestMode,
      armPreflight,
      loadMission,
      startAutonomous,
      pauseMission,
      resumeMission,
      abortMission,
      requestReturnHome,
      step,
      get mode() {
        return sm.mode;
      },
      get sm() {
        return sm;
      },
      _testSetBattery,
      _testSetLinkAge,
      _testSetSensorsValid,
      _testSetSensorStale,
      _testSetBackendHealthy,
      _testSetWatchdog,
      _testSetPosition,
    };
  }

  return { create };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AutonomySimBackend;
}
