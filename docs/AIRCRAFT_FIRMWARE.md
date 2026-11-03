# Airborne Firmware

## Scope (this milestone)

- Stable aircraft ID
- Sensor read path (stub until hardware wired)
- Sequence generation
- Telemetry encode
- Optional LoRa TX (stub by default)
- Diagnostics flags (sensor/radio fault)

## Explicit non-goals

- Remote motor control
- Browser → aircraft command channel
- Autonomy / closed-loop flight

Critical functions must not depend on radio availability.

## Fail-safe

If sensors or radio are missing:

- Set `SENSOR_FAULT` / `RADIO_FAULT`
- Still produce frames when possible (for bench link tests with demo flags)
- Do not arm motors (no arm path in v1 firmware)

## Build notes

Sources under `firmware/airborne/` and `firmware/common/` are structured for  
ESP-IDF or Arduino-ESP32 integration. Host compile with `-DNS_HOST_TEST`  
exercises encode path without hardware.
