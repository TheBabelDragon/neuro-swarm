#include "platform.h"

void ns_s3_hw_config_default(ns_s3_hw_config_t *out) {
  if (!out) return;
  out->imu_present = false;
  out->baro_present = false;
  out->gnss_present = false;
  out->battery_adc_present = false;
  out->radio_present = false;
  out->configured = false;
}

void ns_s3_capabilities_from_config(const ns_s3_hw_config_t *cfg,
                                   ns_s3_capabilities_t *out) {
  if (!out) return;
  out->attitude_estimation = false;
  out->altitude_hold = false;
  out->position_hold = false;
  out->waypoint_navigation = false;
  out->return_home = false;
  out->obstacle_avoidance = false;
  if (!cfg || !cfg->configured) return;
  /* Only enable flags when supporting sensors are actually present */
  if (cfg->imu_present) {
    out->attitude_estimation = true;
  }
  if (cfg->imu_present && cfg->baro_present) {
    out->altitude_hold = true;
  }
  if (cfg->imu_present && cfg->baro_present && cfg->gnss_present) {
    out->position_hold = true;
    out->waypoint_navigation = true;
    out->return_home = true;
  }
}

bool ns_s3_hardware_validated(void) {
  return false;
}
