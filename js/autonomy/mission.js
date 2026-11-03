/**
 * Mission plan validation and waypoint progression (software-level).
 * NED meters relative to home. No actuator authority.
 */
const AutonomyMission = (() => {
  function validatePlan(plan, capabilities) {
    if (!plan || typeof plan !== "object") {
      return { ok: false, error: "missing_plan" };
    }
    if (!Array.isArray(plan.waypoints) || plan.waypoints.length === 0) {
      return { ok: false, error: "no_waypoints" };
    }
    if (!capabilities.waypoint_navigation && plan.waypoints.length > 1) {
      return { ok: false, error: "capability_waypoint_navigation" };
    }
    if (!capabilities.position_hold && !capabilities.waypoint_navigation) {
      return { ok: false, error: "capability_navigation" };
    }
    for (let i = 0; i < plan.waypoints.length; i++) {
      const w = plan.waypoints[i];
      if (w == null || typeof w.north_m !== "number" || typeof w.east_m !== "number") {
        return { ok: false, error: "bad_waypoint", index: i };
      }
      if (typeof w.down_m !== "number") {
        return { ok: false, error: "bad_waypoint_alt", index: i };
      }
      if (w.acceptance_radius_m != null && w.acceptance_radius_m <= 0) {
        return { ok: false, error: "bad_acceptance", index: i };
      }
    }
    return { ok: true };
  }

  function createRuntime(plan) {
    return {
      plan,
      index: 0,
      paused: false,
      aborted: false,
      completed: false,
      home: plan.home_ned || { north_m: 0, east_m: 0, down_m: 0 },
    };
  }

  function currentWaypoint(rt) {
    if (!rt || rt.completed || rt.aborted) return null;
    return rt.plan.waypoints[rt.index] || null;
  }

  function distanceHorizontal(a, b) {
    const dn = (a.north_m || 0) - (b.north_m || 0);
    const de = (a.east_m || 0) - (b.east_m || 0);
    return Math.sqrt(dn * dn + de * de);
  }

  /**
   * Advance if within acceptance radius. Deterministic.
   */
  function tick(rt, position_ned) {
    if (!rt || rt.paused || rt.aborted || rt.completed) return rt;
    const wp = currentWaypoint(rt);
    if (!wp) {
      rt.completed = true;
      return rt;
    }
    const accept = wp.acceptance_radius_m != null ? wp.acceptance_radius_m : 1.5;
    const d = distanceHorizontal(position_ned, wp);
    const altOk =
      Math.abs((position_ned.down_m || 0) - (wp.down_m || 0)) < (wp.acceptance_alt_m || 1.0);
    if (d <= accept && altOk) {
      rt.index += 1;
      if (rt.index >= rt.plan.waypoints.length) {
        rt.completed = true;
      }
    }
    return rt;
  }

  function pause(rt) {
    if (rt) rt.paused = true;
    return rt;
  }
  function resume(rt) {
    if (rt && !rt.aborted && !rt.completed) rt.paused = false;
    return rt;
  }
  function abort(rt) {
    if (rt) {
      rt.aborted = true;
      rt.paused = false;
    }
    return rt;
  }

  return {
    validatePlan,
    createRuntime,
    currentWaypoint,
    tick,
    pause,
    resume,
    abort,
    distanceHorizontal,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AutonomyMission;
}
