/**
 * Host tests for Telemetry Protocol v1.
 * Run: node tests/protocol/telemetry.test.js
 */
const assert = require("assert");
const path = require("path");
const fs = require("fs");

function loadAs(rel, exportName) {
  const code = fs.readFileSync(path.join(__dirname, "../..", rel), "utf8");
  const wrapped = code.replace(/if \(typeof module[\s\S]*$/, "");
  const fn = new Function(
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
  return fn(globalThis);
}

const Schema = loadAs("js/telemetry/schema.js", "TelemetrySchema");
const Normalize = loadAs("js/telemetry/normalize.js", "TelemetryNormalize");
const Validate = loadAs("js/telemetry/validate.js", "TelemetryValidate");
const Adapter = loadAs("js/telemetry/simulator-adapter.js", "SimulatorAdapter");
globalThis.TelemetrySchema = Schema;
globalThis.TelemetryNormalize = Normalize;
const Store = loadAs("js/ground/aircraft-store.js", "AircraftStore");

let passed = 0;
function ok(name) {
  passed++;
  console.log("  ok —", name);
}

function sample(overrides = {}) {
  return Object.assign(
    {
      aircraftId: 0x1001,
      sequence: 42,
      sourceMs: 123456,
      uptimeS: 120,
      status: Schema.STATUS.OK,
      battMv: 11750,
      accelX: 10,
      accelY: -5,
      accelZ: 980,
      gyroX: 1,
      gyroY: 2,
      gyroZ: 3,
      altitudeCm: 150,
      tempC10: 255,
      diag: 7,
      reserved: 0,
    },
    overrides
  );
}

console.log("telemetry protocol tests");

{
  const buf = Schema.encode(sample());
  assert.strictEqual(buf.byteLength, Schema.FRAME_SIZE);
  const r = Schema.decode(buf);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.telemetry.aircraftId, 0x1001);
  assert.strictEqual(r.telemetry.sequence, 42);
  assert.strictEqual(r.telemetry.battMv, 11750);
  assert.strictEqual(r.telemetry.accelZ, 980);
  assert.strictEqual(r.telemetry.altitudeCm, 150);
  ok("valid encode/decode");
}

{
  const u8 = new Uint8Array(Schema.encode(sample()));
  u8[0] = 0x00;
  const r = Schema.decode(u8);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, "bad_magic");
  ok("invalid magic rejected");
}

{
  const u8 = new Uint8Array(Schema.encode(sample()));
  u8[2] = 99;
  const crc = Schema.crc16Ccitt(u8, 0, 40);
  u8[40] = crc & 0xff;
  u8[41] = (crc >> 8) & 0xff;
  const r = Schema.decode(u8);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, "version_mismatch");
  ok("version mismatch rejected");
}

{
  const u8 = new Uint8Array(Schema.encode(sample()));
  u8[20] ^= 0xff;
  const r = Schema.decode(u8);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, "crc_mismatch");
  ok("corrupted packet rejected");
}

{
  const r = Schema.decode(new Uint8Array(10));
  assert.strictEqual(r.ok, false);
  ok("short frame rejected");
}

{
  const buf = Schema.encode(sample({ altitudeCm: null, tempC10: null }));
  const r = Schema.decode(buf);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.telemetry.altitudeCm, null);
  assert.strictEqual(r.telemetry.tempC10, null);
  ok("optional null altitude/temp");
}

{
  const tr = Validate.createTracker();
  let i = tr.observe(1, 0);
  assert.strictEqual(i.missing, 0);
  i = tr.observe(1, 1);
  assert.strictEqual(i.missing, 0);
  i = tr.observe(1, 4);
  assert.strictEqual(i.missing, 2);
  i = tr.observe(1, 4);
  assert.strictEqual(i.duplicate, true);
  ok("sequence gap + duplicate");
}

{
  const tr = Validate.createTracker();
  tr.observe(2, 0xfffe);
  tr.observe(2, 0xffff);
  const i = tr.observe(2, 0);
  assert.strictEqual(i.missing, 0);
  ok("sequence wraparound");
}

{
  const s = Store.create();
  for (let id = 1; id <= 3; id++) {
    const buf = Schema.encode(sample({ aircraftId: id, sequence: 1 }));
    const d = Schema.decode(buf);
    const n = Normalize.fromDecoded(d.telemetry, { recvTs: Date.now() });
    s.upsert(n);
  }
  assert.strictEqual(s.list().length, 3);
  ok("multiple aircraft identities");
}

{
  const buf = Schema.encode(
    sample({ status: Schema.STATUS.OK | Schema.STATUS.DEMO })
  );
  const d = Schema.decode(buf);
  const n = Normalize.fromDecoded(d.telemetry, {});
  assert.strictEqual(n.statusFlags.demo, true);
  ok("demo status flag");
}

{
  const state = {
    t: 12.5,
    generation: 3,
    agents: [
      {
        alive: true,
        x: 1,
        y: 2,
        z: 10,
        vx: 5,
        vy: -3,
        vz: 0,
        heading: 0.2,
        bank: 0.1,
      },
      {
        alive: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        heading: 0,
        bank: 0,
      },
    ],
  };
  const snaps = Adapter.fromWorldState(state, { maxAgents: 4 });
  assert.ok(snaps.length >= 1);
  assert.ok(snaps[0].aircraftId >= Adapter.SIM_ID_BASE);
  ok("simulator adapter compatibility");
}

console.log("\n" + passed + " passed");
