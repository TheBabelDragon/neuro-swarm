# Ground Station

## Role

ESP32 firmware target that:

1. Receives LoRa frames (when radio adapter present)
2. Validates via protocol decoder
3. Tracks multiple aircraft identities
4. Hosts a local Wi-Fi access point
5. Serves static dashboard + WebSocket telemetry

Works **without internet**.

## Local access (intended)

- AP SSID / password: configured at firmware build or NVS (not hardcoded secrets in repo)
- Browser: `http://192.168.4.1/ground.html` (typical ESP softAP address)
- WebSocket: `ws://192.168.4.1:81/` (port to be confirmed in platform port)

Exact AP credentials and IP are **platform configuration**, not protocol.

## Bounds

- Max aircraft slots: 16 (firmware)
- Max WS clients: 4 (firmware design target)
- Malformed packets discarded; process continues

## Phone UI

Static files: `ground.html`, `ground.css`, `js/telemetry/*`, `js/ground/*`  
No external CDNs. Demo mode exercises the full UI with synthetic frames.
