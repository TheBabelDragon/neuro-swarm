/** Autonomy geographic simulator view controller (mount/destroy with route). */
const SimView = (() => {
  let consoleApi = null;
  let raf = null;
  let lastWall = 0;
  let mission = null;
  let selectedWp = 0;

  function html() {
    return (
      '<div class="sim-workspace">' +
      '<div class="sim-map-pane" id="sim-map"></div>' +
      '<div class="sim-side">' +
      '<div class="sim-badge">KINEMATIC SIMULATION · not physical flight</div>' +
      '<section class="sim-panel"><h3>Mission</h3>' +
      '<div class="sim-field"><label>Origin lat / lon (manual — no silent geolocation)</label>' +
      '<input id="sim-lat" type="number" step="0.0001" />' +
      '<input id="sim-lon" type="number" step="0.0001" /></div>' +
      '<div class="toolbar" style="padding:0">' +
      '<button type="button" class="btn" data-sim="example">Example mission</button>' +
      '<button type="button" class="btn" data-sim="validate">Validate</button>' +
      '<button type="button" class="btn" data-sim="load">Load to sim</button>' +
      "</div>" +
      '<p id="sim-mission-stats" class="muted" style="font-size:11px;margin:8px 0 0"></p>' +
      "</section>" +
      '<section class="sim-panel"><h3>Simulation</h3>' +
      '<div class="toolbar" style="padding:0">' +
      '<button type="button" class="btn" data-sim="start">Start</button>' +
      '<button type="button" class="btn ghost" data-sim="pause">Pause</button>' +
      '<button type="button" class="btn ghost" data-sim="resume">Resume</button>' +
      '<button type="button" class="btn ghost" data-sim="reset">Reset</button>' +
      "</div>" +
      '<div class="toolbar" style="padding:0;margin-top:6px">' +
      '<button type="button" class="btn ghost" data-sim="rth">RTH</button>' +
      '<button type="button" class="btn ghost" data-sim="abort">Abort</button>' +
      '<button type="button" class="btn ghost" data-sim="ack">Ack</button>' +
      '<button type="button" class="btn ghost" data-sim="recover">Recover</button>' +
      "</div>" +
      '<div class="sim-field" style="margin-top:8px"><label>Speed ×</label>' +
      '<input id="sim-speed" type="number" min="0.25" max="20" step="0.25" value="1" /></div>' +
      '<div class="sim-field"><label>Scenario</label>' +
      '<select id="sim-scenario"></select>' +
      '<button type="button" class="btn ghost" data-sim="scenario">Apply</button></div>' +
      "</section>" +
      '<section class="sim-panel"><h3>Aircraft / safety</h3>' +
      '<div id="sim-state" class="grid-2"></div></section>' +
      '<section class="sim-panel"><h3>Event timeline</h3>' +
      '<div id="sim-timeline" class="sim-timeline"></div></section>' +
      "</div></div>"
    );
  }

  function fillState(snap) {
    const el = document.getElementById("sim-state");
    if (!el || !snap) return;
    const geo = snap.position_geo;
    el.innerHTML =
      row("Mode", snap.mode) +
      row("Reason", snap.reason || "NONE") +
      row("Sim t", snap.sim_t.toFixed(1) + " s") +
      row("Lat", geo ? geo.lat.toFixed(6) : "—") +
      row("Lon", geo ? geo.lon.toFixed(6) : "—") +
      row("Alt m", geo ? geo.alt_m.toFixed(1) : "—") +
      row("Battery", snap.battery_mv + " mV") +
      row("Actuators", "disabled") +
      row("HW validated", "false");
  }

  function row(l, v) {
    return "<div><label>" + l + "</label><b>" + v + "</b></div>";
  }

  function fillTimeline(events) {
    const el = document.getElementById("sim-timeline");
    if (!el) return;
    const tail = events.slice(-40).reverse();
    el.innerHTML = tail
      .map(
        (e) =>
          "<div>t=" +
          (e.sim_t != null ? e.sim_t.toFixed(1) : "?") +
          " · " +
          e.type +
          (e.reason ? " · " + e.reason : "") +
          (e.from ? " · " + e.from + "→" + e.to : "") +
          "</div>"
      )
      .join("");
  }

  function loop(now) {
    if (!consoleApi) return;
    if (!lastWall) lastWall = now;
    const dt = Math.min(0.1, (now - lastWall) / 1000);
    lastWall = now;
    const snap = consoleApi.stepFixed(dt);
    fillState(snap);
    fillTimeline(snap.events || []);
    if (mission) {
      MapConsole.updateOverlay({
        origin: mission.origin,
        home: mission.home,
        waypoints: mission.waypoints,
        position_geo: snap.position_geo,
        track: snap.track,
      });
    }
    raf = requestAnimationFrame(loop);
  }

  async function mount(root) {
    unmount();
    root.innerHTML = html();
    if (!document.querySelector('link[data-ns-sim-css]')) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "css/sim.css";
      l.setAttribute("data-ns-sim-css", "1");
      document.head.appendChild(l);
    }
    consoleApi = SimConsole.create({ aircraft_id: "SIM-MAP-1" });
    mission = GeoMission.exampleMission();
    document.getElementById("sim-lat").value = mission.origin.lat;
    document.getElementById("sim-lon").value = mission.origin.lon;
    const sel = document.getElementById("sim-scenario");
    SimScenarios.list().forEach((s) => {
      const o = document.createElement("option");
      o.value = s.id;
      o.textContent = s.name;
      sel.appendChild(o);
    });
    await MapConsole.mount(document.getElementById("sim-map"), {
      center: mission.origin,
      onClick: (ll) => {
        if (ll.grid) return;
        document.getElementById("sim-lat").value = ll.lat.toFixed(6);
        document.getElementById("sim-lon").value = ll.lon.toFixed(6);
      },
    });
    MapConsole.updateOverlay({
      origin: mission.origin,
      home: mission.home,
      waypoints: mission.waypoints,
    });
    lastWall = 0;
    raf = requestAnimationFrame(loop);

    root.onclick = (e) => {
      const b = e.target.closest("[data-sim]");
      if (!b || !consoleApi) return;
      const cmd = b.getAttribute("data-sim");
      if (cmd === "example") {
        mission = GeoMission.exampleMission();
        document.getElementById("sim-lat").value = mission.origin.lat;
        document.getElementById("sim-lon").value = mission.origin.lon;
        MapConsole.setCenter(mission.origin.lat, mission.origin.lon);
        MapConsole.updateOverlay({
          origin: mission.origin,
          home: mission.home,
          waypoints: mission.waypoints,
        });
      }
      if (cmd === "validate") {
        const lat = parseFloat(document.getElementById("sim-lat").value);
        const lon = parseFloat(document.getElementById("sim-lon").value);
        mission.origin = { lat, lon };
        if (mission.home) {
          mission.home.lat = lat;
          mission.home.lon = lon;
        }
        const v = GeoMission.validate(mission);
        const st = document.getElementById("sim-mission-stats");
        if (v.ok) {
          st.textContent =
            v.stats.waypoint_count +
            " WP · " +
            v.stats.total_distance_m.toFixed(0) +
            " m · max alt " +
            v.stats.max_altitude_m +
            " m · est " +
            v.stats.est_duration_s.toFixed(0) +
            " s (sim estimate)";
        } else {
          st.textContent = "INVALID: " + v.error + (v.index != null ? " @" + v.index : "");
        }
      }
      if (cmd === "load") {
        const lat = parseFloat(document.getElementById("sim-lat").value);
        const lon = parseFloat(document.getElementById("sim-lon").value);
        mission.origin = { lat, lon };
        mission.version = (mission.version || 1) + 1;
        const r = consoleApi.loadGeoMission(mission);
        const st = document.getElementById("sim-mission-stats");
        st.textContent = r.ok ? "Loaded v" + mission.version : "Load failed: " + r.error;
      }
      if (cmd === "start") consoleApi.start();
      if (cmd === "pause") consoleApi.pause();
      if (cmd === "resume") consoleApi.resume();
      if (cmd === "reset") consoleApi.reset();
      if (cmd === "rth") consoleApi.rth();
      if (cmd === "abort") consoleApi.abort();
      if (cmd === "ack") consoleApi.engine.acknowledgeClear();
      if (cmd === "recover") consoleApi.engine.attemptRecovery(AutonomyTypes.FlightMode.DISARMED);
      if (cmd === "scenario") {
        consoleApi.selectScenario(document.getElementById("sim-scenario").value);
      }
      const sp = parseFloat(document.getElementById("sim-speed").value);
      if (sp > 0) consoleApi.setSpeed(sp);
    };
  }

  function unmount() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    lastWall = 0;
    MapConsole.destroy();
    consoleApi = null;
  }

  return { mount, unmount, html };
})();
