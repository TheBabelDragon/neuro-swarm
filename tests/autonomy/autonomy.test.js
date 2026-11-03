/**
 * Host autonomy foundation tests.
 * Run: node tests/autonomy/autonomy.test.js
 */
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
const AutonomyCapabilityMessage = loadAs(
  "js/autonomy/capability-message.js",
  "AutonomyCapabilityMessage"
);

// Existing telemetry still loads
const TelemetrySchema = loadAs("js/telemetry/schema.js", "TelemetrySchema");

let passed = 0;
function ok(name) {
  passed++;
  console.log("  ok —", name);
}

const { FlightMode, FailsafeReason } = AutonomyTypes;

console.log("autonomy foundation tests");

// State transitions
{
  const sm = AutonomyStateMachine.create();
  assert.strictEqual(sm.mode, FlightMode.DISARMED);
  assert.strictEqual(sm.transition(FlightMode.AUTONOMOUS).ok, false);
  assert.strictEqual(sm.transition(FlightMode.PREFLIGHT).ok, true);
  assert.strictEqual(sm.transition(FlightMode.READY).ok, true);
  assert.strictEqual(sm.transition(FlightMode.AUTONOMOUS).ok, true);
  ok("legal transitions");
}

// Invalid rejection
{
  const sm = AutonomyStateMachine.create(FlightMode.LANDED);
  const r = sm.transition(FlightMode.AUTONOMOUS);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, "invalid_transition");
  ok("invalid transition rejected");
}

// Mission validation
{
  const caps = AutonomyTypes.emptyCapabilities();
  caps.waypoint_navigation = true;
  caps.position_hold = true;
  const bad = AutonomyMission.validatePlan({ waypoints: [] }, caps);
  assert.strictEqual(bad.ok, false);
  const good = AutonomyMission.validatePlan(
    {
      waypoints: [
        { north_m: 0, east_m: 0, down_m: -5 },
        { north_m: 10, east_m: 0, down_m: -5 },
      ],
    },
    caps
  );
  assert.strictEqual(good.ok, true);
  ok("mission validation");
}

// Missing capabilities
{
  const caps = AutonomyTypes.emptyCapabilities();
  const r = AutonomyMission.validatePlan(
    { waypoints: [{ north_m: 1, east_m: 0, down_m: -3 }] },
    caps
  );
  assert.strictEqual(r.ok, false);
  ok("missing capabilities block mission");
}

// Waypoint progression deterministic
{
  const backend = AutonomySimBackend.create({ speed_m_s: 5 });
  backend.armPreflight();
  backend.loadMission({
    waypoints: [
      { north_m: 0, east_m: 0, down_m: -5, acceptance_radius_m: 2 },
      { north_m: 10, east_m: 0, down_m: -5, acceptance_radius_m: 2 },
    ],
    home_ned: { north_m: 0, east_m: 0, down_m: 0 },
  });
  assert.strictEqual(backend.startAutonomous().ok, true);
  for (let i = 0; i < 200; i++) backend.step(0.1);
  const snap = backend.step(0.1);
  assert.ok(
    snap.mission.completed || snap.mode === FlightMode.LANDING || snap.mode === FlightMode.LANDED
  );
  ok("waypoint progression / mission completion");
}

// Pause resume abort
{
  const backend = AutonomySimBackend.create({ speed_m_s: 2 });
  backend.armPreflight();
  backend.loadMission({
    waypoints: [{ north_m: 100, east_m: 0, down_m: -5, acceptance_radius_m: 2 }],
  });
  backend.startAutonomous();
  backend.pauseMission();
  const p1 = backend.step(0.5).position_ned.north_m;
  const p2 = backend.step(0.5).position_ned.north_m;
  assert.ok(Math.abs(p2 - p1) < 0.01);
  backend.resumeMission();
  backend.step(0.5);
  backend.abortMission();
  assert.strictEqual(backend.mode, FlightMode.LANDING);
  ok("pause resume abort");
}

// Capability discovery message
{
  const backend = AutonomySimBackend.create({ aircraft_id: "SIM-9" });
  const enc = AutonomyCapabilityMessage.encode(
    Object.assign(backend.capabilities(), { flight_mode: backend.mode })
  );
  assert.strictEqual(enc.ok, true);
  const dec = AutonomyCapabilityMessage.decode(enc.text);
  assert.strictEqual(dec.ok, true);
  assert.strictEqual(dec.report.aircraft_id, "SIM-9");
  assert.strictEqual(dec.report.safety.hardware_validated, false);
  ok("capability discovery encode/decode");
}

// Stale sensors -> failsafe
{
  const backend = AutonomySimBackend.create();
  backend.armPreflight();
  backend.loadMission({
    waypoints: [{ north_m: 5, east_m: 0, down_m: -3 }],
  });
  backend.startAutonomous();
  backend._testSetSensorStale();
  backend.step(0.1);
  assert.strictEqual(backend.mode, FlightMode.FAILSAFE);
  assert.strictEqual(backend.sm.lastReason, FailsafeReason.SENSOR_STALE);
  ok("stale sensors failsafe");
}

