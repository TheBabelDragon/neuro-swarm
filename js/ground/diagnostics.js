/**
 * Lightweight diagnostics helpers for the ground dashboard.
 */
const GroundDiagnostics = (() => {
  function formatAge(ms) {
    if (ms == null) return "—";
    if (ms < 1000) return ms + " ms";
    return (ms / 1000).toFixed(1) + " s";
  }

  function formatId(id) {
    if (id == null) return "—";
    return "0x" + (id >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }

  function formatRssi(v) {
    if (v == null) return "—";
    return v + " dBm";
  }

  function formatSnr(v) {
    if (v == null) return "—";
    return (typeof v === "number" ? v.toFixed(1) : v) + " dB";
  }

  function batteryLabel(batt) {
    if (!batt || batt.mv == null) return "—";
    return batt.v.toFixed(2) + " V (" + batt.state + ")";
  }

  function vector3(v, digits = 0) {
    if (!v) return "—";
    const f = (n) => (n == null ? "—" : Number(n).toFixed(digits));
    return f(v.x) + ", " + f(v.y) + ", " + f(v.z);
  }

  return {
    formatAge,
    formatId,
    formatRssi,
    formatSnr,
    batteryLabel,
    vector3,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = GroundDiagnostics;
}
