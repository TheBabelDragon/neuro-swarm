/**
 * Higher-level validation and sequence tracking helpers.
 */
const TelemetryValidate = (() => {
  const MAX_AGE_MS = 5000;
  const DUPLICATE_WINDOW = 64;

  /**
   * Track sequence progression per aircraft.
   */
  function createTracker() {
    const lastSeq = new Map();
    const recent = new Map(); // aircraftId -> Set of recent sequences

    function observe(aircraftId, sequence) {
      const prev = lastSeq.get(aircraftId);
      let missing = 0;
      let duplicate = false;
      let wrap = false;

      let set = recent.get(aircraftId);
      if (!set) {
        set = new Set();
        recent.set(aircraftId, set);
      }
      if (set.has(sequence)) {
        duplicate = true;
      } else {
        set.add(sequence);
        if (set.size > DUPLICATE_WINDOW) {
          const arr = Array.from(set);
          set.delete(arr[0]);
        }
      }

      if (prev != null) {
        const expected = (prev + 1) & 0xffff;
        if (sequence === prev) {
          duplicate = true;
        } else if (sequence !== expected) {
          // forward gap (accounting for wrap)
          const gap = (sequence - expected + 0x10000) & 0xffff;
          if (gap < 0x8000) missing = gap;
          else {
            // large backward jump — treat as possible re-boot / wrap anomaly
            wrap = true;
          }
        }
        if (sequence < prev && (prev - sequence) > 0x8000) wrap = true;
      }

      if (!duplicate) lastSeq.set(aircraftId, sequence);
      return { missing, duplicate, wrap, previous: prev };
    }

    function reset(aircraftId) {
      lastSeq.delete(aircraftId);
      recent.delete(aircraftId);
    }

    return { observe, reset, lastSeq };
  }

  function isFresh(recvTs, now = Date.now(), maxAge = MAX_AGE_MS) {
    if (recvTs == null) return false;
    return now - recvTs <= maxAge;
  }

  function sanitizeBatteryMv(mv) {
    if (mv == null || mv < 0 || mv > 60000) return null;
    return mv;
  }

  return {
    MAX_AGE_MS,
    createTracker,
    isFresh,
    sanitizeBatteryMv,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = TelemetryValidate;
}
