# Autonomy Simulator V2

Geographic **kinematic** simulation console for mission planning and safety-scenario rehearsal.

## Not in scope

- Physical flight, actuators, arming, browser→aircraft commands  
- Aerodynamic fidelity  
- `hardware_validated = true`  
- Map imagery as obstacle clearance or airspace authorization  

## Architecture

| Layer | Role |
|-------|------|
| `js/geo/*` | WGS84 ↔ NED, geographic mission validation |
| `js/autonomy/*` | State machine, safety, sim backend (unchanged contracts) |
| `js/sim/*` | Console, scenarios, event log |
| `js/map/*` | MapLibre provider config + mount/destroy |
| `js/app/sim-view.js` | Autonomy workspace UI |

Autonomy **engine does not import MapLibre**.

## Map provider

- Default style: `https://tiles.openfreemap.org/styles/liberty`  
- MapLibre GL JS **6.16.0** (pinned via unpkg)  
- Attribution: OpenFreeMap + OpenStreetMap  
- On load failure: **local grid fallback**  
- No silent browser geolocation for mission origin  

## Coordinates

- Local tangent plane, R = 6371000 m  
- Operational intent: ≤ ~50 km from origin  
- Sim altitude reference: **ORIGIN_REL** only (no silent AGL↔AMSL)  

## Simulation time

Independent of wall clock. Speed is a pure dt multiplier.

## Fault injection

`AutonomyFaultInject.wrap(backend)` is **test-only** (`__testOnly: true`).  
`attemptRecovery()` never clears faults.

## Scenarios

See `js/sim/scenarios.js` — link loss, stale IMU, GNSS invalid, battery, geofence, backend, watchdog, recovery, abort.

## Tests

```bash
node tests/run_all.js
```
