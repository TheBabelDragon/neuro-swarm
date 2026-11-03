/**
 * Ground station ESP32 target.
 *
 * - LoRa RX (when adapter present)
 * - Validate packets, track multi-aircraft state
 * - Local Wi-Fi AP + HTTP + WebSocket for phone dashboard
 * - Bounded clients / storage
 * - Never crash on malformed packets
 *
 * Full ESP-IDF WiFi/HTTP/WS integration is left as the platform port.
 * This file defines the receive path and state machine boundaries.
 */
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>

#include "../common/protocol/telemetry_v1.h"
#include "../platform/lora_transport.h"

#define NS_GS_MAX_AIRCRAFT 16
#define NS_GS_MAX_CLIENTS  4

typedef struct {
  uint32_t aircraft_id;
  ns_telemetry_t last;
  int16_t rssi_dbm;
  float snr_db;
  uint32_t recv_ms;
  uint16_t last_seq;
  uint32_t packets;
  uint32_t missing;
  bool occupied;
} ns_gs_slot_t;

static ns_gs_slot_t g_slots[NS_GS_MAX_AIRCRAFT];
static uint32_t g_ms = 0;

static ns_gs_slot_t *find_or_alloc(uint32_t id) {
  for (int i = 0; i < NS_GS_MAX_AIRCRAFT; i++) {
    if (g_slots[i].occupied && g_slots[i].aircraft_id == id)
      return &g_slots[i];
  }
  for (int i = 0; i < NS_GS_MAX_AIRCRAFT; i++) {
    if (!g_slots[i].occupied) {
      memset(&g_slots[i], 0, sizeof(g_slots[i]));
      g_slots[i].occupied = true;
      g_slots[i].aircraft_id = id;
      return &g_slots[i];
    }
  }
  return NULL; /* full — drop new identity */
}

static void ingest_frame(const uint8_t *buf, size_t len,
                         const ns_radio_rx_meta_t *meta) {
  ns_telemetry_t t;
  if (!ns_decode_telemetry(buf, len, &t)) {
    /* malformed — discard, never crash */
    return;
  }
  ns_gs_slot_t *s = find_or_alloc(t.aircraft_id);
  if (!s) return;

  if (s->packets > 0) {
    uint16_t expect = (uint16_t)(s->last_seq + 1u);
    if (t.sequence != expect) {
      uint16_t gap = (uint16_t)(t.sequence - expect);
      if (gap < 0x8000u) s->missing += gap;
    }
  }
  s->last = t;
  s->last_seq = t.sequence;
  s->packets++;
  s->recv_ms = g_ms;
  if (meta && meta->valid) {
    s->rssi_dbm = meta->rssi_dbm;
    s->snr_db = meta->snr_db;
  }
  /* Platform port: push to WebSocket clients here */
}

static void ground_poll(void) {
  uint8_t buf[NS_FRAME_SIZE + 16];
  size_t n = 0;
  ns_radio_rx_meta_t meta;
  if (ns_lora_receive(buf, sizeof(buf), &n, &meta)) {
    ingest_frame(buf, n, &meta);
  }
  g_ms += 10;
}

#ifdef NS_HOST_TEST
int main(void) {
  (void)ns_lora_init();
  /* Synthesize one valid frame and ingest */
  ns_telemetry_t t = {0};
  t.aircraft_id = 0x1001;
  t.sequence = 1;
  t.status = NS_STATUS_OK | NS_STATUS_DEMO;
  t.batt_mv = 11700;
  t.accel_z = 1000;
  t.altitude_cm = NS_INVALID_I16;
  t.temp_c10 = NS_INVALID_I16;
  uint8_t frame[NS_FRAME_SIZE];
  ns_encode_telemetry(&t, frame);
  ns_radio_rx_meta_t meta = { .rssi_dbm = -70, .snr_db = 7.5f, .valid = true };
  ingest_frame(frame, NS_FRAME_SIZE, &meta);
  printf("ground host ingest ok aircraft=%u packets=%u\n",
         (unsigned)g_slots[0].aircraft_id, (unsigned)g_slots[0].packets);
  for (int i = 0; i < 3; i++) ground_poll();
  return 0;
}
#endif
