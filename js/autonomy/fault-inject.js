/**
 * TEST-ONLY fault injection surface.
 * Identifiable API: AutonomyFaultInject.wrap(backend)
 * Must NEVER be invoked from AutonomyEngine.attemptRecovery.
 */
const AutonomyFaultInject = (() => {
  function wrap(backend) {
    if (!backend) throw new Error("backend_required");
    return {
      /** @type {true} marks this as test-only */
      __testOnly: true,
      setBattery(mv) {
        if (backend._testSetBattery) backend._testSetBattery(mv);
      },
      setLinkAge(ms) {
        if (backend._testSetLinkAge) backend._testSetLinkAge(ms);
      },
      setSensorsValid(v) {
        if (backend._testSetSensorsValid) backend._testSetSensorsValid(v);
      },
      setSensorStale() {
        if (backend._testSetSensorStale) backend._testSetSensorStale();
      },
      clearSensorFreeze() {
        if (backend._testClearSensorFreeze) backend._testClearSensorFreeze();
      },
      setBackendHealthy(v) {
        if (backend._testSetBackendHealthy) backend._testSetBackendHealthy(v);
      },
      setWatchdog(v) {
        if (backend._testSetWatchdog) backend._testSetWatchdog(v);
      },
      setPosition(ned) {
        if (backend._testSetPosition) backend._testSetPosition(ned);
      },
    };
  }

  return { wrap };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AutonomyFaultInject;
}
