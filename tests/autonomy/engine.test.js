/**
 * Engine, recovery, native/FC mocks, status message.
 * Run: node tests/autonomy/engine.test.js
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
const AutonomyEngine = loadAs("js/autonomy/engine.js", "AutonomyEngine", { AutonomyTypes });
const AutonomyNativeBackendMock = loadAs(
  "js/autonomy/native-backend-mock.js",
  "AutonomyNativeBackendMock",
  { AutonomyTypes }
);
const AutonomyExternalFcMock = loadAs(
  "js/autonomy/external-fc-mock.js",
  "AutonomyExternalFcMock",
  { AutonomyTypes }
);
const AutonomyStatusMessage = loadAs(
  "js/autonomy/status-message.js",
  "AutonomyStatusMessage"
);

let passed = 0;
function ok(name) {
  passed++;
  console.log("  ok —", name);
}

const { FlightMode } = AutonomyTypes;

console.log("autonomy engine / mock tests");

// Gated start blocked by safety
{
  const backend = AutonomySimBackend.create();
  const engine = AutonomyEngine.create(backend);
  backend.armPreflight();
  backend.loadMission({ waypoints: [{ north_m: 1, east_m: 0, down_m: -2 }] });
  backend._testSetSensorsValid(false);
  const r = engine.gatedStartAutonomous();
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, "safety_blocked");
  ok("engine gates start on safety");
}

// Recovery requires operator ack
{
  const backend = AutonomySimBackend.create();
  const engine = AutonomyEngine.create(backend);
  backend.armPreflight();
  backend.requestMode(FlightMode.MANUAL);
  backend._testSetBattery(9000);
  backend.step(0.1);
  assert.strictEqual(backend.mode, FlightMode.FAILSAFE);
  const denied = engine.attemptRecovery(FlightMode.DISARMED);
  assert.strictEqual(denied.ok, false);
  assert.strictEqual(denied.error, "operator_ack_required");
  engine.acknowledgeClear();
  backend._testSetBattery(11800);
  const okRec = engine.attemptRecovery(FlightMode.DISARMED);
  assert.strictEqual(okRec.ok, true);
  assert.strictEqual(backend.mode, FlightMode.DISARMED);
  ok("failsafe recovery with operator ack");
}

// Fault only to disarmed
{
  const backend = AutonomySimBackend.create();
  const engine = AutonomyEngine.create(backend);
  backend.armPreflight();
  backend.requestMode(FlightMode.MANUAL);
  backend._testSetWatchdog(false);
  backend.step(0.1);
  assert.strictEqual(backend.mode, FlightMode.FAULT);
  engine.acknowledgeClear();
  backend._testSetWatchdog(true);
  const bad = engine.attemptRecovery(FlightMode.READY);
  assert.strictEqual(bad.ok, false);
  const good = engine.attemptRecovery(FlightMode.DISARMED);
  assert.strictEqual(good.ok, true);
  ok("fault recovery only to DISARMED");
}

// Native mock capabilities from config only
{
  const n = AutonomyNativeBackendMock.create();
  assert.strictEqual(n.capabilities().capabilities.attitude_estimation, false);
  assert.strictEqual(n.isOperational(), false);
  n.configure({
    configured: true,
    imu_present: true,
    baro_present: true,
    gnss_present: true,
  });
  const c = n.capabilities().capabilities;
  assert.strictEqual(c.waypoint_navigation, true);
  assert.strictEqual(n.capabilities().safety.hardware_validated, false);
  assert.strictEqual(n.requestNav().ok, false);
  ok("native mock capability derivation");
}

// External FC rejects actuators
{
  const fc = AutonomyExternalFcMock.create({ configured: true, connected: true });
  const ack = fc.requestNav();
  assert.strictEqual(ack.ack, "REJECTED");
  assert.strictEqual(ack.actuators_enabled, false);
  assert.strictEqual(fc.capabilities().safety.hardware_validated, false);
  ok("external FC mock rejects actuators");
}

// Status message strips elevated claims
{
  const enc = AutonomyStatusMessage.encode({
    aircraft_id: "X",
    flight_mode: "AUTONOMOUS",
    hardware_validated: true,
    actuators_enabled: true,
  });
  assert.strictEqual(enc.ok, true);
  assert.strictEqual(enc.json.hardware_validated, false);
  assert.strictEqual(enc.json.actuators_enabled, false);
  const dec = AutonomyStatusMessage.decode(enc.text);
  assert.strictEqual(dec.status.hardware_validated, false);
  ok("status message forces validation flags false");
}

// Engine status exposes actuators_enabled false
{
  const backend = AutonomySimBackend.create();
  const engine = AutonomyEngine.create(backend);
  const st = engine.status();
  assert.strictEqual(st.actuators_enabled, false);
  assert.strictEqual(st.hardware_validated, false);
  ok("engine status never enables actuators");
}

console.log("\n" + passed + " passed");
