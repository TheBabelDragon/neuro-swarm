/**
 * Transport abstraction independent of radio chipset.
 * Chipset-specific adapters implement these entry points.
 *
 * NO invented GPIO / frequency / antenna claims.
 * Radio remains disabled until a concrete adapter is configured
 * and regional parameters are documented for the deployment locale.
 */
#ifndef NS_LORA_TRANSPORT_H
#define NS_LORA_TRANSPORT_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
  int16_t rssi_dbm;
  float   snr_db;
  bool    valid;
} ns_radio_rx_meta_t;

typedef struct {
  bool initialized;
  bool tx_ok;
  bool rx_ok;
  uint32_t tx_count;
  uint32_t rx_count;
  uint32_t tx_fail;
  uint32_t rx_fail;
  const char *adapter_name;
} ns_radio_diag_t;

/**
 * Initialize radio. Returns false if hardware not present / not configured.
 * Must be safe to call when radio is absent (fail soft).
 */
bool ns_lora_init(void);

/** Transmit raw payload. Returns false on failure or unconfigured radio. */
bool ns_lora_transmit(const uint8_t *data, size_t len);

/**
 * Non-blocking receive attempt.
 * Copies up to max_len bytes into buf; sets *out_len and meta.
 * Returns true if a packet was taken.
 */
bool ns_lora_receive(uint8_t *buf, size_t max_len, size_t *out_len,
                     ns_radio_rx_meta_t *meta);

void ns_lora_get_diag(ns_radio_diag_t *out);

#ifdef __cplusplus
}
#endif

#endif
