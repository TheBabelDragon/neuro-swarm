/** Sim console determinism and scenarios. */
const assert = require("assert");
const path = require("path");
const fs = require("fs");

function loadAs(rel, exportName, deps = {}) {
  const code = fs.readFileSync(path.join(__dirname, "../..", rel), "utf8");
  const wrapped = code.replace(/if \(typeof module[\s\S]*$/, "");
  const depNames = Object.keys(deps);
  const depValues = depNames.map((k) => deps[k]);
  const fn = new Function(
    ...depNames,
    "globalThis",
    wrapped +
      "; globalThis." +
      exportName +
      " = " +
      exportName +
      "; return " +
      exportName +
      ";"
  );
  return fn(...depValues, globalThis);
}

const AutonomyTypes = loadAs("js/autonomy/types.js", "AutonomyTypes");
const AutonomyStateMachine = loadAs("js/autonomy/state-machine.js", "AutonomyStateMachine", {
  AutonomyTypes,
});
const AutonomySafety = loadAs("js/autonomy/safety.js", "AutonomySafety", { AutonomyTypes });
const AutonomyMission = loadAs("js/autonomy/mission.js", "AutonomyMission");
const AutonomySimBackend = loadAs("js/autonomy/sim-backend.js", "AutonomySimBackend", {
  AutonomyTypes,
  AutonomyStateMachine,
  AutonomySafety,
  AutonomyMission,
});
const AutonomyEngine = loadAs("js/autonomy/engine.js", "AutonomyEngine", { AutonomyTypes });
const AutonomyFaultInject = loadAs("js/autonomy/fault-inject.js", "AutonomyFaultInject");
const GeoCoords = loadAs("js/geo/coords.js", "GeoCoords");
const GeoMission = loadAs("js/geo/mission.js", "GeoMission", { GeoCoords });
const SimEventLog = loadAs("js/sim/event-log.js", "SimEventLog");
const SimScenarios = loadAs("js/sim/scenarios.js", "SimScenarios");
const SimConsole = loadAs("js/sim/console.js", "SimConsole", {
  AutonomyTypes,
  AutonomySimBackend,
  AutonomyEngine,
  AutonomyFaultInject,
  GeoCoords,
  GeoMission,
  SimEventLog,
  SimScenarios,
});
const MapProvider = loadAs("js/map/provider.js", "MapProvider");

let passed = 0;
function ok(n) {
  passed++;
  console.log("  ok —", n);
}

console.log("sim console tests");

{
  const c = SimConsole.create();
  const m = GeoMission.exampleMission();
  assert.strictEqual(c.loadGeoMission(m).ok, true);
  assert.strictEqual(c.start().ok, true);
  for (let i = 0; i < 30; i++) c.stepFixed(0.2);
  const s = c.snapshot();
  assert.ok(s.sim_t > 0);
  assert.strictEqual(s.actuators_enabled, false);
  assert.strictEqual(s.model_label, "KINEMATIC SIMULATION");
  ok("load start step kinematic");
}

{
  const c = SimConsole.create();
  c.loadGeoMission(GeoMission.exampleMission());
  c.start();
  c.pause();
  const t1 = c.snapshot().sim_t;
  c.stepFixed(1);
  assert.strictEqual(c.snapshot().sim_t, t1);
  c.resume();
  c.stepFixed(1);
  assert.ok(c.snapshot().sim_t > t1);
  ok("pause resume sim time");
}

{
  const c = SimConsole.create();
  c.setSpeed(2);
  c.loadGeoMission(GeoMission.exampleMission());
  c.start();
  c.stepFixed(1);
  assert.ok(Math.abs(c.snapshot().sim_t - 2) < 1e-6);
  ok("simulation speed multiplier");
}

{
  const c = SimConsole.create();
  c.loadGeoMission(GeoMission.exampleMission());
  c.selectScenario("low_battery");
  c.start();
  for (let i = 0; i < 80; i++) c.stepFixed(0.2);
  const modes = c.log.list().filter((e) => e.type === "mode_transition" || e.type === "fault_inject");
  assert.ok(modes.length >= 1);
  ok("scenario fault injection logs events");
}

{
  const cfg = MapProvider.config();
  assert.ok(cfg.styleUrl.indexOf("openfreemap") >= 0);
  assert.strictEqual(MapProvider.MAPLIBRE_VERSION, "6.16.0");
  ok("map provider default OpenFreeMap + pinned MapLibre");
}

{
  const bad = { origin: { lat: 0, lon: 0 }, waypoints: [] };
  const c = SimConsole.create();
  assert.strictEqual(c.loadGeoMission(bad).ok, false);
  ok("invalid mission rejected");
}

console.log("\n" + passed + " passed");
