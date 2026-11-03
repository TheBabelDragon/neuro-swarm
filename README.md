# neuro-swarm

**Physical swarm control platform** — ESP32 aircraft, LoRa telemetry, local ground station, phone app.

One browser application. Six destinations. Shared protocol v1.

```
Flying Breadboard (ESP32)  →  LoRa  →  ground station AP  →  index.html app
                                                              ↑
                                         protocol v1 ─────────┘

lab.html — optional evolution sandbox (not the product surface)
```

## App destinations

| Destination | Purpose |
|-------------|---------|
| **Overview** | Swarm at a glance — counts, loss, link, protocol |
| **Fleet** | All connected aircraft cards |
| **Aircraft** | Per-node identity, sensors, power, comms, diagnostics |
| **Radio** | LoRa / link quality and delivery stats |
| **Lab** | Link to evolution sandbox |
| **System** | Ground station, protocol, safety posture |

Primary entry: **`index.html`** (also what the ground AP should serve).

Live Pages lab (legacy path still builds static files): https://thebabeldragon.github.io/neuro-swarm/

## Run locally

```bash
python3 -m http.server 8080
```

- http://localhost:8080/ — **app** (use **Demo**)
- http://localhost:8080/lab.html — evolution lab (auto generations only; no GEN button)

Host protocol tests (unchanged):

```bash
node tests/protocol/telemetry.test.js
```

## What is in / out of scope

| Layer | Status |
|-------|--------|
| Telemetry protocol v1 | Host-tested |
| App shell + multi-view UI | On branch |
| Firmware boundaries | Sketched; radio stubbed |
| Remote motor control | **Out of scope** |
| Autonomous flight | **Out of scope** |

## Layout

```
index.html / css/app.css / js/app/* / js/telemetry/* / js/ground/*
lab.html / css/lab.css / js/lab/* / js/{net,ga,flock,world,audio}.js
firmware/  hardware/  docs/  tests/
ground.html  → redirects to index.html
```

## Safety

No browser → motor commands. Propellers off until `docs/SAFETY.md` stages pass.  
LoRa remains behind a stub until module, pins, and regional limits are documented.

## License

MIT
