# Flight backends

| Backend | Location | Actuators |
|---------|----------|-----------|
| simulation | `js/autonomy/sim-backend.js` | none |
| native ESP32-S3 | `firmware/platform/esp32-s3/` | none in this milestone |
| external FC | `firmware/platform/external_fc/` | none; stub rejects nav |

Simulation test success does not enable physical backends.
