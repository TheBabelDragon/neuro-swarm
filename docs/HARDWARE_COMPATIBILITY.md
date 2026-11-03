# Hardware Compatibility — Flying Breadboard

## Intent

Low-voltage **prototyping** airframe for telemetry bring-up.

## Documented elements (requirements, not claims of completion)

| Area | Notes |
|------|-------|
| Frame | 3D-printed; propeller clearance mandatory |
| Breadboard | Solderless for logic-level only |
| ESP32 | Mounted with vibration isolation path |
| Motors / ESC | Mounted off-breadboard; rated wiring |
| Battery | Retention + appropriate gauge power path |
| Sensors | IMU/ADC placement TBD per revision |
| LoRa | Antenna placement away from motor noise; part TBD |
| Disarm | Independent motor-disarm mechanism required before any prop test |

## Electrical rules

- Breadboard: **low-voltage logic only**
- Motor and battery current: separate rated distribution
- Explicit non-connections must be listed per wiring diagram revision

## No claims

This repository revision does **not** claim:

- A finished BOM
- Verified radio link budget
- Flightworthiness
- Regulatory certification

See `SAFETY.md` for staged verification.
