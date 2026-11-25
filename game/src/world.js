// Wok Rush rules, with no drawing and no browser in it: the chef, the plate, the
// order board, the shift clock, score and strikes. step() advances one fixed
// step and returns what happened as bit flags, so the caller can react — with a
// sound, a popup, a screen change — without the world knowing about any of them.

import { CHEF, LIVES, SHIFT_SECONDS } from './config.js';
import { createChef, resetChef, moveChef, walkToward, startJob, advanceJob } from './chef.js';
import { INGREDIENTS, makeItem, recipeForPlate } from './recipes.js';
import {
  STATION_BIN, STATION_BOARD, STATION_PANTRY, STATION_PLATE, STATION_SERVE, STATION_STOVE,
  nearestReachableStation, stationById, stationInReach,
} from './kitchen.js';
import { createOrderBoard, resetOrderBoard, tickOrders, matchingOrder, servePoints } from './orders.js';
import { createRandom } from './random.js';

export const EVENT_PICKUP = 1;
export const EVENT_JOB_DONE = 2;
export const EVENT_BURNT = 4;
export const EVENT_SERVED = 8;
export const EVENT_EXPIRED = 16;
export const EVENT_OVER = 32;
export const EVENT_TRASH = 64;
export const EVENT_PLATE = 128;

/** The level rises every 40 seconds of the shift, to a ceiling of 5. */
export function levelFor(elapsed) {
  return Math.min(5, 1 + Math.floor(elapsed / 40));
}

