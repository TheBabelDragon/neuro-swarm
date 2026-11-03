# neuro-swarm

Browser-based **neuroevolution drone swarm**, extended toward a **dual-domain**  
platform: digital simulation + physical ESP32 / LoRa telemetry.

You pilot one quad. The rest are AI agents controlled by tiny neural networks  
that evolve every generation. They start chaotic and become a coordinated hunt.

Pure static site → GitHub Pages for the simulator.  
Physical path: airborne telemetry → LoRa → ground station AP → phone dashboard.

Live sim: https://thebabeldragon.github.io/neuro-swarm/  
Ground UI (static / demo): open `ground.html` locally or from the ground AP.

## Run locally

```bash
python3 -m http.server 8080
```

Then open:

- http://localhost:8080 — simulation
- http://localhost:8080/ground.html — telemetry dashboard (use **Demo**)

## Controls (simulation)

Desktop
- **WASD / arrows** — move
- **Space / Shift** — boost
- **F / J / Ctrl** — fire
- **R** — force new generation

Touch
- **Left side drag** — virtual stick
- **FIRE** / **BOOST** / **GEN**

## Dual-domain layout

```
index.html / style.css / js/{net,ga,flock,audio,input,world,main}.js   # digital swarm
ground.html / ground.css / js/telemetry/* / js/ground/*               # physical dashboard
firmware/{common,airborne,ground-station,platform}/                   # ESP32 targets
hardware/                                                             # Flying Breadboard notes
docs/                                                                 # architecture & safety
tests/                                                                # host protocol tests
```

## Host tests

```bash
node tests/protocol/telemetry.test.js
```

## Branch status

Physical control / autonomous flight are **out of scope**.  
LoRa chipset adapters are stubs until hardware is selected and documented.  
See `docs/SAFETY.md` and `docs/ROADMAP.md`.

## License

MIT
