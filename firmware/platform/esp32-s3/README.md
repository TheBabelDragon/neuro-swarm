# ESP32-S3 reference platform boundary

First **native** autonomy platform target for Neuro-Swarm.

This directory defines **interfaces and stubs**, not a certified flight controller.

## Modules (planned / stubbed)

| Module | Role | Status |
|--------|------|--------|
| `platform_init` | Board bring-up | stub |
| `clock` | Timing abstraction | stub |
| `imu` | IMU interface | mock on host |
| `baro` | Barometer | mock on host |
| `gnss` | GNSS | mock / optional |
| `battery` | Voltage monitor | mock |
| `sensor_health` | Aggregated validity/freshness | sketched in JS safety |
| `watchdog` | Fault indication | stub |
| `state_estimation` | Attitude/position boundary | not implemented |
| `autonomy_integration` | Wire to autonomy core | host JS sim only |

## Rules

- No assumed pin map, sensor part number, or radio chipset until configured.
- Capability bits must reflect **actual** linked modules, not theoretical ESP32-S3 ability.
- `hardware_validated` remains **false** until `docs/AUTONOMY_VALIDATION.md` stages pass.
- Autonomy core (contracts, safety, mission) stays hardware-independent — this folder is an adapter.

## Host testing

Use `js/autonomy/sim-backend.js` and host tests under `tests/autonomy/`.
Passing simulation tests does **not** make the ESP32-S3 backend operational.
