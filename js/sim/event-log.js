/** Chronological simulation event log — not browser console. */
const SimEventLog = (() => {
  function create(limit = 500) {
    const events = [];
    function push(ev) {
      events.push(
        Object.assign(
          {
            sim_t: 0,
            type: "unknown",
            aircraft_id: null,
            scenario_id: null,
          },
          ev
        )
      );
      while (events.length > limit) events.shift();
    }
    return {
      push,
      list: () => events.slice(),
      clear: () => {
        events.length = 0;
      },
      snapshot: () => JSON.parse(JSON.stringify(events)),
    };
  }
  return { create };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SimEventLog;
}
