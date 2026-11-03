/** Neuro-Swarm primary application controller + gated sim autonomy. */
(() => {
  const store = AircraftStore.create();
  const root = document.getElementById("view-root");
  const hdrMode = document.getElementById("hdr-mode");
  const hdrConn = document.getElementById("hdr-conn");

  let mode = "idle";
  let connText = "—";
  let socket = null;
  let demoTimer = null;
  let demoSeq = 0;
  let route = { view: "overview", aircraftId: null };
  let simSnap = null;

  const sim = AutonomySimBackend.create({
    aircraft_id: "SIM-APP-1",
    speed_m_s: 3,
  });
  const engine = AutonomyEngine.create(sim);

  function meta() {
    return { mode, connText };
  }

  function setMode(m) {
    mode = m;
    hdrMode.textContent = m === "demo" ? "DEMO" : m === "live" ? "LIVE" : "IDLE";
    hdrMode.className = "pill " + m;
  }

  function setConn(t) {
    connText = t;
    hdrConn.textContent = t;
  }

  function render() {
    const v = route.view;
    document.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.toggle("active", el.getAttribute("data-view") === v);
    });

    let html = "";
    if (v === "overview") html = AppViews.overview(store, meta());
    else if (v === "fleet") html = AppViews.fleet(store);
    else if (v === "aircraft") html = AppViews.aircraftDetail(store, route.aircraftId);
    else if (v === "radio") html = AppViews.radio(store, meta());
    else if (v === "autonomy") {
      const st = engine.status();
      html = AppViews.autonomy(simSnap || st.snapshot, sim.capabilities(), st);
    } else if (v === "system") html = AppViews.system(meta());
    else html = AppViews.overview(store, meta());

    root.innerHTML = html;
  }

  function ingestBinary(buf, extra = {}) {
    const result = TelemetrySchema.decode(buf);
    if (!result.ok) return;
    const norm = TelemetryNormalize.fromDecoded(result.telemetry, extra);
    store.upsert(norm);
    if (route.view !== "autonomy") render();
  }

  function startDemo() {
    stopDemo();
    if (socket) {
      socket.close();
      socket = null;
    }
    setMode("demo");
    setConn("synthetic stream");
    demoSeq = 0;
    demoTimer = setInterval(() => {
      demoSeq = (demoSeq + 1) & 0xffff;
      const now = Date.now();
      for (let i = 0; i < 3; i++) {
        if (i === 1 && demoSeq % 17 === 0) continue;
        const raw = {
          aircraftId: 0x1000 + i,
          sequence: demoSeq,
          sourceMs: now & 0xffffffff,
          uptimeS: Math.floor(now / 1000) % 65535,
          status: 0x0001 | 0x8000 | (i === 2 && demoSeq % 40 < 5 ? 0x0008 : 0),
          battMv: 11600 - i * 150 + Math.round(Math.sin(now / 3000 + i) * 80),
          accelX: Math.round(Math.sin(now / 400 + i) * 80),
          accelY: Math.round(Math.cos(now / 350 + i) * 60),
          accelZ: 980 + Math.round(Math.sin(now / 900) * 20),
          gyroX: Math.round(Math.sin(now / 200 + i) * 50),
          gyroY: Math.round(Math.cos(now / 220 + i) * 40),
          gyroZ: Math.round(Math.sin(now / 180) * 30),
          altitudeCm: 120 + i * 40 + Math.round(Math.sin(now / 2000 + i) * 15),
          tempC10: 240 + i * 5,
          diag: i,
          reserved: 0,
        };
        const frame = TelemetrySchema.encode(raw);
        ingestBinary(frame, {
          rssi: -60 - i * 8 - Math.round(Math.random() * 6),
          snr: 8.5 - i * 1.2,
          recvTs: now,
          source: TelemetryNormalize.SOURCE.DEMO,
        });
      }
      if (route.view !== "autonomy") render();
    }, 200);
  }

  function stopDemo() {
    if (demoTimer) {
      clearInterval(demoTimer);
      demoTimer = null;
    }
  }

  function connectLive() {
    stopDemo();
    const host = location.hostname || "192.168.4.1";
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const url = proto + "://" + host + ":81/";
    setMode("live");
    setConn("connecting…");
    if (socket) socket.close();
    socket = GroundSocket.connect(url, {
      onOpen: () => setConn("connected"),
      onClose: () => setConn("disconnected"),
      onError: () => setConn("error"),
      onMessage: (data) => {
        if (typeof data === "string") {
          try {
            const obj = JSON.parse(data);
            if (obj.frameBase64) {
              const bin = Uint8Array.from(atob(obj.frameBase64), (c) =>
                c.charCodeAt(0)
              );
              ingestBinary(bin.buffer, {
                rssi: obj.rssi,
                snr: obj.snr,
                recvTs: obj.recvTs || Date.now(),
                source: TelemetryNormalize.SOURCE.PHYSICAL,
              });
            }
          } catch (_) {}
        } else {
          ingestBinary(data, {
            recvTs: Date.now(),
            source: TelemetryNormalize.SOURCE.PHYSICAL,
          });
        }
      },
    });
  }

  document.getElementById("btn-demo").addEventListener("click", () => {
    if (mode === "demo") {
      stopDemo();
      setMode("idle");
      setConn("—");
      render();
    } else startDemo();
  });
  document.getElementById("btn-live").addEventListener("click", connectLive);
  document.getElementById("btn-clear").addEventListener("click", () => {
    store.clear();
    render();
  });

  document.querySelector(".app-nav").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view]");
    if (!btn) return;
    AppRouter.go(btn.getAttribute("data-view"));
  });

  root.addEventListener("click", (e) => {
    const open = e.target.closest("[data-open-aircraft]");
    if (open) {
      AppRouter.go("aircraft", Number(open.getAttribute("data-open-aircraft")));
      return;
    }
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      AppRouter.go(nav.getAttribute("data-nav"));
      return;
    }
    const auto = e.target.closest("[data-auto]");
    if (auto) {
      const cmd = auto.getAttribute("data-auto");
      if (cmd === "arm") sim.armPreflight();
      if (cmd === "mission") {
        engine.gatedLoadMission({
          waypoints: [
            { north_m: 0, east_m: 0, down_m: -5, acceptance_radius_m: 1.5 },
            { north_m: 8, east_m: 0, down_m: -5, acceptance_radius_m: 1.5 },
            { north_m: 8, east_m: 6, down_m: -4, acceptance_radius_m: 1.5 },
          ],
          home_ned: { north_m: 0, east_m: 0, down_m: 0 },
        });
      }
      if (cmd === "start") engine.gatedStartAutonomous();
      if (cmd === "pause") sim.pauseMission();
      if (cmd === "resume") sim.resumeMission();
      if (cmd === "rth") sim.requestReturnHome();
      if (cmd === "abort") sim.abortMission();
      if (cmd === "ack") engine.acknowledgeClear();
      if (cmd === "recover") engine.attemptRecovery(AutonomyTypes.FlightMode.DISARMED);
      simSnap = engine.step(0);
      render();
    }
  });

  AppRouter.onChange((r) => {
    route = r;
    render();
  });

  setInterval(() => {
    if (route.view === "autonomy") {
      simSnap = engine.step(0.1);
      render();
    } else if (
      route.view === "overview" ||
      route.view === "fleet" ||
      route.view === "aircraft" ||
      route.view === "radio"
    ) {
      render();
    }
  }, 200);

  setMode("idle");
  setConn("—");
  window.NeuroSwarmApp = { store, startDemo, connectLive, sim, engine };
})();
