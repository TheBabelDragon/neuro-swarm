# neuro-swarm

**Physical neuro-swarm platform** — ESP32 aircraft, LoRa telemetry, local ground station, phone dashboard — with a browser evolution lab for neural agents.

This is no longer “just a browser game.” The center of gravity is the **shared telemetry contract** and the path from airborne nodes to a ground receiver you can open on a phone without the internet.

```
Flying Breadboard (ESP32)  →  LoRa  →  ground station AP  →  ground.html
                                                              ↑
                                         shared protocol v1 ──┘

Browser lab (index.html) remains for neuroevolution experiments and
simulator → telemetry adapter work. It is not the product surface.
```

Live lab (GitHub Pages): https://thebabeldragon.github.io/neuro-swarm/  
Ground UI: `ground.html` (demo mode works with no hardware)

## What works now

| Layer | Status |
|-------|--------|
| Telemetry protocol v1 (44-byte binary + CRC) | Host-tested |
| Phone ground dashboard + multi-aircraft store | Static + demo stream |
| Airborne / ground firmware boundaries | Sketched, radio stubbed |
| LoRa chipset adapter | Stub until module + region chosen |
| Evolution lab (old sim) | Intact, secondary entry |
| Remote motor control / autonomous flight | **Out of scope** |

## Run locally

```bash
python3 -m http.server 8080
```

- http://localhost:8080/ground.html — **primary UI** (tap **Demo**)
- http://localhost:8080/ — evolution lab (optional)

Host protocol tests:

```bash
node tests/protocol/telemetry.test.js
```

## Layout

```
ground.html / ground.css / js/telemetry/* / js/ground/*   # ground surface
firmware/{common,airborne,ground-station,platform}/      # ESP32 targets
hardware/                                                # Flying Breadboard
docs/                                                    # architecture & safety
tests/                                                   # host protocol tests
index.html / style.css / js/{net,ga,flock,...}.js        # evolution lab
```

## Safety

No autonomous flight. No browser → motor commands. Propellers off until the staged checks in `docs/SAFETY.md` pass. LoRa stays disabled behind a stub until pins, antenna, and regional limits are documented.

## Docs

- `docs/ARCHITECTURE.md`
- `docs/TELEMETRY_PROTOCOL.md`
- `docs/LORA_TRANSPORT.md`
- `docs/GROUND_STATION.md`
- `docs/AIRCRAFT_FIRMWARE.md`
- `docs/HARDWARE_COMPATIBILITY.md`
- `docs/SAFETY.md`
- `docs/ROADMAP.md`

## License

MIT
