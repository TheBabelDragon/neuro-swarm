# LoRa Transport Abstraction

## Interface

`firmware/platform/lora_transport.h`

- `ns_lora_init()`
- `ns_lora_transmit(data, len)`
- `ns_lora_receive(buf, max, &len, &meta)` → RSSI / SNR when available
- `ns_lora_get_diag()`

Default implementation: **`lora_stub.c`** (radio absent, safe no-op).

## Chipset adapters

Adapters (e.g. future `lora_sx1262.c`, `lora_sx127x.c`) must:

1. Document board, pins, antenna path, and regional band in the adapter header.
2. Not hard-code GPIO without a named hardware revision.
3. Enforce duty-cycle / power limits appropriate to the locale.
4. Keep protocol encode/decode out of the adapter.

**No radio is enabled in this branch.** Selecting a chipset is a hardware decision.

## Configuration checklist (before enabling a real adapter)

- [ ] Radio module part number
- [ ] Host MCU pin map (SPI/I²C/RST/BUSY/DIO)
- [ ] Antenna type and connector (documented, not invented)
- [ ] Frequency plan for deployment region (e.g. US915, EU868)
- [ ] Legal EIRP / duty cycle constraints
- [ ] Shared spreading factor, bandwidth, coding rate between air and ground
- [ ] Bench RSSI/SNR sanity test procedure

## Relationship to protocol

Transport carries opaque bytes. Telemetry framing and CRC live in the  
protocol layer so UART, USB, or stub paths remain testable without RF.
