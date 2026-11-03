#include "identity.h"

#ifndef NS_AIRCRAFT_ID
#define NS_AIRCRAFT_ID 0x00001001u
#endif

uint32_t ns_aircraft_id(void) {
  /* Future: read NVS, MAC-derived, or hardware strap. */
  return NS_AIRCRAFT_ID;
}
