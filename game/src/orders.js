// The order board: tickets arrive, their patience drains, and a plate that
// matches a ticket earns its points plus a tip for the patience still left.
// An expired ticket costs the kitchen one of its three strikes.

import { RECIPES, plateMatches } from './recipes.js';
import { pick } from './random.js';

export const MAX_ORDERS = 3;

export function createOrderBoard(random) {
  return {
    random,
    orders: [],
    nextId: 1,
    spawnTimer: 2,
  };
}

export function resetOrderBoard(board) {
  board.orders.length = 0;
  board.nextId = 1;
  board.spawnTimer = 2;
}

/** Seconds between new tickets at this level: the rush tightens as the shift goes on. */
export function spawnInterval(level) {
  return Math.max(6, 13 - level * 1.5);
}

/** How long a ticket waits before it walks out, at this level. */
export function patienceFor(level) {
  return Math.max(30, 52 - level * 4);
}

export function addOrder(board, level) {
  if (board.orders.length >= MAX_ORDERS) return null;
  const recipe = pick(board.random, RECIPES);
  const order = {
    id: board.nextId,
    recipe,
    patience: patienceFor(level),
    maxPatience: patienceFor(level),
  };
  board.nextId += 1;
  board.orders.push(order);
  return order;
}

/**
 * Advance the board one step. Returns the orders that expired this step.
 * A fresh ticket arrives when the timer runs out and the board has room.
 */
export function tickOrders(board, dt, level) {
  const expired = [];
  for (let i = board.orders.length - 1; i >= 0; i -= 1) {
    const order = board.orders[i];
    order.patience -= dt;
    if (order.patience <= 0) {
      expired.push(order);
      board.orders.splice(i, 1);
    }
  }
  board.spawnTimer -= dt;
  if (board.spawnTimer <= 0) {
    addOrder(board, level);
    board.spawnTimer += spawnInterval(level);
  }
  return expired;
}

/** The ticket a plate completes, or null. */
export function matchingOrder(board, plate) {
  for (const order of board.orders) {
    if (plateMatches(plate, order.recipe)) return order;
  }
  return null;
}

/** Points for serving `order` now: base plus a tip for patience left. */
export function servePoints(order) {
  const fraction = Math.max(0, order.patience / order.maxPatience);
  return order.recipe.points + Math.round(order.recipe.points * 0.5 * fraction);
}
