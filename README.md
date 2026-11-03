# neuro-swarm

**Physical swarm control platform** with an **autonomy foundation** (simulation + contracts).

ESP32 aircraft · LoRa telemetry · ground app · hardware-independent autonomy core.

```
Telemetry v1 (44 B)  →  ground app destinations
Autonomy core        →  sim backend (host) · S3 / FC boundaries (stubs)
Capability message v1 (JSON, separate from telemetry frame)
```

## App destinations

Overview · Fleet · Aircraft · Radio · **Autonomy** · System  
Evolution lab: `lab.html`

Autonomy view runs a **simulation-only** state machine. No remote arming, no motor commands.

## Branches

- `feat/physical-swarm-lora` — telemetry + app shell  
- `feat/autonomous-flight-foundation` — this autonomy work (not merged to main)

## Run

```bash
python3 -m http.server 8080
# http://localhost:8080/  → app (Demo + Autonomy)

node tests/protocol/telemetry.test.js
node tests/autonomy/autonomy.test.js
```

## Safety

Physical autonomous actuators: **not enabled**.  
`hardware_validated`: **false**.  
See `docs/FLIGHT_SAFETY.md`, `docs/AUTONOMY_VALIDATION.md`.

## License

MIT
