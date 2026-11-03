/**
 * Geographic ↔ local NED conversion (local tangent plane).
 * Origin: (lat0, lon0) in WGS84 degrees.
 * NED: meters, north/east/down relative to origin.
 *
 * Operational limit: intended for missions within ~50 km of origin.
 * Uses spherical Earth R = 6371000 m. Not a high-precision geodesy library.
 */
const GeoCoords = (() => {
  const R = 6371000;
  const DEG = Math.PI / 180;
  const MAX_LAT = 90;
  const MAX_LON = 180;
  const MAX_RANGE_M = 50000;

  function isFiniteNum(x) {
    return typeof x === "number" && Number.isFinite(x);
  }

  function validateLatLon(lat, lon) {
    if (!isFiniteNum(lat) || !isFiniteNum(lon)) {
      return { ok: false, error: "non_finite" };
    }
    if (lat < -MAX_LAT || lat > MAX_LAT) return { ok: false, error: "lat_range" };
    if (lon < -MAX_LON || lon > MAX_LON) return { ok: false, error: "lon_range" };
    return { ok: true };
  }

  function createOrigin(lat, lon) {
    const v = validateLatLon(lat, lon);
    if (!v.ok) return v;
    return {
      ok: true,
      origin: { lat, lon, latRad: lat * DEG, lonRad: lon * DEG },
    };
  }

  /** Geographic → NED meters relative to origin */
  function geoToNed(origin, lat, lon, alt_m, alt_ref) {
    const v = validateLatLon(lat, lon);
    if (!v.ok) return v;
    if (!isFiniteNum(alt_m)) return { ok: false, error: "alt_non_finite" };
    if (alt_ref !== "AGL" && alt_ref !== "AMSL" && alt_ref !== "ORIGIN_REL") {
      return { ok: false, error: "unsupported_alt_ref" };
    }
    // No silent AGL↔AMSL conversion — ORIGIN_REL: down = -alt_m (up positive altitude)
    const dLat = (lat - origin.lat) * DEG;
    const dLon = (lon - origin.lon) * DEG;
    const north_m = dLat * R;
    const east_m = dLon * R * Math.cos(origin.latRad);
    const down_m = -alt_m;
    const range = Math.sqrt(north_m * north_m + east_m * east_m);
    if (range > MAX_RANGE_M) return { ok: false, error: "out_of_tangent_range", range_m: range };
    return {
      ok: true,
      ned: { north_m, east_m, down_m },
      alt_ref,
    };
  }

  /** NED → geographic */
  function nedToGeo(origin, ned) {
    if (!ned || !isFiniteNum(ned.north_m) || !isFiniteNum(ned.east_m) || !isFiniteNum(ned.down_m)) {
      return { ok: false, error: "ned_non_finite" };
    }
    const lat = origin.lat + (ned.north_m / R) / DEG;
    const lon = origin.lon + (ned.east_m / (R * Math.cos(origin.latRad))) / DEG;
    const alt_m = -ned.down_m;
    const v = validateLatLon(lat, lon);
    if (!v.ok) return v;
    return { ok: true, lat, lon, alt_m };
  }

  function haversineM(lat1, lon1, lat2, lon2) {
    const a1 = lat1 * DEG;
    const a2 = lat2 * DEG;
    const dLat = (lat2 - lat1) * DEG;
    const dLon = (lon2 - lon1) * DEG;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(a1) * Math.cos(a2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  return {
    R,
    MAX_RANGE_M,
    validateLatLon,
    createOrigin,
    geoToNed,
    nedToGeo,
    haversineM,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = GeoCoords;
}
