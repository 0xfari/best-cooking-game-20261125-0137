// Wok Rush — every tuning number, colour and layout constant in one place.
// The kitchen is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One service shift lasts this long; when the clock hits zero the shift ends. */
export const SHIFT_SECONDS = 150;

/** Missed (expired) orders the kitchen can absorb before the shift is failed. */
export const LIVES = 3;

export const CHEF = {
  radius: 22,
  speed: 340,
  /** How close the chef must be to a station's edge to use it. */
  reach: 46,
};

/** The walkable floor: stations sit outside it, along the walls. */
export const FLOOR = { x: 150, y: 165, width: 914, height: 530 };

export const PALETTE = {
  backdrop: '#171310',
  floor: '#8a5a33',
  floorDark: '#7a4e2c',
  tile: '#96683c',
  wall: '#3d2b1f',
  counter: '#c98f4e',
  counterTop: '#e0aa68',
  board: '#d9b380',
  stove: '#4a4a52',
  stoveTop: '#33333a',
  flame: '#ff9d2e',
  flameCore: '#ffd23e',
  plate: '#f5f0e6',
  serve: '#2e6b4f',
  serveTop: '#3d8a67',
  bin: '#5b6470',
  panel: '#241a12',
  panelEdge: '#6b4a2a',
  text: '#fff6e8',
  muted: '#c9a37e',
  gold: '#f2c94c',
  red: '#e5534b',
  green: '#7bc96f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'wok-rush.best';
