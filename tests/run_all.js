#!/usr/bin/env node
const { spawnSync } = require("child_process");
const path = require("path");

const suites = [
  "tests/protocol/telemetry.test.js",
  "tests/autonomy/autonomy.test.js",
  "tests/autonomy/engine.test.js",
  "tests/geo/geo.test.js",
  "tests/sim/console.test.js",
];

let failed = 0;
for (const s of suites) {
  console.log("\n=== " + s + " ===");
  const r = spawnSync(process.execPath, [path.join(__dirname, "..", s)], {
    stdio: "inherit",
  });
  if (r.status !== 0) failed++;
}

if (failed) {
  console.error("\n" + failed + " suite(s) failed");
  process.exit(1);
}
console.log("\nAll host suites passed");
