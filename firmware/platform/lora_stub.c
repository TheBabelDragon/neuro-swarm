/**
 * Default stub adapter — radio not present.
 * Replace with chipset-specific file (e.g. lora_sx1262.c) when hardware
 * is selected and regional parameters are documented.
 */
#include "lora_transport.h"

static ns_radio_diag_t g_diag = {
  .initialized = false,
  .adapter_name = "stub-no-radio",
};

bool ns_lora_init(void) {
  g_diag.initialized = false;
  g_diag.adapter_name = "stub-no-radio";
  return false;
}

bool ns_lora_transmit(const uint8_t *data, size_t len) {
  (void)data;
  (void)len;
  g_diag.tx_fail++;
  return false;
}

bool ns_lora_receive(uint8_t *buf, size_t max_len, size_t *out_len,
                     ns_radio_rx_meta_t *meta) {
  (void)buf;
  (void)max_len;
  if (out_len) *out_len = 0;
  if (meta) {
    meta->valid = false;
    meta->rssi_dbm = 0;
    meta->snr_db = 0;
  }
  g_diag.rx_fail++;
  return false;
}

void ns_lora_get_diag(ns_radio_diag_t *out) {
  if (out) *out = g_diag;
}