export function createWorld(random) {
  const chef = createChef();
  const board = createOrderBoard(random);
  const state = {
    chef,
    board,
    plate: [],
    score: 0,
    lives: LIVES,
    timeLeft: SHIFT_SECONDS,
    level: 1,
    elapsed: 0,
    served: 0,
    missed: 0,
    over: false,
    popups: [],
    message: '',
    messageTimer: 0,
  };

  function reset() {
    resetChef(chef);
    resetOrderBoard(board);
    state.plate.length = 0;
    state.score = 0;
    state.lives = LIVES;
    state.timeLeft = SHIFT_SECONDS;
    state.level = 1;
    state.elapsed = 0;
    state.served = 0;
    state.missed = 0;
    state.over = false;
    state.popups.length = 0;
    state.message = '';
    state.messageTimer = 0;
  }

  function say(text) {
    state.message = text;
    state.messageTimer = 2.2;
  }

  function popup(x, y, text, color) {
    state.popups.push({ x, y, text, color: color || '#f2c94c', life: 1.4 });
    if (state.popups.length > 8) state.popups.shift();
  }

  /** The ticket the plate on the counter completes right now, or null. */
  function plateReady() {
    return matchingOrder(board, state.plate);
  }

  function useStation(station) {
    if (station.id === STATION_PANTRY) {
      if (chef.carry !== null) { say('Hands full — finish this one first'); return 0; }
      chef.carry = makeItem(station.ingredient);
      popup(chef.x, chef.y - 40, INGREDIENTS[station.ingredient].name, '#fff6e8');
      return EVENT_PICKUP;
    }
    if (station.id === STATION_BOARD || station.id === STATION_STOVE) {
      if (chef.carry === null) { say(station.id === STATION_BOARD ? 'Bring something to chop' : 'Bring something to cook'); return 0; }
      if (chef.carry.burnt) { say('Burnt — bin it'); return 0; }
      if (chef.carry.prepared) { say('Already prepared'); return 0; }
      if (INGREDIENTS[chef.carry.ingredient].station !== station.id) {
        say(INGREDIENTS[chef.carry.ingredient].station === STATION_BOARD ? 'That one needs the chopping board' : 'That one needs the stove');
        return 0;
      }
      if (chef.job !== null) {
        // Lift a finished pan job off the heat.
        if (chef.job.station === station.id && chef.job.seconds >= chef.job.needed) {
          chef.carry.prepared = true;
          chef.job = null;
          popup(chef.x, chef.y - 40, 'Ready!', '#7bc96f');
          return EVENT_JOB_DONE;
        }
        return 0;
      }
      startJob(chef, station.id);
      return 0;
    }
    if (station.id === STATION_PLATE) {
      if (chef.carry === null) { say('Bring a prepared ingredient'); return 0; }
      if (chef.carry.burnt) { say('Burnt — bin it first'); return 0; }
      if (!chef.carry.prepared) { say('Prepare it first — board or stove'); return 0; }
      state.plate.push(chef.carry.ingredient);
      chef.carry = null;
      if (plateReady() !== null) say('Ready to serve!');
      return EVENT_PLATE;
    }
    if (station.id === STATION_SERVE) {
      const order = plateReady();
      if (order === null) { say('No order matches this plate'); return 0; }
      const points = servePoints(order);
      state.score += points;
      state.served += 1;
      board.orders.splice(board.orders.indexOf(order), 1);
      state.plate.length = 0;
      popup(1080, 500, `+${points}`, '#7bc96f');
      return EVENT_SERVED;
    }
    if (station.id === STATION_BIN) {
      if (chef.carry !== null) {
        chef.carry = null;
        chef.job = null;
        say('Binned');
        return EVENT_TRASH;
      }
      if (state.plate.length > 0) {
        state.plate.length = 0;
        say('Plate cleared');
        return EVENT_TRASH;
      }
      say('Nothing to bin');
      return 0;
    }
    return 0;
  }

  /**
   * One fixed step. `ctrl` is { mx, my, interact } — a normalised move direction
   * and an edge-triggered use key. With `demo` set (the title screen's backdrop)
   * the clock and the strikes are frozen, so nothing can end the shift.
   */
  function step(dt, ctrl, demo) {
    let events = 0;
    if (state.over) return events;
    state.elapsed += dt;
    state.level = levelFor(state.elapsed);
    if (!demo) {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        state.over = true;
        return events | EVENT_OVER;
      }
    }

    if (ctrl.mx !== 0 || ctrl.my !== 0) {
      chef.target = null;
      chef.pendingStation = null;
      moveChef(chef, ctrl.mx, ctrl.my, dt);
    } else if (chef.target !== null) {
      if (walkToward(chef, chef.target, dt)) {
        chef.target = null;
        if (chef.pendingStation !== null) {
          const station = chef.pendingStation;
          chef.pendingStation = null;
          events |= useStation(station);
        }
      }
    }

    if (ctrl.interact) {
      const station = nearestReachableStation(chef.x, chef.y, CHEF.reach);
      if (station !== null) events |= useStation(station);
    }

    if (chef.job !== null) {
      const station = stationById(chef.job.station);
      if (station !== null && stationInReach(chef.x, chef.y, station, CHEF.reach + 10)) {
        const result = advanceJob(chef, dt);
        if (result === 'done') {
          events |= EVENT_JOB_DONE;
          popup(chef.x, chef.y - 40, 'Ready!', '#7bc96f');
        } else if (result === 'burnt') {
          events |= EVENT_BURNT;
          popup(chef.x, chef.y - 40, 'Burnt!', '#e5534b');
          say('Burnt! Bin it and start again');
        }
      }
    }

    const expired = tickOrders(board, dt, state.level);
    for (const order of expired) {
      state.missed += 1;
      popup(640, 120, `${order.recipe.name} walked out!`, '#e5534b');
      if (demo) continue;
      state.lives -= 1;
      events |= EVENT_EXPIRED;
      if (state.lives <= 0) {
        state.over = true;
        return events | EVENT_OVER;
      }
    }

    if (state.messageTimer > 0) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) state.message = '';
    }
    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      state.popups[i].life -= dt;
      state.popups[i].y -= 24 * dt;
      if (state.popups[i].life <= 0) state.popups.splice(i, 1);
    }
    return events;
  }

  reset();
  return { state, reset, step, useStation, plateReady, say };
}

export function createWorldWithSeed(seed) {
  return createWorld(createRandom(seed));
}
