/**
 * Bounded in-memory store of latest telemetry per aircraft.
 * Tracks sequence gaps, freshness, and packet-loss estimates.
 */
const AircraftStore = (() => {
  const MAX_AIRCRAFT = 32;
  const STALE_MS = 4000;
  const OFFLINE_MS = 10000;

  function create() {
    const map = new Map();
    const tracker = TelemetryValidate.createTracker();
    let totalPackets = 0;
    let totalMissing = 0;

    function upsert(normalized) {
      if (!normalized || normalized.aircraftId == null) return null;
      const id = normalized.aircraftId;
      const now = Date.now();
      const seqInfo = tracker.observe(id, normalized.sequence);

      totalPackets += 1;
      if (seqInfo.missing) totalMissing += seqInfo.missing;

      let entry = map.get(id);
      if (!entry) {
        if (map.size >= MAX_AIRCRAFT) {
          // Evict oldest offline entry
          let oldestId = null;
          let oldestTs = Infinity;
          for (const [k, v] of map) {
            if (v.recvTs < oldestTs) {
              oldestTs = v.recvTs;
              oldestId = k;
            }
          }
          if (oldestId != null) map.delete(oldestId);
        }
        entry = {
          aircraftId: id,
          firstSeen: now,
          packets: 0,
          missing: 0,
          duplicates: 0,
        };
        map.set(id, entry);
      }

      entry.packets += 1;
      if (seqInfo.missing) entry.missing += seqInfo.missing;
      if (seqInfo.duplicate) entry.duplicates += 1;

      const loss =
        entry.packets + entry.missing > 0
          ? entry.missing / (entry.packets + entry.missing)
          : 0;

      Object.assign(entry, normalized, {
        recvTs: normalized.recvTs || now,
        packetLossEstimate: loss,
        lastSeqInfo: seqInfo,
      });
      return entry;
    }

    function get(id) {
      const e = map.get(id);
      if (!e) return null;
      const age = Date.now() - (e.recvTs || 0);
      return { ...e, ageMs: age, connection: connectionState(age) };
    }

    function connectionState(ageMs) {
      if (ageMs <= STALE_MS) return "live";
      if (ageMs <= OFFLINE_MS) return "stale";
      return "offline";
    }

    function list() {
      const now = Date.now();
      const out = [];
      for (const e of map.values()) {
        const age = now - (e.recvTs || 0);
        out.push({ ...e, ageMs: age, connection: connectionState(age) });
      }
      out.sort((a, b) => a.aircraftId - b.aircraftId);
      return out;
    }

    function clear() {
      map.clear();
      tracker.reset();
      totalPackets = 0;
      totalMissing = 0;
    }

    function stats() {
      return {
        aircraftCount: map.size,
        totalPackets,
        totalMissing,
        globalLoss:
          totalPackets + totalMissing > 0
            ? totalMissing / (totalPackets + totalMissing)
            : 0,
      };
    }

    return { upsert, get, list, clear, stats, STALE_MS, OFFLINE_MS };
  }

  return { create, STALE_MS, OFFLINE_MS };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AircraftStore;
}
