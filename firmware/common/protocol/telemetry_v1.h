/**
 * Neuro-Swarm Telemetry Protocol v1 — C header
 * Explicit field layout. Do NOT cast structs onto the wire.
 * Little-endian serialization only. Frame size = 44 bytes.
 */
#ifndef NS_TELEMETRY_V1_H
#define NS_TELEMETRY_V1_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define NS_PROTO_VERSION       1
#define NS_PACKET_TELEMETRY    0x01
#define NS_FRAME_SIZE          44
#define NS_MAGIC0              0x4Eu /* 'N' */
#define NS_MAGIC1              0x53u /* 'S' */
#define NS_INVALID_I16         0x7FFF

/* Status flags */
#define NS_STATUS_OK           0x0001u
#define NS_STATUS_SENSOR_FAULT 0x0002u
#define NS_STATUS_RADIO_FAULT  0x0004u
#define NS_STATUS_LOW_BATTERY  0x0008u
#define NS_STATUS_ARMED        0x0010u
#define NS_STATUS_GPS_FIX      0x0020u
#define NS_STATUS_ALT_VALID    0x0040u
#define NS_STATUS_TEMP_VALID   0x0080u
#define NS_STATUS_DEMO         0x8000u

typedef struct {
  uint32_t aircraft_id;
  uint16_t sequence;
  uint32_t source_ms;
  uint16_t uptime_s;
  uint16_t status;
  uint16_t batt_mv;
  int16_t  accel_x;   /* milli-g */
  int16_t  accel_y;
  int16_t  accel_z;
  int16_t  gyro_x;    /* centi-deg/s */
  int16_t  gyro_y;
  int16_t  gyro_z;
  int16_t  altitude_cm; /* NS_INVALID_I16 if unknown */
  int16_t  temp_c10;    /* 0.1 C; NS_INVALID_I16 if unknown */
  uint16_t diag;
  uint16_t reserved;
} ns_telemetry_t;

/** CRC-16/CCITT-FALSE over data[0..len-1] */
uint16_t ns_crc16(const uint8_t *data, size_t len);

/** Encode into out[NS_FRAME_SIZE]. Returns true on success. */
bool ns_encode_telemetry(const ns_telemetry_t *t, uint8_t out[NS_FRAME_SIZE]);

/** Decode & validate. Returns true if magic/version/type/CRC OK. */
bool ns_decode_telemetry(const uint8_t *in, size_t len, ns_telemetry_t *out);

#ifdef __cplusplus
}
#endif

#endif /* NS_TELEMETRY_V1_H */
