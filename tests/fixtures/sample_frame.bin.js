/** Deterministic fixture helper for protocol tests. */
const path = require("path");
const fs = require("fs");

function loadSchema() {
  const code = fs.readFileSync(
    path.join(__dirname, "../../js/telemetry/schema.js"),
    "utf8"
  );
  const wrapped = code.replace(/if \(typeof module[\s\S]*$/, "");
  return new Function(wrapped + "; return TelemetrySchema;")();
}

const Schema = loadSchema();

const sample = {
  aircraftId: 0x00aabb01,
  sequence: 7,
  sourceMs: 999,
  uptimeS: 9,
  status: 0x0001,
  battMv: 11100,
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
};

const buf = Schema.encode(sample);
const u8 = new Uint8Array(buf);

if (require.main === module) {
  console.log("fixture bytes:", Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join(" "));
  const d = Schema.decode(u8);
  console.log("decode ok:", d.ok, "id:", d.telemetry && d.telemetry.aircraftId.toString(16));
}

module.exports = { sample, buf, u8, Schema };
