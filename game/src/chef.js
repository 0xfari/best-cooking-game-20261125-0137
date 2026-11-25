// The chef: position, movement, what is carried, and the timed job at a station.
// The chef holds one item at a time. A raw item turns prepared only while the
// chef stands at its station and the job's progress runs to the end; a pan job
// left running past its grace burns the item.

import { CHEF, FLOOR } from './config.js';
import { BURN_GRACE, INGREDIENTS, STATION_STOVE } from './recipes.js';

export function createChef() {
  return {
    x: (FLOOR.x + FLOOR.width) / 2,
    y: (FLOOR.y + FLOOR.height) / 2 + 40,
    carry: null,
    /** { station, seconds, needed } while a chop or cook is running, else null. */
    job: null,
    /** Click-to-move destination, or null. */
    target: null,
    /** Station to use on arrival after a click, or null. */
    pendingStation: null,
    facing: 1,
  };
}

export function resetChef(chef) {
  chef.x = (FLOOR.x + FLOOR.width) / 2;
  chef.y = (FLOOR.y + FLOOR.height) / 2 + 40;
  chef.carry = null;
  chef.job = null;
  chef.target = null;
  chef.pendingStation = null;
  chef.facing = 1;
}

/** Move the chef by a normalised direction for dt seconds, staying on the floor. */
export function moveChef(chef, mx, my, dt) {
  if (mx === 0 && my === 0) return;
  const length = Math.hypot(mx, my);
  const nx = mx / length;
  const ny = my / length;
  chef.x = Math.min(FLOOR.x + FLOOR.width, Math.max(FLOOR.x, chef.x + nx * CHEF.speed * dt));
  chef.y = Math.min(FLOOR.y + FLOOR.height, Math.max(FLOOR.y, chef.y + ny * CHEF.speed * dt));
  if (nx !== 0) chef.facing = nx > 0 ? 1 : -1;
}

/** Steer toward a point; returns true on arrival. */
export function walkToward(chef, point, dt) {
  const dx = point.x - chef.x;
  const dy = point.y - chef.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 6) return true;
  moveChef(chef, dx, dy, dt);
  return false;
}

/** Start a chop/cook job for the carried raw item at its station. */
export function startJob(chef, stationId) {
  const ingredient = INGREDIENTS[chef.carry.ingredient];
  chef.job = { station: stationId, seconds: 0, needed: ingredient.seconds };
}

/** Advance the running job by dt. Returns 'done', 'burnt', 'holding', 'working' or 'idle'.
 * A chop finishes itself; a pan job, once done, keeps heating until the chef
 * lifts it off with another use press — leave it past its grace and it burns. */
export function advanceJob(chef, dt) {
  if (chef.job === null) return 'idle';
  chef.job.seconds += dt;
  if (chef.job.seconds >= chef.job.needed) {
    if (chef.job.station === STATION_STOVE) {
      if (chef.job.seconds >= chef.job.needed + BURN_GRACE) {
        chef.carry.burnt = true;
        chef.job = null;
        return 'burnt';
      }
      return 'holding';
    }
    chef.carry.prepared = true;
    chef.job = null;
    return 'done';
  }
  return 'working';
}

/** Progress of the running job, 0 to 1 (past 1 while a pan item heads for burnt). */
export function jobProgress(chef) {
  if (chef.job === null) return 0;
  return chef.job.seconds / chef.job.needed;
}

/** True when the carried item is a pan job that is done but still heating. */
export function jobOvercooking(chef) {
  return chef.job !== null && chef.job.station === STATION_STOVE && chef.job.seconds >= chef.job.needed;
}
