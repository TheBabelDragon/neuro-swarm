/**
 * Airborne ESP32 target — telemetry source only.
 *
 * Responsibilities:
 *  - identity, sensors, sequence, serialize, LoRa TX attempt
 *  - fail safe when config/hardware missing
 *  - NO browser-originated motor commands
 *  - NO remote flight control in this milestone
 *
 * Build with ESP-IDF or Arduino-ESP32 once board + sensor pins are chosen.
 * This file is structured for host-side review and later porting.
 */
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>

#include "../common/protocol/telemetry_v1.h"
#include "../common/identity/identity.h"
#include "../platform/lora_transport.h"

/* Host simulation clock — replace with millis() on device */
static uint32_t g_ms = 0;
static uint16_t g_seq = 0;

static void read_sensors_stub(ns_telemetry_t *t) {
  /* Until real IMU/ADC is wired, mark sensor fault and emit neutral values. */
  t->accel_x = 0;
  t->accel_y = 0;
  t->accel_z = 1000; /* ~1g */
  t->gyro_x = 0;
  t->gyro_y = 0;
  t->gyro_z = 0;
  t->batt_mv = 0; /* unknown until ADC configured */
  t->altitude_cm = NS_INVALID_I16;
  t->temp_c10 = NS_INVALID_I16;
  t->status = NS_STATUS_SENSOR_FAULT;
}

static void tick_airborne(void) {
  ns_telemetry_t t;
  memset(&t, 0, sizeof(t));
  t.aircraft_id = ns_aircraft_id();
  t.sequence = g_seq++;
  t.source_ms = g_ms;
  t.uptime_s = (uint16_t)(g_ms / 1000u);
  read_sensors_stub(&t);
  t.diag = 0;

  uint8_t frame[NS_FRAME_SIZE];
  if (!ns_encode_telemetry(&t, frame)) {
    return;
  }

  /* Radio optional — flight logic must not depend on TX success */
  if (!ns_lora_transmit(frame, NS_FRAME_SIZE)) {
    t.status |= NS_STATUS_RADIO_FAULT;
    /* still encoded; host can log */
  }

  g_ms += 50; /* nominal 20 Hz */
}

#ifdef NS_HOST_TEST
/* Minimal host entry for compile checks */
int main(void) {
  (void)ns_lora_init();
  for (int i = 0; i < 5; i++) tick_airborne();
  printf("airborne host tick ok id=0x%08x\n", (unsigned)ns_aircraft_id());
  return 0;
}
#endif
