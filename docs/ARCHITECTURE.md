# Architecture — Dual-Domain Neuro-Swarm

## Center of gravity

**Physical swarm + shared telemetry** is the product direction.  
The browser evolution lab is retained as a secondary surface for neuroevolution experiments and the simulator→telemetry adapter — not as the primary user experience.

## Domains

### A. Physical swarm (primary)

- ESP32 airborne nodes (telemetry source)
- LoRa transport (chipset-agnostic abstraction)
- ESP32 ground station (RX, multi-aircraft state, local AP, HTTP/WS)
- Phone browser dashboard (`ground.html`)

### B. Digital lab (secondary)

- Browser simulation (`index.html` + `js/*`)
- Neural nets (`net.js`), genetic algorithm (`ga.js`), flocking (`flock.js`)
- World lifecycle and rendering (`world.js`, `main.js`)
- Optional force-generation control (demoted UI); generations still auto-roll

The lab is **not** replaced by the hardware dashboard; it is framed as a lab.

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

1. Ground station AP — serves `ground.html` and WebSocket telemetry without internet (target).
2. GitHub Pages — static ground UI (demo mode) + evolution lab.
