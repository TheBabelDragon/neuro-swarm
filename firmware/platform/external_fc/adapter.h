/**
 * External FC adapter interface — no vendor binding.
 */
#ifndef NS_EXTERNAL_FC_ADAPTER_H
#define NS_EXTERNAL_FC_ADAPTER_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
  NS_FC_ACK_OK = 0,
  NS_FC_ACK_REJECTED = 1,
  NS_FC_ACK_UNSUPPORTED = 2,
  NS_FC_ACK_UNAVAILABLE = 3
} ns_fc_ack_t;

typedef struct {
  bool connected;
  bool armed;
  bool failsafe;
  bool backend_healthy;
  uint32_t last_update_ms;
} ns_fc_status_t;

/** Poll status; returns false if adapter not configured. */
bool ns_fc_poll_status(ns_fc_status_t *out);

/** Submit navigation intent — no-op / reject until configured. */
ns_fc_ack_t ns_fc_request_nav(uint8_t nav_opcode, const uint8_t *payload, uint16_t len);

#ifdef __cplusplus
}
#endif

#endif
