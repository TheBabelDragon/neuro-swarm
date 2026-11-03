/**
 * Engine recovery + fault inject isolation.
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
const AutonomyFaultInject = loadAs("js/autonomy/fault-inject.js", "AutonomyFaultInject");

let passed = 0;
function ok(name) {
  passed++;
  console.log("  ok —", name);
}

const { FlightMode } = AutonomyTypes;
console.log("engine recovery regression tests");

function setupManual() {
  const backend = AutonomySimBackend.create();
  const engine = AutonomyEngine.create(backend);
  const inj = AutonomyFaultInject.wrap(backend);
  backend.armPreflight();
  backend.requestMode(FlightMode.MANUAL);
  return { backend, engine, inj };
}

// Battery persists after ack
{
  const { backend, engine, inj } = setupManual();
  inj.setBattery(9000);
  backend.step(0.1);
  assert.strictEqual(backend.mode, FlightMode.FAILSAFE);
  engine.acknowledgeClear();
  const r = engine.attemptRecovery(FlightMode.DISARMED);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, "safety_not_clear");
  assert.strictEqual(backend.mode, FlightMode.FAILSAFE);
  ok("battery fault persists after acknowledgement");
}

// Sensor fault persists
{
  const { backend, engine, inj } = setupManual();
  inj.setSensorsValid(false);
  backend.step(0.1);
  engine.acknowledgeClear();
  assert.strictEqual(engine.attemptRecovery(FlightMode.DISARMED).ok, false);
  assert.strictEqual(backend.mode, FlightMode.FAILSAFE);
  ok("sensor fault persists after acknowledgement");
}

// Watchdog persists
{
  const { backend, engine, inj } = setupManual();
  inj.setWatchdog(false);
  backend.step(0.1);
  assert.strictEqual(backend.mode, FlightMode.FAULT);
  engine.acknowledgeClear();
  assert.strictEqual(engine.attemptRecovery(FlightMode.DISARMED).ok, false);
  ok("watchdog fault persists after acknowledgement");
}

// Backend failure persists
{
  const { backend, engine, inj } = setupManual();
  inj.setBackendHealthy(false);
  backend.step(0.1);
  engine.acknowledgeClear();
  assert.strictEqual(engine.attemptRecovery(FlightMode.DISARMED).ok, false);
  ok("backend failure persists after acknowledgement");
}

// Recovery succeeds only after genuine restore via injector (test path), not recovery itself
{
  const { backend, engine, inj } = setupManual();
  inj.setBattery(9000);
  backend.step(0.1);
  engine.acknowledgeClear();
  assert.strictEqual(engine.attemptRecovery(FlightMode.DISARMED).ok, false);
  inj.setBattery(11800);
  backend.step(0.1);
  engine.acknowledgeClear();
  const r = engine.attemptRecovery(FlightMode.DISARMED);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(backend.mode, FlightMode.DISARMED);
  ok("recovery succeeds only after condition restored");
}

// No actuators / no auto mission on recovery
{
  const { backend, engine, inj } = setupManual();
  inj.setBattery(9000);
  backend.step(0.1);
  inj.setBattery(11800);
  engine.acknowledgeClear();
  engine.attemptRecovery(FlightMode.DISARMED);
  const st = engine.status();
  assert.strictEqual(st.actuators_enabled, false);
  assert.strictEqual(backend.mode, FlightMode.DISARMED);
  ok("recovery never enables actuators or starts mission");
}

// Fault inject is identifiable test-only
{
  const backend = AutonomySimBackend.create();
  const inj = AutonomyFaultInject.wrap(backend);
  assert.strictEqual(inj.__testOnly, true);
  ok("fault inject marked test-only");
}

console.log("\n" + passed + " passed");
