/**
 * MapLibre-backed geographic console. Destroyed on view leave.
 * Falls back to local grid canvas if MapLibre or style fails.
 */
const MapConsole = (() => {
  let map = null;
  let mode = "none"; // maplibre | grid
  let container = null;
  let cfg = null;
  let onClick = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.maplibregl) {
        resolve(window.maplibregl);
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve(window.maplibregl);
      s.onerror = () => reject(new Error("maplibre_load_failed"));
      document.head.appendChild(s);
    });
  }

  function ensureCss(href) {
    if (document.querySelector('link[data-ns-maplibre]')) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.setAttribute("data-ns-maplibre", "1");
    document.head.appendChild(l);
  }

  function destroy() {
    if (map && map.remove) {
      try {
        map.remove();
      } catch (_) {}
    }
    map = null;
    mode = "none";
    if (container) container.innerHTML = "";
    container = null;
    onClick = null;
  }

  function mountGrid(el, center) {
    mode = "grid";
    el.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.className = "ns-grid-map";
    canvas.width = el.clientWidth || 400;
    canvas.height = el.clientHeight || 300;
    el.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "#0a1014";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(125,255,178,0.12)";
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.fillStyle = "#7ee7ff";
      ctx.font = "12px monospace";
      ctx.fillText("LOCAL GRID FALLBACK — map provider unavailable", 12, 20);
      if (center) {
        ctx.fillText("origin " + center.lat.toFixed(5) + ", " + center.lon.toFixed(5), 12, 38);
      }
    }
    draw();
    canvas.addEventListener("click", (e) => {
      if (!onClick || !center) return;
      // approximate: 1 px ~ not geo — emit origin-relative nudge for editing demos only
      onClick({ lat: center.lat, lon: center.lon, grid: true });
    });
    const attr = document.createElement("div");
    attr.className = "ns-map-attr";
    attr.textContent = "Local coordinate grid — not aeronautical data";
    el.appendChild(attr);
  }

  async function mount(el, options = {}) {
    destroy();
    container = el;
    cfg = MapProvider.config(options.provider || {});
    onClick = options.onClick || null;
    const center = options.center || { lat: 37.7749, lon: -122.4194 };
    ensureCss(MapProvider.maplibreCssUrl(cfg.maplibreVersion));
    try {
      const mgl = await loadScript(MapProvider.maplibreJsUrl(cfg.maplibreVersion));
      if (!mgl) throw new Error("no_maplibre");
      map = new mgl.Map({
        container: el,
        style: cfg.styleUrl,
        center: [center.lon, center.lat],
        zoom: options.zoom != null ? options.zoom : 14,
        attributionControl: true,
      });
      mode = "maplibre";
      map.on("error", () => {
        /* style tile errors — keep map if possible */
      });
      map.on("click", (e) => {
        if (onClick) onClick({ lat: e.lngLat.lat, lon: e.lngLat.lng, grid: false });
      });
      return new Promise((resolve) => {
        map.on("load", () => resolve({ ok: true, mode }));
        setTimeout(() => {
          if (mode === "maplibre") resolve({ ok: true, mode });
        }, 4000);
      });
    } catch (err) {
      mountGrid(el, center);
      return { ok: true, mode: "grid", error: String(err && err.message) };
    }
  }

  function setCenter(lat, lon, zoom) {
    if (mode === "maplibre" && map) {
      map.setCenter([lon, lat]);
      if (zoom != null) map.setZoom(zoom);
    }
  }

  function updateOverlay(state) {
    if (mode !== "maplibre" || !map || !window.maplibregl) return;
    const mgl = window.maplibregl;
    // Simple marker layer via sources
    const features = [];
    if (state.origin) {
      features.push({
        type: "Feature",
        properties: { label: "ORIGIN" },
        geometry: { type: "Point", coordinates: [state.origin.lon, state.origin.lat] },
      });
    }
    if (state.home) {
      features.push({
        type: "Feature",
        properties: { label: "HOME" },
        geometry: { type: "Point", coordinates: [state.home.lon, state.home.lat] },
      });
    }
    (state.waypoints || []).forEach((w, i) => {
      features.push({
        type: "Feature",
        properties: { label: String(i + 1) },
        geometry: { type: "Point", coordinates: [w.lon, w.lat] },
      });
    });
    if (state.position_geo) {
      features.push({
        type: "Feature",
        properties: { label: "AC" },
        geometry: {
          type: "Point",
          coordinates: [state.position_geo.lon, state.position_geo.lat],
        },
      });
    }
    const fc = { type: "FeatureCollection", features };
    if (map.getSource("ns-points")) {
      map.getSource("ns-points").setData(fc);
    } else if (map.isStyleLoaded && map.isStyleLoaded()) {
      map.addSource("ns-points", { type: "geojson", data: fc });
      map.addLayer({
        id: "ns-points-circle",
        type: "circle",
        source: "ns-points",
        paint: {
          "circle-radius": 6,
          "circle-color": "#7ee7ff",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#05070a",
        },
      });
    }
    const lineCoords = (state.waypoints || []).map((w) => [w.lon, w.lat]);
    const line = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: lineCoords },
    };
    if (lineCoords.length >= 2) {
      if (map.getSource("ns-route")) {
        map.getSource("ns-route").setData(line);
      } else if (map.isStyleLoaded && map.isStyleLoaded()) {
        map.addSource("ns-route", { type: "geojson", data: line });
        map.addLayer({
          id: "ns-route-line",
          type: "line",
          source: "ns-route",
          paint: { "line-color": "#ffb454", "line-width": 2 },
        });
      }
    }
    const trackCoords = (state.track || []).map((p) => [p.lon, p.lat]);
    if (trackCoords.length >= 2) {
      const tr = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: trackCoords },
      };
      if (map.getSource("ns-track")) {
        map.getSource("ns-track").setData(tr);
      } else if (map.isStyleLoaded && map.isStyleLoaded()) {
        map.addSource("ns-track", { type: "geojson", data: tr });
        map.addLayer({
          id: "ns-track-line",
          type: "line",
          source: "ns-track",
          paint: { "line-color": "#7dffb2", "line-width": 2 },
        });
      }
    }
  }

  return {
    mount,
    destroy,
    setCenter,
    updateOverlay,
    get mode() {
      return mode;
    },
  };
})();
