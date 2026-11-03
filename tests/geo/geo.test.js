/** Geographic mission + coordinate tests. */
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

const GeoCoords = loadAs("js/geo/coords.js", "GeoCoords");
const GeoMission = loadAs("js/geo/mission.js", "GeoMission", { GeoCoords });

let passed = 0;
function ok(n) {
  passed++;
  console.log("  ok —", n);
}

console.log("geo / mission tests");

{
  const o = GeoCoords.createOrigin(37.77, -122.42);
  assert.strictEqual(o.ok, true);
  const n = GeoCoords.geoToNed(o.origin, 37.78, -122.42, 30, "ORIGIN_REL");
  assert.strictEqual(n.ok, true);
  assert.ok(n.ned.north_m > 0);
  const g = GeoCoords.nedToGeo(o.origin, n.ned);
  assert.ok(Math.abs(g.lat - 37.78) < 1e-5);
  ok("geo NED round trip");
}

{
  assert.strictEqual(GeoCoords.validateLatLon(100, 0).ok, false);
  assert.strictEqual(GeoCoords.geoToNed(GeoCoords.createOrigin(0, 0).origin, 0, 0, 10, "AGL").ok, false);
  ok("invalid coords / unsupported alt ref");
}

{
  const m = GeoMission.exampleMission();
  const v = GeoMission.validate(m);
  assert.strictEqual(v.ok, true);
  const p = GeoMission.toNedPlan(m);
  assert.strictEqual(p.ok, true);
  assert.ok(p.plan.waypoints.length >= 3);
  ok("example mission validates and converts");
}

{
  const m = GeoMission.exampleMission();
  m.waypoints[0].alt_m = 500;
  assert.strictEqual(GeoMission.validate(m).ok, false);
  ok("altitude bounds");
}

{
  const m = GeoMission.exampleMission();
  m.waypoints.push({ lat: 40, lon: -122.4, alt_m: 10, alt_ref: "ORIGIN_REL" });
  const v = GeoMission.validate(m);
  assert.strictEqual(v.ok, false);
  ok("geofence / distance validation");
}

{
  const m = GeoMission.exampleMission();
  m.exclusion_zones = [{ type: "circle", lat: 37.7755, lon: -122.4194, radius_m: 50 }];
  assert.strictEqual(GeoMission.validate(m).ok, false);
  ok("exclusion zone blocks waypoint");
}

console.log("\n" + passed + " passed");
