# Flight state machine

States: DISARMED → PREFLIGHT → READY → MANUAL | ASSISTED | AUTONOMOUS → RETURN_HOME | LANDING → LANDED; FAILSAFE; FAULT.

Invalid transitions are rejected. Safety may force FAILSAFE/FAULT/RETURN_HOME/LANDING per policy.

See `AutonomyTypes.LEGAL_TRANSITIONS` in `js/autonomy/types.js` and tests in `tests/autonomy/`.
