# neuro-swarm

Physical swarm **telemetry** platform and **kinematic geographic autonomy simulator** (simulation only).

Browser-first: static app on GitHub Pages. No install. Evolution lab is an optional sandbox, not the product identity.

## Open in the browser

| Destination | URL |
|-------------|-----|
| **Swarm app** (Overview · Fleet · Aircraft · Radio · Autonomy · System) | [https://thebabeldragon.github.io/neuro-swarm/](https://thebabeldragon.github.io/neuro-swarm/) |
| **Evolution lab** (optional neural sandbox) | [https://thebabeldragon.github.io/neuro-swarm/lab.html](https://thebabeldragon.github.io/neuro-swarm/lab.html) |

Locally:

```bash
python3 -m http.server 8080
# http://localhost:8080/
# http://localhost:8080/lab.html
```

On a ground-station SoftAP (when configured): typically `http://192.168.4.1/`

## What it is

- **Telemetry ground UI** — multi-aircraft store, demo stream, live WebSocket path
- **Autonomy map console** — MapLibre + OpenFreeMap, geographic missions, kinematic sim, scenarios
- **Evolution lab** — separate page for neural/genetic experiments

It is **not** a combat game and does not enable physical flight or motor control from the browser.

## Autonomy simulator

- MapLibre GL JS **6.16.0** + OpenFreeMap liberty (OSM-derived)
- Local grid fallback if map resources fail
- Geographic missions → NED kinematic simulation
- Scenarios, event timeline, safety supervisor
- **No** actuators, arming, or physical flight

Attribution: © OpenFreeMap © OpenStreetMap contributors.

## Tests

```bash
node tests/run_all.js
```

CI: `.github/workflows/host-tests.yml`

## Safety

`hardware_validated = false` · `actuators_enabled = false`  
Recovery never manufactures healthy sensors.

## Docs

- `docs/AUTONOMY_SIMULATOR.md`
- `docs/AUTONOMY_ARCHITECTURE.md`
- `docs/FLIGHT_SAFETY.md`

## License

MIT
