# Safety

## Hard rules for this branch

1. No autonomous flight implementation.
2. No remote motor control from browser or ground UI.
3. Propellers off for all electrical and radio bench work until restrained tests.
4. Independent physical disarm path before any motor spin test.

## Staged verification procedure

1. **Firmware compilation** — host and target builds
2. **Sensor verification** — static bench, known orientations
3. **Radio bench test** — controlled distance, no props
4. **Ground-station verification** — AP, HTTP, WebSocket, multi-ID
5. **Phone dashboard verification** — live + demo modes
6. **Telemetry-loss testing** — intentional drop / range edge
7. **Propellers-removed motor verification** — restrained, current-limited
8. **Restrained flight-readiness assessment** — only after 1–7 pass and review

Host-only protocol tests **do not** constitute hardware validation.
