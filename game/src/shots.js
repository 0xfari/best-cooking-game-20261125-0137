// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world, steered by a simple autopilot that plans a
// route through the kitchen — pantry, then board or stove, then plate, then the
// serve window — so the frame is what a real shift looks like and the same seed
// always gives the same frame.

import { CHEF, STEP } from './config.js';
import { INGREDIENTS } from './recipes.js';
import { approachPoint, nearestReachableStation, stationById, stationInReach } from './kitchen.js';
import { SCREEN_OVER, SCREEN_PLAY } from './render.js';
import { EVENT_OVER } from './world.js';
import { jobProgress } from './chef.js';

const START_LIMIT_SECONDS = 40;
const PLAY_LIMIT_SECONDS = 55;
const END_LIMIT_STEPS = 11000;

/** Steer the chef toward a station; interact once it is the nearest in reach. */
function goTo(world, station) {
  const chef = world.state.chef;
  if (nearestReachableStation(chef.x, chef.y, CHEF.reach) === station) return { mx: 0, my: 0, interact: true };
  const point = approachPoint(station);
  return { mx: point.x - chef.x, my: point.y - chef.y, interact: false };
}

/** The order the plate is already being built for, or the first ticket. */
function targetOrder(world) {
  const plate = world.state.plate;
  const orders = world.state.board.orders;
  for (const order of orders) {
    if (plate.every((ingredient) => order.recipe.needs.includes(ingredient))) return order;
  }
  return orders[0] || null;
}

/** One autopilot decision: where to walk and whether to use a station. */
function autopilot(world) {
  const state = world.state;
  const chef = state.chef;
  if (chef.job !== null) {
    // A finished pan job must be lifted off the heat before it burns.
    if (jobProgress(chef) >= 1) return goTo(world, stationById(chef.job.station));
    return { mx: 0, my: 0, interact: false };
  }

  if (chef.carry !== null) {
    if (chef.carry.burnt) return goTo(world, stationById('bin'));
    if (chef.carry.prepared) return goTo(world, stationById('plate'));
    const ingredient = INGREDIENTS[chef.carry.ingredient];
    return goTo(world, stationById(ingredient.station));
  }

  if (world.plateReady() !== null) return goTo(world, stationById('serve'));

  const order = targetOrder(world);
  if (order === null) return { mx: 0, my: 0, interact: false };
  if (state.plate.length > 0 && !order.recipe.needs.some((need) => !state.plate.includes(need)) && world.plateReady() === null) {
    return goTo(world, stationById('bin'));
  }
  const missing = order.recipe.needs.find((need) => !state.plate.includes(need));
  if (missing === undefined) return goTo(world, stationById('serve'));
  return goTo(world, stationById('pantry', missing));
}

function runSteps(world, limitSteps, stopWhen) {
  for (let index = 0; index < limitSteps; index += 1) {
    const events = world.step(STEP, autopilot(world), false);
    if (events & EVENT_OVER) break;
    if (stopWhen !== null && stopWhen(world)) break;
  }
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    runSteps(world, PLAY_LIMIT_SECONDS / STEP, (w) => w.state.served >= 2);
    const over = world.state.over;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    runSteps(world, END_LIMIT_STEPS, null);
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  // Start: stop the moment the plate completes a dish, so the cover shows the
  // whole loop at once — a finished plate, the chef, the orders and the clock.
  runSteps(world, START_LIMIT_SECONDS / STEP, (w) => w.plateReady() !== null);
  return { screen: SCREEN_PLAY, best: world.state.score };
}
