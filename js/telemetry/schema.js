/**
 * Neuro-Swarm Telemetry Protocol v1
 * Compact, transport-independent binary contract for physical aircraft.
 * Target frame size: 44 bytes (including integrity CRC16).
 *
 * Byte order: little-endian throughout.
 * All multi-byte integers and fixed-point values are little-endian.
 *
 * This module is pure JS and runs in browser and Node (host tests).
 */
const TelemetrySchema = (() => {
  const PROTOCOL_VERSION = 1;
  const PACKET_TYPE_TELEMETRY = 0x01;
  const FRAME_SIZE = 44;

  // Status flags (bit field, uint16)
  const STATUS = {
    OK: 0x0001,
    SENSOR_FAULT: 0x0002,
    RADIO_FAULT: 0x0004,
    LOW_BATTERY: 0x0008,
    ARMED: 0x0010,          // motors armed (info only; no remote control in v1)
    GPS_FIX: 0x0020,
    ALTITUDE_VALID: 0x0040,
    TEMP_VALID: 0x0080,
    DEMO: 0x8000,           // synthetic / demo source
  };

  /**
   * Layout (offsets in bytes):
   *  0  magic          uint8   0xNS (0x4E 0x53) — two bytes "NS"
   *  2  version        uint8
   *  3  packet_type    uint8
   *  4  aircraft_id    uint32  stable unique ID
   *  8  sequence       uint16  wraps
   * 10  source_ms      uint32  aircraft uptime / source clock (ms)
   * 14  uptime_s       uint16  whole seconds of uptime (capped)
   * 16  status         uint16  flags
   * 18  batt_mv        uint16  battery millivolts
   * 20  accel_x        int16   milli-g
   * 22  accel_y        int16   milli-g
   * 24  accel_z        int16   milli-g
   * 26  gyro_x         int16   centi-deg/s
   * 28  gyro_y         int16   centi-deg/s
   * 30  gyro_z         int16   centi-deg/s
   * 32  altitude_cm    int16   cm relative (optional; 0x7FFF = invalid)
   * 34  temp_c10       int16   0.1 °C (optional; 0x7FFF = invalid)
   * 36  diag           uint16  free diagnostic nibble/word
   * 38  reserved       uint16  future / padding
   * 40  crc16          uint16  CRC-16/CCITT-FALSE over bytes 0..39
   * 42  (end)          total 44
   */

  const MAGIC0 = 0x4e; // 'N'
  const MAGIC1 = 0x53; // 'S'
  const INVALID_INT16 = 0x7fff;

  function crc16Ccitt(data, offset, len) {
    let crc = 0xffff;
    for (let i = 0; i < len; i++) {
      crc ^= data[offset + i] << 8;
      for (let b = 0; b < 8; b++) {
        if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
        else crc = (crc << 1) & 0xffff;
      }
    }
    return crc;
  }

  function clampInt16(v) {
    if (v == null || Number.isNaN(v)) return INVALID_INT16;
    const n = Math.round(v);
    if (n > 32767) return 32767;
    if (n < -32768) return -32768;
    return n;
  }

  function writeU16(view, off, v) {
    view.setUint16(off, v & 0xffff, true);
  }
  function writeI16(view, off, v) {
    view.setInt16(off, v, true);
  }
  function writeU32(view, off, v) {
    view.setUint32(off, v >>> 0, true);
  }

  /**
   * Encode a telemetry object into a 44-byte ArrayBuffer.
   * @param {object} t
   * @returns {ArrayBuffer}
   */
  function encode(t) {
    const buf = new ArrayBuffer(FRAME_SIZE);
    const view = new DataView(buf);
    const u8 = new Uint8Array(buf);

    u8[0] = MAGIC0;
    u8[1] = MAGIC1;
    u8[2] = PROTOCOL_VERSION;
    u8[3] = PACKET_TYPE_TELEMETRY;

    writeU32(view, 4, t.aircraftId >>> 0);
    writeU16(view, 8, (t.sequence || 0) & 0xffff);
    writeU32(view, 10, (t.sourceMs || 0) >>> 0);
    writeU16(view, 14, Math.min(0xffff, Math.max(0, t.uptimeS | 0)));
    writeU16(view, 16, (t.status || 0) & 0xffff);
    writeU16(view, 18, Math.min(0xffff, Math.max(0, t.battMv | 0)));

    writeI16(view, 20, clampInt16(t.accelX));
    writeI16(view, 22, clampInt16(t.accelY));
    writeI16(view, 24, clampInt16(t.accelZ));
    writeI16(view, 26, clampInt16(t.gyroX));
    writeI16(view, 28, clampInt16(t.gyroY));
    writeI16(view, 30, clampInt16(t.gyroZ));

    const alt = t.altitudeCm == null ? INVALID_INT16 : clampInt16(t.altitudeCm);
    const temp = t.tempC10 == null ? INVALID_INT16 : clampInt16(t.tempC10);
    writeI16(view, 32, alt);
    writeI16(view, 34, temp);
    writeU16(view, 36, (t.diag || 0) & 0xffff);
    writeU16(view, 38, (t.reserved || 0) & 0xffff);

    const crc = crc16Ccitt(u8, 0, 40);
    writeU16(view, 40, crc);
    return buf;
  }

  /**
   * Decode and validate a frame.
   * @param {ArrayBuffer|Uint8Array} data
   * @returns {{ok:true, telemetry:object}|{ok:false, error:string}}
   */
  function decode(data) {
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (u8.byteLength < FRAME_SIZE) {
      return { ok: false, error: "frame_too_short" };
    }
    if (u8[0] !== MAGIC0 || u8[1] !== MAGIC1) {
      return { ok: false, error: "bad_magic" };
    }
    const version = u8[2];
    if (version !== PROTOCOL_VERSION) {
      return { ok: false, error: "version_mismatch", version };
    }
    if (u8[3] !== PACKET_TYPE_TELEMETRY) {
      return { ok: false, error: "unknown_packet_type", type: u8[3] };
    }

    const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const expectedCrc = crc16Ccitt(u8, 0, 40);
    const gotCrc = view.getUint16(40, true);
    if (expectedCrc !== gotCrc) {
      return { ok: false, error: "crc_mismatch" };
    }

    const altitudeRaw = view.getInt16(32, true);
    const tempRaw = view.getInt16(34, true);

    const telemetry = {
      version,
      packetType: PACKET_TYPE_TELEMETRY,
      aircraftId: view.getUint32(4, true),
      sequence: view.getUint16(8, true),
      sourceMs: view.getUint32(10, true),
      uptimeS: view.getUint16(14, true),
      status: view.getUint16(16, true),
      battMv: view.getUint16(18, true),
      accelX: view.getInt16(20, true),
      accelY: view.getInt16(22, true),
      accelZ: view.getInt16(24, true),
      gyroX: view.getInt16(26, true),
      gyroY: view.getInt16(28, true),
      gyroZ: view.getInt16(30, true),
      altitudeCm: altitudeRaw === INVALID_INT16 ? null : altitudeRaw,
      tempC10: tempRaw === INVALID_INT16 ? null : tempRaw,
      diag: view.getUint16(36, true),
      reserved: view.getUint16(38, true),
      crc: gotCrc,
    };
    return { ok: true, telemetry };
  }

  function isStatus(flags, bit) {
    return (flags & bit) !== 0;
  }

  return {
    PROTOCOL_VERSION,
    PACKET_TYPE_TELEMETRY,
    FRAME_SIZE,
    STATUS,
    INVALID_INT16,
    encode,
    decode,
    crc16Ccitt,
    isStatus,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = TelemetrySchema;
}
