// The kitchen's floor plan: where every station sits, what it is for, and the
// geometry helpers that decide whether the chef can reach one. Stations live
// along the walls, outside the walkable floor, so the chef's route between them
// is the game's planning puzzle.

import { FLOOR } from './config.js';
import { INGREDIENT_LIST } from './recipes.js';

export const STATION_PANTRY = 'pantry';
export const STATION_BOARD = 'board';
export const STATION_STOVE = 'stove';
export const STATION_PLATE = 'plate';
export const STATION_SERVE = 'serve';
export const STATION_BIN = 'bin';

/** Pantry crates, one per ingredient, stacked down the left wall. */
export const PANTRY = INGREDIENT_LIST.map((ingredient, index) => ({
  id: STATION_PANTRY,
  ingredient,
  x: 16,
  y: 180 + index * 96,
  width: 118,
  height: 82,
}));

export const STATIONS = [
  ...PANTRY,
  { id: STATION_BOARD, x: 340, y: 582, width: 220, height: 104 },
  { id: STATION_STOVE, x: 600, y: 582, width: 280, height: 104 },
  { id: STATION_BIN, x: 176, y: 582, width: 124, height: 104 },
  { id: STATION_PLATE, x: 1080, y: 200, width: 184, height: 180 },
  { id: STATION_SERVE, x: 1080, y: 430, width: 184, height: 180 },
];

export function stationById(id, ingredient) {
  for (const station of STATIONS) {
    if (station.id !== id) continue;
    if (id === STATION_PANTRY && station.ingredient !== ingredient) continue;
    return station;
  }
  return null;
}

/** The station whose rectangle holds point (x, y), or null. */
export function stationAtPoint(x, y) {
  for (const station of STATIONS) {
    if (x >= station.x && x <= station.x + station.width && y >= station.y && y <= station.y + station.height) {
      return station;
    }
  }
  return null;
}

function rectDistance(x, y, rect) {
  const dx = Math.max(rect.x - x, 0, x - (rect.x + rect.width));
  const dy = Math.max(rect.y - y, 0, y - (rect.y + rect.height));
  return Math.hypot(dx, dy);
}

/** True when the chef at (x, y) can reach the station. */
export function stationInReach(x, y, station, reach) {
  return rectDistance(x, y, station) <= reach;
}

/** The nearest station the chef can reach, or null. */
export function nearestReachableStation(x, y, reach) {
  let best = null;
  let bestDistance = Infinity;
  for (const station of STATIONS) {
    const distance = rectDistance(x, y, station);
    if (distance <= reach && distance < bestDistance) {
      bestDistance = distance;
      best = station;
    }
  }
  return best;
}

/** The closest point on the walkable floor to a station: where the chef stands to use it. */
export function approachPoint(station) {
  const cx = station.x + station.width / 2;
  const cy = station.y + station.height / 2;
  const x = Math.min(FLOOR.x + FLOOR.width, Math.max(FLOOR.x, cx));
  const y = Math.min(FLOOR.y + FLOOR.height, Math.max(FLOOR.y, cy));
  return { x, y };
}

/** Clamp a point into the walkable floor. */
export function clampToFloor(x, y) {
  return {
    x: Math.min(FLOOR.x + FLOOR.width, Math.max(FLOOR.x, x)),
    y: Math.min(FLOOR.y + FLOOR.height, Math.max(FLOOR.y, y)),
  };
}
