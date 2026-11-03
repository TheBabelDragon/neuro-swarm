# neuro-swarm

Physical swarm **telemetry** platform + **kinematic geographic autonomy simulator** (simulation only).

Autonomy foundation is on `main`. This branch adds the map-based Autonomy Simulator V2.

## App destinations

Overview · Fleet · Aircraft · Radio · **Autonomy** (map simulator) · System  
Lab: `lab.html`

### Autonomy simulator

- MapLibre GL JS **6.16.0** + OpenFreeMap liberty style (OSM-derived)  
- Local grid fallback if tiles/scripts fail  
- Geographic missions → NED kinematic sim  
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
