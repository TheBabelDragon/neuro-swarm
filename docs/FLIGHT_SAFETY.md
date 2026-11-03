# Flight safety supervisor

Evaluates: sensor validity/freshness, nav validity, capabilities, battery thresholds, geofence, mission altitude bounds, backend health, link loss, watchdog.

**Priority:** safety > mission > swarm.

Link-loss policies: HOLD | RETURN_HOME | LAND | DISARM_REQUEST (software signal only).

Default: do **not** continue mission on link loss (RETURN_HOME).

No fabricated sensor substitution.
