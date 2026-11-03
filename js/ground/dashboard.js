/**
 * Phone-browser ground dashboard controller.
 * Supports live WebSocket from ESP32 ground station OR local synthetic demo.
 */
(() => {
  const store = AircraftStore.create();
  const elCards = document.getElementById("cards");
  const elCount = document.getElementById("ac-count");
  const elConn = document.getElementById("conn-state");
  const elMode = document.getElementById("mode-label");
  const elStats = document.getElementById("stats-line");
  const btnDemo = document.getElementById("btn-demo");
  const btnClear = document.getElementById("btn-clear");

  let socket = null;
  let demoTimer = null;
  let demoSeq = 0;
  let mode = "idle"; // idle | live | demo

  function setMode(m) {
    mode = m;
    elMode.textContent =
      m === "demo" ? "DEMO (synthetic)" : m === "live" ? "LIVE" : "IDLE";
    elMode.className = "mode " + m;
  }

  function setConn(text, cls) {
    elConn.textContent = text;
    elConn.className = "conn " + (cls || "");
  }

  function render() {
    const list = store.list();
    elCount.textContent = String(list.length);
    const st = store.stats();
    elStats.textContent =
      "pkts " +
      st.totalPackets +
      " · miss " +
      st.totalMissing +
      " · loss " +
      (st.globalLoss * 100).toFixed(1) +
      "%";

    if (!list.length) {
      elCards.innerHTML =
        '<div class="empty">No aircraft yet. Start demo or connect to ground station.</div>';
      return;
    }

    elCards.innerHTML = list
      .map((a) => {
        const conn = a.connection || "offline";
        return (
          '<article class="card " + conn + '" data-id="' +
          a.aircraftId +
          '">' +
          '<header><span class="id">' +
          GroundDiagnostics.formatId(a.aircraftId) +
          '</span><span class="badge">' +
          conn.toUpperCase() +
          "</span></header>" +
          '<div class="grid">' +
          "<div><label>Battery</label><b>" +
          GroundDiagnostics.batteryLabel(a.battery) +
          "</b></div>" +
          "<div><label>Seq</label><b>" +
          a.sequence +
          "</b></div>" +
          "<div><label>Age</label><b>" +
          GroundDiagnostics.formatAge(a.ageMs) +
          "</b></div>" +
          "<div><label>Loss</label><b>" +
          ((a.packetLossEstimate || 0) * 100).toFixed(1) +
          "%</b></div>" +
          "<div><label>Accel (mg)</label><b>" +
          GroundDiagnostics.vector3(a.accel, 0) +
          "</b></div>" +
          "<div><label>Gyro (c°/s)</label><b>" +
          GroundDiagnostics.vector3(a.gyro, 0) +
          "</b></div>" +
          "<div><label>Altitude</label><b>" +
          (a.altitudeCm == null ? "—" : a.altitudeCm + " cm") +
          "</b></div>" +
          "<div><label>Temp</label><b>" +
          (a.tempC == null ? "—" : a.tempC.toFixed(1) + " °C") +
          "</b></div>" +
          "<div><label>RSSI</label><b>" +
          GroundDiagnostics.formatRssi(a.rssi) +
          "</b></div>" +
          "<div><label>SNR</label><b>" +
          GroundDiagnostics.formatSnr(a.snr) +
          "</b></div>" +
          "</div>" +
          '<footer class="flags">' +
          flagPills(a.statusFlags) +
          "</footer>" +
          "</article>"
        );
      })
      .join("");
  }

  function flagPills(flags) {
    if (!flags) return "";
    const keys = [
      "ok",
      "sensorFault",
      "radioFault",
      "lowBattery",
      "armed",
      "demo",
    ];
    return keys
      .filter((k) => flags[k])
      .map((k) => '<span class="pill">' + k + "</span>")
      .join("");
  }

  function ingestBinary(buf, meta = {}) {
    const result = TelemetrySchema.decode(buf);
    if (!result.ok) {
      console.warn("reject packet", result.error);
      return;
    }
    const norm = TelemetryNormalize.fromDecoded(result.telemetry, meta);
    store.upsert(norm);
    render();
  }

  function ingestJson(obj) {
    // Ground station may also push JSON-wrapped frames for convenience.
    if (obj && obj.frameBase64) {
      const bin = Uint8Array.from(atob(obj.frameBase64), (c) => c.charCodeAt(0));
      ingestBinary(bin.buffer, {
        rssi: obj.rssi,
        snr: obj.snr,
        recvTs: obj.recvTs || Date.now(),
        source: TelemetryNormalize.SOURCE.PHYSICAL,
      });
    }
  }

  // --- Demo mode: synthetic multi-aircraft stream ---
  function startDemo() {
    stopDemo();
    if (socket) {
      socket.close();
      socket = null;
    }
    setMode("demo");
    setConn("synthetic", "demo");
    demoSeq = 0;
    demoTimer = setInterval(() => {
      demoSeq = (demoSeq + 1) & 0xffff;
      const now = Date.now();
      for (let i = 0; i < 3; i++) {
        // Occasionally drop a packet for aircraft 1 to exercise loss accounting
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
    setConn("connecting…", "warn");

    if (socket) socket.close();
    socket = GroundSocket.connect(url, {
      onOpen: () => setConn("connected", "ok"),
      onClose: () => setConn("disconnected", "bad"),
      onError: () => setConn("error", "bad"),
      onMessage: (data) => {
        if (typeof data === "string") {
          try {
            ingestJson(JSON.parse(data));
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

  btnDemo.addEventListener("click", () => {
    if (mode === "demo") {
      stopDemo();
      setMode("idle");
      setConn("—", "");
    } else {
      startDemo();
    }
  });

  btnClear.addEventListener("click", () => {
    store.clear();
    render();
  });

  document.getElementById("btn-live").addEventListener("click", connectLive);

  // Auto-refresh card ages
  setInterval(render, 500);
  render();
  setMode("idle");
  setConn("—", "");

  // Expose for host tests / console
  window.GroundDash = { store, ingestBinary, startDemo, stopDemo, connectLive };
})();
