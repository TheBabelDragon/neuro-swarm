# Architecture — Neuro-Swarm application

## Product surface

**One browser application** (`index.html`) with destinations:

Overview · Fleet · Aircraft · Radio · Lab · System

The evolution simulator is **`lab.html`**, linked from Lab — not the homepage.

`ground.html` redirects to the app for older bookmarks and AP configs.

## Domains

### Physical swarm (primary)

- ESP32 airborne telemetry sources
- LoRa transport abstraction (stub until hardware selected)
- Ground station RX + local AP (firmware target)
- App: multi-aircraft store, detail views, radio diagnostics

### Evolution lab (secondary)

- Neural nets, GA, flocking, 2.5D field
- Generations **auto-roll only** — no GEN button, no R force-restart in lab UI
- Does not command physical motors

## Shared contract

Telemetry Protocol v1 — `js/telemetry/*` and `firmware/common/protocol/`.

Aircraft have **identities, uptime, telemetry, health, connectivity** — not “generations.”

## Offline / AP

The app is static assets only (no CDN). Intended to be served from the ESP32 softAP the same way GitHub Pages serves them today.
