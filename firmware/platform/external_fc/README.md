# External flight-controller adapter boundary

Independent of ESP32-S3 native stack. Vendor/protocol agnostic.

## Required adapter surface

- Flight-state ingestion
- Sensor / backend health
- Capability discovery
- Navigation request submission
- Arming-state reporting
- Failsafe-state reporting
- Command acknowledgement / rejection reasons

## Rules

- Core must not include vendor headers.
- Actuator authority, if ever added, must be delegated, bounded, acknowledged, and safety-supervised.
- This milestone defines the boundary only — no live FC link.
