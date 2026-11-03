/**
 * Geographic mission model — transport-independent.
 * Converts to internal NED plan for the kinematic simulator.
 */
const GeoMission = (() => {
  const ALT_REFS = { AGL: "AGL", AMSL: "AMSL", ORIGIN_REL: "ORIGIN_REL" };
  const MAX_WAYPOINTS = 64;
  const MAX_ALT_M = 120;
  const MIN_ALT_M = 0;
  const MAX_DISTANCE_M = 50000;

  function exampleMission() {
    // Example near a neutral mid-latitude point (not user location)
    return {
      mission_id: "example-liberty-demo",
      version: 1,
      origin: { lat: 37.7749, lon: -122.4194 },
      home: { lat: 37.7749, lon: -122.4194, alt_m: 0, alt_ref: "ORIGIN_REL" },
      waypoints: [
        { lat: 37.7755, lon: -122.4194, alt_m: 30, alt_ref: "ORIGIN_REL", acceptance_radius_m: 5, speed_m_s: 4, dwell_s: 0 },
        { lat: 37.7755, lon: -122.418, alt_m: 30, alt_ref: "ORIGIN_REL", acceptance_radius_m: 5, speed_m_s: 4, dwell_s: 0 },
        { lat: 37.7749, lon: -122.418, alt_m: 20, alt_ref: "ORIGIN_REL", acceptance_radius_m: 5, speed_m_s: 3, dwell_s: 0 },
      ],
      geofence: { type: "circle", lat: 37.7749, lon: -122.4194, radius_m: 400 },
      exclusion_zones: [],
      metadata: { name: "Example SF demo", label: "KINEMATIC SIMULATION only" },
    };
  }

  function validate(mission) {
    if (!mission || typeof mission !== "object") return { ok: false, error: "missing_mission" };
    if (!mission.origin) return { ok: false, error: "missing_origin" };
    const o = GeoCoords.createOrigin(mission.origin.lat, mission.origin.lon);
    if (!o.ok) return { ok: false, error: "bad_origin", detail: o.error };

    if (!Array.isArray(mission.waypoints) || mission.waypoints.length === 0) {
      return { ok: false, error: "no_waypoints" };
    }
    if (mission.waypoints.length > MAX_WAYPOINTS) {
      return { ok: false, error: "too_many_waypoints" };
    }

    let totalDist = 0;
    let maxAlt = 0;
    let prev = mission.home || mission.origin;
    const prevLat = prev.lat != null ? prev.lat : mission.origin.lat;
    const prevLon = prev.lon != null ? prev.lon : mission.origin.lon;

    for (let i = 0; i < mission.waypoints.length; i++) {
      const w = mission.waypoints[i];
      const lv = GeoCoords.validateLatLon(w.lat, w.lon);
      if (!lv.ok) return { ok: false, error: "bad_waypoint_ll", index: i, detail: lv.error };
      if (!Number.isFinite(w.alt_m)) return { ok: false, error: "bad_altitude", index: i };
      if (w.alt_m < MIN_ALT_M || w.alt_m > MAX_ALT_M) {
        return { ok: false, error: "altitude_bounds", index: i };
      }
      if (w.alt_ref && !ALT_REFS[w.alt_ref]) {
        return { ok: false, error: "unsupported_alt_ref", index: i };
      }
      // Reject mixing AGL and AMSL without explicit handling — only ORIGIN_REL supported for sim convert
      const ref = w.alt_ref || "ORIGIN_REL";
      if (ref !== "ORIGIN_REL") {
        return { ok: false, error: "sim_requires_origin_rel_alt", index: i };
      }
      if (w.acceptance_radius_m != null && !(w.acceptance_radius_m > 0)) {
        return { ok: false, error: "bad_acceptance", index: i };
      }
      if (w.speed_m_s != null && !(w.speed_m_s > 0)) {
        return { ok: false, error: "bad_speed", index: i };
      }
      totalDist += GeoCoords.haversineM(prevLat, prevLon, w.lat, w.lon);
      if (w.alt_m > maxAlt) maxAlt = w.alt_m;
      prev = w;
    }
    if (totalDist > MAX_DISTANCE_M) return { ok: false, error: "mission_distance" };

    if (mission.geofence) {
      const g = mission.geofence;
      if (g.type === "circle") {
        const gv = GeoCoords.validateLatLon(g.lat, g.lon);
        if (!gv.ok) return { ok: false, error: "bad_geofence_center" };
        if (!(g.radius_m > 0)) return { ok: false, error: "bad_geofence_radius" };
        for (let i = 0; i < mission.waypoints.length; i++) {
          const d = GeoCoords.haversineM(g.lat, g.lon, mission.waypoints[i].lat, mission.waypoints[i].lon);
          if (d > g.radius_m) return { ok: false, error: "waypoint_outside_geofence", index: i };
        }
      } else {
        return { ok: false, error: "unsupported_geofence_type" };
      }
    }

    if (Array.isArray(mission.exclusion_zones)) {
      for (let z = 0; z < mission.exclusion_zones.length; z++) {
        const ex = mission.exclusion_zones[z];
        if (ex.type !== "circle") return { ok: false, error: "unsupported_exclusion", index: z };
        if (!(ex.radius_m > 0)) return { ok: false, error: "bad_exclusion_radius", index: z };
        for (let i = 0; i < mission.waypoints.length; i++) {
          const d = GeoCoords.haversineM(ex.lat, ex.lon, mission.waypoints[i].lat, mission.waypoints[i].lon);
          if (d < ex.radius_m) return { ok: false, error: "waypoint_in_exclusion", index: i, zone: z };
        }
      }
    }

    return {
      ok: true,
      stats: {
        waypoint_count: mission.waypoints.length,
        total_distance_m: totalDist,
        max_altitude_m: maxAlt,
        est_duration_s: estimateDuration(mission),
      },
    };
  }

  function estimateDuration(mission) {
    let t = 0;
    let plat = mission.home ? mission.home.lat : mission.origin.lat;
    let plon = mission.home ? mission.home.lon : mission.origin.lon;
    for (const w of mission.waypoints) {
      const d = GeoCoords.haversineM(plat, plon, w.lat, w.lon);
      const spd = w.speed_m_s > 0 ? w.speed_m_s : 3;
      t += d / spd + (w.dwell_s || 0);
      plat = w.lat;
      plon = w.lon;
    }
    return t;
  }

  /** Convert validated geographic mission → NED plan for AutonomyMission / sim backend */
  function toNedPlan(mission) {
    const v = validate(mission);
    if (!v.ok) return v;
    const o = GeoCoords.createOrigin(mission.origin.lat, mission.origin.lon);
    const waypoints = [];
    for (const w of mission.waypoints) {
      const n = GeoCoords.geoToNed(o.origin, w.lat, w.lon, w.alt_m, w.alt_ref || "ORIGIN_REL");
      if (!n.ok) return n;
      waypoints.push({
        north_m: n.ned.north_m,
        east_m: n.ned.east_m,
        down_m: n.ned.down_m,
        acceptance_radius_m: w.acceptance_radius_m != null ? w.acceptance_radius_m : 5,
        acceptance_alt_m: 2,
        speed_m_s: w.speed_m_s,
      });
    }
    let home_ned = { north_m: 0, east_m: 0, down_m: 0 };
    if (mission.home) {
      const h = GeoCoords.geoToNed(
        o.origin,
        mission.home.lat,
        mission.home.lon,
        mission.home.alt_m || 0,
        mission.home.alt_ref || "ORIGIN_REL"
      );
      if (!h.ok) return h;
      home_ned = h.ned;
    }
    let geofence_radius_m = null;
    if (mission.geofence && mission.geofence.type === "circle") {
      geofence_radius_m = mission.geofence.radius_m;
    }
    return {
      ok: true,
      plan: {
        waypoints,
        home_ned,
        geofence_radius_m,
        mission_id: mission.mission_id,
        version: mission.version || 1,
      },
      stats: v.stats,
      origin: o.origin,
    };
  }

  return {
    ALT_REFS,
    MAX_WAYPOINTS,
    MAX_ALT_M,
    exampleMission,
    validate,
    toNedPlan,
    estimateDuration,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = GeoMission;
}
