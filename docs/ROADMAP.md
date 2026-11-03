# Roadmap

## Done on foundation branches

- Telemetry v1 + ground app shell  
- Autonomy contracts, state machine, safety supervisor, sim backend  
- ESP32-S3 / external FC boundaries (stubs)  
- Capability message v1 (separate from telemetry)  

## Next

1. Select LoRa module + document region/pins  
2. Wire IMU/baro/ADC; capability bits from real config  
3. ESP-IDF projects; SoftAP + WS  
4. Separately reviewed authenticated mission command design (if ever)  
5. Restrained validation before any actuator path  

Autonomous flight is an **in-scope development goal**; physical autonomy is **not enabled**.
