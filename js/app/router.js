/** Simple hash router for Neuro-Swarm destinations. */
const AppRouter = (() => {
  const listeners = [];

  function parse() {
    const raw = (location.hash || "#overview").replace(/^#/, "");
    const [view, id] = raw.split("/");
    return {
      view: view || "overview",
      aircraftId: id ? parseInt(id, 16) || parseInt(id, 10) || null : null,
    };
  }

  function go(view, aircraftId) {
    if (aircraftId != null) {
      location.hash = view + "/" + (aircraftId >>> 0).toString(16);
    } else {
      location.hash = view;
    }
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  function emit() {
    const state = parse();
    for (const fn of listeners) fn(state);
  }

  window.addEventListener("hashchange", emit);
  // initial
  setTimeout(emit, 0);

  return { parse, go, onChange };
})();
