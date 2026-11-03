/**
 * ESP32-S3 platform boundary — capability discovery only at this stage.
 * No actuator authority. No assumed GPIO.
 */
#ifndef NS_ESP32S3_PLATFORM_H
#define NS_ESP32S3_PLATFORM_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
  bool imu_present;
  bool baro_present;
  bool gnss_present;
  bool battery_adc_present;
  bool radio_present;
  bool configured; /* false until explicit board config applied */
} ns_s3_hw_config_t;

typedef struct {
  bool attitude_estimation;
  bool altitude_hold;
  bool position_hold;
  bool waypoint_navigation;
  bool return_home;
  bool obstacle_avoidance;
} ns_s3_capabilities_t;

/** Default: nothing present until configured. */
void ns_s3_hw_config_default(ns_s3_hw_config_t *out);

/** Derive capabilities strictly from config — never invent true flags. */
void ns_s3_capabilities_from_config(const ns_s3_hw_config_t *cfg,
                                   ns_s3_capabilities_t *out);

bool ns_s3_hardware_validated(void); /* always false in this milestone */

#ifdef __cplusplus
}
#endif

#endif
