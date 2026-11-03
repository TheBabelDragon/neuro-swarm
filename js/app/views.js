/** View renderers — Overview / Fleet / Aircraft / Radio / Autonomy / System. */
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
      card("Autonomy", "MAP SIM", "kinematic · not flight") +
      "</div>" +
      '<div class="section-title">Aircraft fleet</div>' +
      fleetList(list) +
      (list.length
        ? ""
        : '<div class="empty">No aircraft yet. Start Demo or Connect to the ground station. Open <b>Autonomy</b> for the geographic simulator.</div>')
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
        '<div class="empty">Aircraft not in store.</div>'
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
      " · source " +
      (a.source || "—") +
      "</div></header>" +
      block(
        "Identity",
        row("Aircraft ID", fmtId(a.aircraftId)) +
          row("Sequence", String(a.sequence)) +
          row("Uptime", a.uptimeS + " s") +
          row("Source", a.source || "—")
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
        row("Battery", GroundDiagnostics.batteryLabel(a.battery))
      ) +
      block(
        "Communications",
        row("RSSI", GroundDiagnostics.formatRssi(a.rssi)) +
          row("SNR", GroundDiagnostics.formatSnr(a.snr)) +
          row("Loss", ((a.packetLossEstimate || 0) * 100).toFixed(1) + "%") +
          row("Age", GroundDiagnostics.formatAge(a.ageMs))
      ) +
      block(
        "Diagnostics",
        row("Sensor fault", flags.sensorFault ? "yes" : "no") +
          row("Radio fault", flags.radioFault ? "yes" : "no") +
          row("Demo", flags.demo ? "yes" : "no")
      )
    );
  }

  function block(title, inner) {
    return (
      '<section class="detail-block"><h3>' +
      title +
      '</h3><div class="grid-2">' +
      inner +
      "</div></section>"
    );
  }

  function row(label, value) {
    return "<div><label>" + label + "</label><b>" + value + "</b></div>";
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
          "</b></div>"
      )
      .join("");
    return (
      block(
        "Receiver",
        row("Link mode", (meta.mode || "idle").toUpperCase()) +
          row("Connection", meta.connText || "—") +
          row("Chipset", "stub until configured")
      ) +
      block(
        "Delivery",
        row("Packets", String(st.totalPackets)) +
          row("Missing", String(st.totalMissing)) +
          row("Loss", (st.globalLoss * 100).toFixed(1) + "%")
      ) +
      '<div class="section-title">Per-aircraft</div>' +
      (rows
        ? '<section class="detail-block"><div class="grid-2">' + rows + "</div></section>"
        : '<div class="empty">No samples.</div>')
    );
  }

  /** Legacy panel kept for tests; live Autonomy route uses SimView. */
  function autonomy(simSnap, simCaps, engineStatus) {
    return (
      '<div class="section-title">Geographic simulator</div>' +
      '<p class="muted" style="font-size:12px">Open the Autonomy nav item for the map workspace (SimView).</p>'
    );
  }

  function system(meta) {
    return (
      block(
        "Ground station",
        row("UI", "telemetry + map simulator") +
          row("Mode", (meta.mode || "idle").toUpperCase()) +
          row("AP URL", "http://192.168.4.1/")
      ) +
      block(
        "Protocol",
        row("Telemetry", "v1 · 44 bytes") +
          row("Capability / status", "v1 JSON · separate") +
          row("Autonomy", "kinematic map console")
      ) +
      block(
        "Map",
        row("Provider", "OpenFreeMap liberty") +
          row("MapLibre", "6.16.0") +
          row("Fallback", "local grid")
      ) +
      block(
        "Safety",
        row("Remote motors", "disabled") +
          row("Physical auto", "not enabled") +
          row("Recovery", "no manufactured health")
      ) +
      '<a class="lab-cta" href="lab.html">Open evolution lab<span>Optional sandbox</span></a>'
    );
  }

  return {
    overview,
    fleet,
    aircraftDetail,
    radio,
    autonomy,
    system,
    nameFor,
  };
})();
