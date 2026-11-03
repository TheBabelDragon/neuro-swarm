/** View renderers for Overview / Fleet / Aircraft / Radio / Lab / System. */
const AppViews = (() => {
  function fmtId(id) {
    return GroundDiagnostics.formatId(id);
  }

  function nameFor(id) {
    if (id === 0x1000) return "BREADBOARD-01";
    if (id === 0x1001) return "SWARM-02";
    if (id === 0x1002) return "SWARM-03";
    return fmtId(id);
  }

  function overview(store, meta) {
    const list = store.list();
    const st = store.stats();
    const live = list.filter((a) => a.connection === "live").length;
    const lossPct = (st.globalLoss * 100).toFixed(1);
    return (
      '<div class="stats-strip">' +
      card("Aircraft", String(list.length), live + " live") +
      card("Packet loss", lossPct + "%", st.totalPackets + " packets") +
      card("Ground link", meta.mode === "live" ? "ACTIVE" : meta.mode === "demo" ? "DEMO" : "IDLE", meta.connText || "—") +
      card("Protocol", "V1", "44-byte telemetry") +
      "</div>" +
      '<div class="section-title">Aircraft fleet</div>' +
      fleetList(list) +
      (list.length
        ? ""
        : '<div class="empty">No aircraft yet. Start Demo or Connect to the ground station.</div>')
    );
  }

  function card(label, value, sub) {
    return (
      '<div class="stat-card"><label>' +
      label +
      '</label><div class="value">' +
      value +
      '</div><div class="sub">' +
      sub +
      "</div></div>"
    );
  }

  function fleetList(list) {
    if (!list.length) return "";
    return (
      '<div class="fleet-list">' +
      list
        .map((a) => {
          return (
            '<button type="button" class="ac-card ' +
            (a.connection || "") +
            '" data-open-aircraft="' +
            a.aircraftId +
            '">' +
            "<header><span class=\"id\">" +
            nameFor(a.aircraftId) +
            '</span><span class="badge">' +
            (a.connection || "").toUpperCase() +
            "</span></header>" +
            '<div class="grid-2">' +
            "<div><label>Battery</label><b>" +
            GroundDiagnostics.batteryLabel(a.battery) +
            "</b></div>" +
            "<div><label>Signal</label><b>" +
            GroundDiagnostics.formatRssi(a.rssi) +
            "</b></div>" +
            "</div></button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function fleet(store) {
    const list = store.list();
    return (
      '<div class="section-title">All connected aircraft</div>' +
      (list.length
        ? fleetList(list)
        : '<div class="empty">Fleet empty. Demo or live link required.</div>')
    );
  }

  function aircraftDetail(store, aircraftId) {
    if (aircraftId == null) {
      const list = store.list();
      return (
        '<div class="section-title">Select aircraft</div>' +
        (list.length
          ? fleetList(list)
          : '<div class="empty">No aircraft to inspect.</div>')
      );
    }
    const a = store.get(aircraftId);
    if (!a) {
      return (
        '<button type="button" class="back-link" data-nav="fleet">← Fleet</button>' +
        '<div class="empty">Aircraft not in store (stale session or cleared).</div>'
      );
    }
    const flags = a.statusFlags || {};
    return (
      '<button type="button" class="back-link" data-nav="fleet">← Fleet</button>' +
      "<header style=\"margin-bottom:12px\">" +
      '<div class="brand" style=\"font-size:14px\">' +
      nameFor(a.aircraftId) +
      "</div>" +
      '<div class="muted" style=\"font-family:var(--mono);font-size:11px;margin-top:4px\">' +
      fmtId(a.aircraftId) +
      " · " +
      (a.connection || "").toUpperCase() +
      "</div></header>" +
      block(
        "Identity",
        row("Aircraft ID", fmtId(a.aircraftId)) +
          row("Sequence", String(a.sequence)) +
          row("Uptime", a.uptimeS + " s") +
          row("Source", a.source || "—") +
          row("Protocol", "v1")
      ) +
      block(
        "Sensors",
        row("Accel (mg)", GroundDiagnostics.vector3(a.accel, 0)) +
          row("Gyro (c°/s)", GroundDiagnostics.vector3(a.gyro, 0)) +
          row("Altitude", a.altitudeCm == null ? "—" : a.altitudeCm + " cm") +
          row("Temp", a.tempC == null ? "—" : a.tempC.toFixed(1) + " °C")
      ) +
      block(
        "Power",
        row("Battery", GroundDiagnostics.batteryLabel(a.battery)) +
          row("Low battery", flags.lowBattery ? "yes" : "no")
      ) +
      block(
        "Communications",
        row("RSSI", GroundDiagnostics.formatRssi(a.rssi)) +
          row("SNR", GroundDiagnostics.formatSnr(a.snr)) +
          row("Packet loss", ((a.packetLossEstimate || 0) * 100).toFixed(1) + "%") +
          row("Last packet age", GroundDiagnostics.formatAge(a.ageMs))
      ) +
      block(
        "Diagnostics",
        row("Sensor fault", flags.sensorFault ? "yes" : "no") +
          row("Radio fault", flags.radioFault ? "yes" : "no") +
          row("Armed (info)", flags.armed ? "yes" : "no") +
          row("Demo flag", flags.demo ? "yes" : "no") +
          '<div class="flags">' +
          Object.keys(flags)
            .filter((k) => flags[k])
            .map((k) => '<span class="flag">' + k + "</span>")
            .join("") +
          "</div>"
      )
    );
  }

  function block(title, inner) {
    return (
      '<section class="detail-block"><h3>' +
      title +
      "</h3><div class=\"grid-2\">" +
      inner +
      "</div></section>"
    );
  }

  function row(label, value) {
    return (
      "<div><label>" +
      label +
      "</label><b>" +
      value +
      "</b></div>"
    );
  }

  function radio(store, meta) {
    const list = store.list();
    const st = store.stats();
    const rows = list
      .map(
        (a) =>
          "<div><label>" +
          nameFor(a.aircraftId) +
          "</label><b>" +
          GroundDiagnostics.formatRssi(a.rssi) +
          " / " +
          GroundDiagnostics.formatSnr(a.snr) +
          " · loss " +
          ((a.packetLossEstimate || 0) * 100).toFixed(1) +
          "%</b></div>"
      )
      .join("");
    return (
      block(
        "Receiver",
        row("Link mode", (meta.mode || "idle").toUpperCase()) +
          row("Connection", meta.connText || "—") +
          row("Chipset adapter", "stub-no-radio (until configured)") +
          row("Regional config", "not set — see docs/LORA_TRANSPORT.md")
      ) +
      block(
        "Delivery",
        row("Total packets", String(st.totalPackets)) +
          row("Missing (est.)", String(st.totalMissing)) +
          row("Global loss", (st.globalLoss * 100).toFixed(1) + "%") +
          row("Aircraft tracked", String(st.aircraftCount))
      ) +
      '<div class="section-title">Per-aircraft link</div>' +
      (rows
        ? '<section class="detail-block"><div class="grid-2">' + rows + "</div></section>"
        : '<div class="empty">No radio samples yet.</div>')
    );
  }

  function lab() {
    return (
      '<div class="section-title">Evolution lab</div>' +
      '<p class="muted" style="font-size:13px;line-height:1.5;margin:0 0 12px">' +
      "Neural nets, genetic evolution, and flocking remain available as an experimental sandbox. " +
      "They are not the primary control surface and do not command physical motors." +
      "</p>" +
      '<a class="lab-cta" href="lab.html">Open evolution lab' +
      "<span>Auto-rolling generations · no GEN control · no remote flight</span></a>"
    );
  }

  function system(meta) {
    return (
      block(
        "Ground station",
        row("UI build", "app shell v1") +
          row("Mode", (meta.mode || "idle").toUpperCase()) +
          row("Default AP URL", "http://192.168.4.1/") +
          row("WebSocket", "ws://&lt;host&gt;:81/")
      ) +
      block(
        "Protocol",
        row("Version", "1") +
          row("Frame size", "44 bytes") +
          row("Integrity", "CRC-16/CCITT-FALSE") +
          row("Byte order", "little-endian")
      ) +
      block(
        "Safety",
        row("Remote motor control", "disabled") +
          row("Autonomous flight", "out of scope") +
          row("Radio hardware", "stub until documented")
      ) +
      '<p class="muted" style="font-size:12px;margin-top:12px">See docs/ for architecture, telemetry, LoRa, and staged verification.</p>'
    );
  }

  return {
    overview,
    fleet,
    aircraftDetail,
    radio,
    lab,
    system,
    nameFor,
  };
})();
