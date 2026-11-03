# Telemetry Protocol v1

## Goals

- Compact (~44 bytes) for constrained LoRa payloads
- Explicit field widths and little-endian encoding
- No compiler-dependent struct layout on the wire
- Versioned; unknown version rejected
- CRC-16 integrity at application layer

## Frame layout (44 bytes)

| Offset | Size | Type | Field |
|--------|------|------|-------|
| 0 | 2 | u8×2 | Magic `N` `S` (0x4E 0x53) |
| 2 | 1 | u8 | Protocol version = 1 |
| 3 | 1 | u8 | Packet type = 0x01 (telemetry) |
| 4 | 4 | u32 | Aircraft ID |
| 8 | 2 | u16 | Sequence (wraps) |
| 10 | 4 | u32 | Source timestamp (ms) |
| 14 | 2 | u16 | Uptime (seconds, capped) |
| 16 | 2 | u16 | Status flags |
| 18 | 2 | u16 | Battery millivolts |
| 20 | 2 | i16 | Accel X (milli-g) |
| 22 | 2 | i16 | Accel Y |
| 24 | 2 | i16 | Accel Z |
| 26 | 2 | i16 | Gyro X (centi-deg/s) |
| 28 | 2 | i16 | Gyro Y |
| 30 | 2 | i16 | Gyro Z |
| 32 | 2 | i16 | Altitude cm (`0x7FFF` = invalid) |
| 34 | 2 | i16 | Temperature 0.1 °C (`0x7FFF` = invalid) |
| 36 | 2 | u16 | Diagnostic word |
| 38 | 2 | u16 | Reserved |
| 40 | 2 | u16 | CRC-16/CCITT-FALSE over bytes 0..39 |

## Status flags

| Bit | Name |
|-----|------|
| 0x0001 | OK |
| 0x0002 | SENSOR_FAULT |
| 0x0004 | RADIO_FAULT |
| 0x0008 | LOW_BATTERY |
| 0x0010 | ARMED (informational only in v1) |
| 0x0020 | GPS_FIX |
| 0x0040 | ALTITUDE_VALID |
| 0x0080 | TEMP_VALID |
| 0x8000 | DEMO / synthetic |

## Integrity vs radio CRC

Many LoRa chips provide a hardware CRC on the radio PHY payload.  
Application CRC-16 is **additional**: it protects the semantic frame after  
any transport (UART bridge, stub, future mesh). Receivers must verify  
application CRC before accepting measurements.

## Validation rules

- Reject short frames, bad magic, version ≠ 1, unknown type, CRC mismatch
- Sequence wraparound is normal (uint16)
- Duplicates detected via recent-window tracker
- Missing packets estimated from sequence gaps
- Schema evolution: new versions use a new `version` byte; v1 parsers reject them

## Implementations

- JS: `js/telemetry/schema.js`
- C: `firmware/common/protocol/telemetry_v1.{h,c}`
