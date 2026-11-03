/**
 * Explicit little-endian encode/decode — no struct packing assumptions.
 */
#include "telemetry_v1.h"

static void put_u16(uint8_t *p, uint16_t v) {
  p[0] = (uint8_t)(v & 0xff);
  p[1] = (uint8_t)((v >> 8) & 0xff);
}

static void put_u32(uint8_t *p, uint32_t v) {
  p[0] = (uint8_t)(v & 0xff);
  p[1] = (uint8_t)((v >> 8) & 0xff);
  p[2] = (uint8_t)((v >> 16) & 0xff);
  p[3] = (uint8_t)((v >> 24) & 0xff);
}

static void put_i16(uint8_t *p, int16_t v) {
  put_u16(p, (uint16_t)v);
}

static uint16_t get_u16(const uint8_t *p) {
  return (uint16_t)p[0] | ((uint16_t)p[1] << 8);
}

static uint32_t get_u32(const uint8_t *p) {
  return (uint32_t)p[0] | ((uint32_t)p[1] << 8) |
         ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static int16_t get_i16(const uint8_t *p) {
  return (int16_t)get_u16(p);
}

uint16_t ns_crc16(const uint8_t *data, size_t len) {
  uint16_t crc = 0xffff;
  for (size_t i = 0; i < len; i++) {
    crc ^= (uint16_t)data[i] << 8;
    for (int b = 0; b < 8; b++) {
      if (crc & 0x8000)
        crc = (uint16_t)((crc << 1) ^ 0x1021);
      else
        crc = (uint16_t)(crc << 1);
    }
  }
  return crc;
}

bool ns_encode_telemetry(const ns_telemetry_t *t, uint8_t out[NS_FRAME_SIZE]) {
  if (!t || !out) return false;
  out[0] = NS_MAGIC0;
  out[1] = NS_MAGIC1;
  out[2] = NS_PROTO_VERSION;
  out[3] = NS_PACKET_TELEMETRY;
  put_u32(out + 4, t->aircraft_id);
  put_u16(out + 8, t->sequence);
  put_u32(out + 10, t->source_ms);
  put_u16(out + 14, t->uptime_s);
  put_u16(out + 16, t->status);
  put_u16(out + 18, t->batt_mv);
  put_i16(out + 20, t->accel_x);
  put_i16(out + 22, t->accel_y);
  put_i16(out + 24, t->accel_z);
  put_i16(out + 26, t->gyro_x);
  put_i16(out + 28, t->gyro_y);
  put_i16(out + 30, t->gyro_z);
  put_i16(out + 32, t->altitude_cm);
  put_i16(out + 34, t->temp_c10);
  put_u16(out + 36, t->diag);
  put_u16(out + 38, t->reserved);
  uint16_t crc = ns_crc16(out, 40);
  put_u16(out + 40, crc);
  return true;
}

bool ns_decode_telemetry(const uint8_t *in, size_t len, ns_telemetry_t *out) {
  if (!in || !out || len < NS_FRAME_SIZE) return false;
  if (in[0] != NS_MAGIC0 || in[1] != NS_MAGIC1) return false;
  if (in[2] != NS_PROTO_VERSION) return false;
  if (in[3] != NS_PACKET_TELEMETRY) return false;
  uint16_t expect = ns_crc16(in, 40);
  uint16_t got = get_u16(in + 40);
  if (expect != got) return false;

  out->aircraft_id = get_u32(in + 4);
  out->sequence    = get_u16(in + 8);
  out->source_ms   = get_u32(in + 10);
  out->uptime_s    = get_u16(in + 14);
  out->status      = get_u16(in + 16);
  out->batt_mv     = get_u16(in + 18);
  out->accel_x     = get_i16(in + 20);
  out->accel_y     = get_i16(in + 22);
  out->accel_z     = get_i16(in + 24);
  out->gyro_x      = get_i16(in + 26);
  out->gyro_y      = get_i16(in + 28);
  out->gyro_z      = get_i16(in + 30);
  out->altitude_cm = get_i16(in + 32);
  out->temp_c10    = get_i16(in + 34);
  out->diag        = get_u16(in + 36);
  out->reserved    = get_u16(in + 38);
  return true;
}
