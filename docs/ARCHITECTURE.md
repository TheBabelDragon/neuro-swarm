# Architecture — Dual-Domain Neuro-Swarm

## Domains

### A. Digital swarm (unchanged core)

- Browser simulation (`index.html` + `js/*`)
- Neural nets (`net.js`), genetic algorithm (`ga.js`), flocking (`flock.js`)
- World lifecycle and rendering (`world.js`, `main.js`)
- GitHub Pages static deploy

The existing simulator is **not** replaced by a hardware dashboard.

### B. Physical swarm (this branch)

- ESP32 airborne nodes (telemetry source)
- LoRa transport (chipset-agnostic abstraction)
- ESP32 ground station (RX, multi-aircraft state, local AP, HTTP/WS)
- Phone browser dashboard (`ground.html`)

## Shared contract

All physical and synthetic sources speak **Telemetry Protocol v1**  
(`js/telemetry/schema.js` and `firmware/common/protocol/`).

Identity, sequence, sensors, and integrity are transport-independent.

## Separation of concerns

| Concept | Module |
|---------|--------|
| Simulated aircraft | `world.js` + `simulator-adapter.js` |
| Physical aircraft | airborne firmware |
| Ground receiver | ground-station firmware |
| Radio transport | `firmware/platform/lora_transport.h` + adapters |
| Shared swarm identity | `aircraft_id` in protocol |
| Dashboard | `ground.html` + `js/ground/*` |

**No** automatic mapping from neural-network outputs to physical motor commands.  
Physical control is a future, safety-reviewed subsystem.

## Multi-aircraft

Ground station and dashboard are built around a map of `aircraft_id → latest telemetry`.  
Bounded slots (firmware) and bounded cards (UI) support growth without redesign.

## Deployment surfaces

1. GitHub Pages — simulation + static ground UI (demo mode works offline of radio).
2. ESP32 ground AP — serves `ground.html` and WebSocket telemetry without internet.
