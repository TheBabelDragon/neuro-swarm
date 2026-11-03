#include "adapter.h"

bool ns_fc_poll_status(ns_fc_status_t *out) {
  if (!out) return false;
  out->connected = false;
  out->armed = false;
  out->failsafe = false;
  out->backend_healthy = false;
  out->last_update_ms = 0;
  return false;
}

ns_fc_ack_t ns_fc_request_nav(uint8_t nav_opcode, const uint8_t *payload, uint16_t len) {
  (void)nav_opcode;
  (void)payload;
  (void)len;
  return NS_FC_ACK_UNAVAILABLE;
}
