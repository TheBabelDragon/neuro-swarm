/**
 * Stable aircraft identity.
 * Prefer reading from NVS / OTP / soldered ID resistor network.
 * Fallback: compile-time NS_AIRCRAFT_ID.
 */
#ifndef NS_IDENTITY_H
#define NS_IDENTITY_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/** Return stable 32-bit aircraft ID. Must not be 0. */
uint32_t ns_aircraft_id(void);

#ifdef __cplusplus
}
#endif

#endif