// Invalid sensors
{
  const backend = AutonomySimBackend.create();
  backend.armPreflight();
  backend.startAutonomous();
  // no mission -> may fail start; force mode via READY then inject
  backend.requestMode(FlightMode.MANUAL);
  backend._testSetSensorsValid(false);
  backend.step(0.1);
  assert.strictEqual(backend.mode, FlightMode.FAILSAFE);
  ok("invalid sensors failsafe");
}

// Geofence
{
  const backend = AutonomySimBackend.create({
    policy: { geofence_radius_m: 5, geofence_enabled: true },
  });
  backend.armPreflight();
  backend.requestMode(FlightMode.MANUAL);
  backend._testSetPosition({ north_m: 20, east_m: 0, down_m: -5 });
  backend.step(0.1);
  assert.strictEqual(backend.mode, FlightMode.FAILSAFE);
  assert.strictEqual(backend.sm.lastReason, FailsafeReason.GEOFENCE);
  ok("geofence violation");
}

// Battery critical
{
  const backend = AutonomySimBackend.create();
  backend.armPreflight();
  backend.requestMode(FlightMode.MANUAL);
  backend._testSetBattery(9000);
  backend.step(0.1);
  assert.strictEqual(backend.mode, FlightMode.FAILSAFE);
  assert.strictEqual(backend.sm.lastReason, FailsafeReason.BATTERY_CRITICAL);
  ok("battery critical policy");
}

// Link loss -> return home policy
{
  const backend = AutonomySimBackend.create({
    policy: { link_loss_policy: AutonomyTypes.LinkLossPolicy.RETURN_HOME, link_max_age_ms: 500 },
  });
  backend.armPreflight();
  backend.loadMission({
    waypoints: [{ north_m: 10, east_m: 0, down_m: -5 }],
    home_ned: { north_m: 0, east_m: 0, down_m: 0 },
  });
  backend.startAutonomous();
  backend._testSetLinkAge(5000);
  backend.step(0.1);
  assert.strictEqual(backend.mode, FlightMode.RETURN_HOME);
  assert.strictEqual(backend.sm.lastReason, FailsafeReason.LINK_LOSS);
  ok("link-loss return home");
}

// Backend failure
{
  const backend = AutonomySimBackend.create();
  backend.armPreflight();
  backend.requestMode(FlightMode.MANUAL);
  backend._testSetBackendHealthy(false);
  backend.step(0.1);
  assert.strictEqual(backend.mode, FlightMode.FAILSAFE);
  ok("backend failure failsafe");
}

// Watchdog -> fault
{
  const backend = AutonomySimBackend.create();
  backend.armPreflight();
  backend.requestMode(FlightMode.MANUAL);
  backend._testSetWatchdog(false);
  backend.step(0.1);
  assert.strictEqual(backend.mode, FlightMode.FAULT);
  ok("watchdog fault");
}

// Safety blocks autonomous start
{
  const backend = AutonomySimBackend.create();
  backend.armPreflight();
  backend.loadMission({
    waypoints: [{ north_m: 1, east_m: 0, down_m: -2 }],
  });
  backend._testSetSensorsValid(false);
  const r = backend.startAutonomous();
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, "safety_blocked");
  ok("safety blocks mission start");
}

// Simulation determinism (same steps -> same position)
{
  function run() {
    const b = AutonomySimBackend.create({ speed_m_s: 3 });
    b.armPreflight();
    b.loadMission({
      waypoints: [{ north_m: 6, east_m: 0, down_m: -4, acceptance_radius_m: 1 }],
    });
    b.startAutonomous();
    for (let i = 0; i < 50; i++) b.step(0.1);
    return b.step(0.1).position_ned;
  }
  const a = run();
  const b = run();
  assert.strictEqual(a.north_m, b.north_m);
  assert.strictEqual(a.east_m, b.east_m);
  ok("simulation determinism");
}

// Telemetry v1 still works (protocol compatibility)
{
  const buf = TelemetrySchema.encode({
    aircraftId: 1,
    sequence: 1,
    sourceMs: 0,
    uptimeS: 0,
    status: 1,
    battMv: 11000,
    accelX: 0,
    accelY: 0,
    accelZ: 1000,
    gyroX: 0,
    gyroY: 0,
    gyroZ: 0,
    altitudeCm: null,
    tempC10: null,
    diag: 0,
    reserved: 0,
  });
  assert.strictEqual(buf.byteLength, 44);
  assert.strictEqual(TelemetrySchema.decode(buf).ok, true);
  ok("telemetry v1 protocol compatibility");
}

// hardware_validated never true on sim
{
  const c = AutonomySimBackend.create().capabilities();
  assert.strictEqual(c.safety.hardware_validated, false);
  ok("sim never claims hardware validation");
}

console.log("\n" + passed + " passed");
