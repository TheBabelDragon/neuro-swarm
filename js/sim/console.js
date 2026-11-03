/**
 * Kinematic simulation console controller.
 * Simulation time independent of wall clock; speed is a pure multiplier.
 * Label: KINEMATIC SIMULATION — not aerodynamic fidelity.
 */
const SimConsole = (() => {
  function create(opts = {}) {
    const aircraft_id = opts.aircraft_id || "SIM-CONSOLE-1";
    const log = SimEventLog.create();
    let backend = AutonomySimBackend.create({
      aircraft_id,
      speed_m_s: opts.speed_m_s != null ? opts.speed_m_s : 4,
    });
    let engine = AutonomyEngine.create(backend);
    let injector = AutonomyFaultInject.wrap(backend);
    let sim_t = 0;
    let speed = 1;
    let paused = true;
    let running = false;
    let scenario = null;
    let missionVersion = 0;
    let loadedMission = null;
    let origin = null;
    let track = [];
    const model_label = "KINEMATIC SIMULATION";

    function rebuildBackend() {
      backend = AutonomySimBackend.create({
        aircraft_id,
        speed_m_s: opts.speed_m_s != null ? opts.speed_m_s : 4,
        policy: opts.policy,
      });
      engine = AutonomyEngine.create(backend);
      injector = AutonomyFaultInject.wrap(backend);
    }

    function loadGeoMission(mission) {
      const conv = GeoMission.toNedPlan(mission);
      if (!conv.ok) return conv;
      if (running && !paused && backend.mode === AutonomyTypes.FlightMode.AUTONOMOUS) {
        return { ok: false, error: "mission_in_progress_stop_first" };
      }
      const r = engine.gatedLoadMission(conv.plan);
      if (!r.ok) return r;
      loadedMission = mission;
      missionVersion = (mission.version || 1);
      origin = conv.origin;
      if (conv.plan.geofence_radius_m) {
        // policy already on backend; position checks use safety geofence
      }
      log.push({
        sim_t,
        type: "mission_loaded",
        aircraft_id,
        scenario_id: scenario && scenario.id,
        reason: mission.mission_id,
      });
      log.push({
        sim_t,
        type: "mission_validation",
        aircraft_id,
        reason: "ok",
      });
      return { ok: true, stats: conv.stats, origin };
    }

    function start() {
      const r = engine.gatedStartAutonomous();
      if (!r.ok) return r;
      running = true;
      paused = false;
      log.push({ sim_t, type: "sim_start", aircraft_id, scenario_id: scenario && scenario.id });
      return r;
    }

    function pause() {
      paused = true;
      backend.pauseMission();
      log.push({ sim_t, type: "pause", aircraft_id });
      return { ok: true };
    }

    function resume() {
      paused = false;
      backend.resumeMission();
      log.push({ sim_t, type: "resume", aircraft_id });
      return { ok: true };
    }

    function reset() {
      rebuildBackend();
      sim_t = 0;
      paused = true;
      running = false;
      track = [];
      if (scenario) SimScenarios.resetFaultFlags(scenario);
      log.push({ sim_t, type: "reset", aircraft_id, scenario_id: scenario && scenario.id });
      if (loadedMission) loadGeoMission(loadedMission);
      return { ok: true };
    }

    function abort() {
      const r = backend.abortMission();
      log.push({ sim_t, type: "abort", aircraft_id, reason: "operator" });
      return r;
    }

    function rth() {
      const r = backend.requestReturnHome();
      log.push({ sim_t, type: "return_home", aircraft_id });
      return r;
    }

    function setSpeed(s) {
      if (!(s > 0) || !Number.isFinite(s)) return { ok: false, error: "bad_speed" };
      speed = s;
      return { ok: true, speed };
    }

    function selectScenario(id) {
      const sc = SimScenarios.get(id);
      if (!sc) return { ok: false, error: "unknown_scenario" };
      scenario = JSON.parse(JSON.stringify(sc));
      SimScenarios.resetFaultFlags(scenario);
      log.push({ sim_t, type: "scenario_select", aircraft_id, scenario_id: id });
      return { ok: true, scenario };
    }

    function stepFixed(dt_s) {
      if (paused) return snapshot();
      const dt = dt_s * speed;
      const prevMode = backend.mode;
      if (scenario) SimScenarios.tickFault(scenario, sim_t, injector, log, aircraft_id);
      if (scenario && scenario.fault && scenario.fault.type === "operator_abort" && scenario.fault._applied && !scenario.fault._abortDone) {
        scenario.fault._abortDone = true;
        backend.abortMission();
      }
      const snap = engine.step(dt);
      sim_t += dt;
      if (snap.mode !== prevMode) {
        log.push({
          sim_t,
          type: "mode_transition",
          aircraft_id,
          scenario_id: scenario && scenario.id,
          from: prevMode,
          to: snap.mode,
          reason: snap.reason,
        });
      }
      if (origin && snap.position_ned) {
        const g = GeoCoords.nedToGeo(origin, snap.position_ned);
        if (g.ok) {
          track.push({ t: sim_t, lat: g.lat, lon: g.lon, alt_m: g.alt_m });
          if (track.length > 2000) track.shift();
        }
      }
      return snapshot();
    }

    function snapshot() {
      const st = engine.status();
      const snap = st.snapshot || {};
      let geo = null;
      if (origin && snap.position_ned) {
        const g = GeoCoords.nedToGeo(origin, snap.position_ned);
        if (g.ok) geo = g;
      }
      return {
        model_label,
        sim_t,
        speed,
        paused,
        running,
        mode: backend.mode,
        reason: st.reason,
        position_ned: snap.position_ned,
        position_geo: geo,
        battery_mv: snap.battery_mv,
        mission: snap.mission,
        safety: snap.safety,
        track: track.slice(),
        origin,
        mission_version: missionVersion,
        scenario_id: scenario && scenario.id,
        events: log.list(),
        actuators_enabled: false,
        hardware_validated: false,
        aircraft_id,
      };
    }

    function getInjector() {
      return injector;
    }

    return {
      model_label,
      loadGeoMission,
      start,
      pause,
      resume,
      reset,
      abort,
      rth,
      setSpeed,
      selectScenario,
      stepFixed,
      snapshot,
      getInjector,
      get engine() {
        return engine;
      },
      get backend() {
        return backend;
      },
      get log() {
        return log;
      },
    };
  }

  return { create };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SimConsole;
}
