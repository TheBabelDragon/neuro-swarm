/**
 * Map provider configuration — independent of autonomy engine.
 * Default: OpenFreeMap liberty style.
 */
const MapProvider = (() => {
  const MAPLIBRE_VERSION = "6.16.0";
  const DEFAULT_STYLE = "https://tiles.openfreemap.org/styles/liberty";
  const ATTRIBUTION =
    '© <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
    '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

  function config(overrides = {}) {
    return {
      maplibreVersion: MAPLIBRE_VERSION,
      styleUrl: overrides.styleUrl || DEFAULT_STYLE,
      attribution: overrides.attribution || ATTRIBUTION,
      fallback: "local_grid",
      geocoder: overrides.geocoder || null,
    };
  }

  function maplibreCssUrl(v) {
    return "https://unpkg.com/maplibre-gl@" + (v || MAPLIBRE_VERSION) + "/dist/maplibre-gl.css";
  }

  function maplibreJsUrl(v) {
    return "https://unpkg.com/maplibre-gl@" + (v || MAPLIBRE_VERSION) + "/dist/maplibre-gl.js";
  }

  return {
    MAPLIBRE_VERSION,
    DEFAULT_STYLE,
    ATTRIBUTION,
    config,
    maplibreCssUrl,
    maplibreJsUrl,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = MapProvider;
}
