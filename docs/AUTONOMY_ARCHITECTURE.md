# Autonomy architecture

## Goal

Hardware-independent autonomy **infrastructure** with a deterministic simulation backend.  
ESP32-S3 is the first **native** reference boundary; external FC is a separate adapter.  
This milestone does **not** authorize real autonomous flight or actuator commands.

## Layers

1. **Contracts** (`js/autonomy/types.js`) — modes, failsafes, capabilities, policies  
2. **State machine** — legal transitions only  
3. **Safety supervisor** — outranks mission/swarm; never fabricates sensors  
4. **Mission** — plan validation, waypoint progression (NED meters)  
5. **FlightBackend** — simulation | native (S3 boundary) | external_fc  
6. **Capability message v1** — separate from telemetry v1 44-byte frames  
7. **App Autonomy view** — sim controls only

## Frames & units

- Position: NED meters relative to home  
- Time: host_ms / sensor timestamps labeled by source  
- Battery: millivolts  

## Physical path status

| Item | Status |
|------|--------|
| Telemetry v1 | Intact |
| Actuator / motor path | **Not implemented** |
| Browser arming | **Not implemented** |
| Mission RF command | **Disabled** |
| hardware_validated | **Always false** until validation docs pass |
