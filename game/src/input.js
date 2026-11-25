// Keyboard and pointer input. Held keys give a move direction; one-shot presses
// (use a station, pause) are queued as bit flags and taken once by the loop, so
// a press between two frames is never lost and never counted twice. A mouse
// click sets a walk target on the floor — clicking a station walks there and
// uses it on arrival.

export const ACTION_USE = 1;
export const ACTION_PAUSE = 2;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const USE = new Set(['KeyE', 'Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(canvas, toLogical) {
  const held = { up: false, down: false, left: false, right: false };
  let actions = 0;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) held.up = true;
    else if (DOWN.has(event.code)) held.down = true;
    else if (LEFT.has(event.code)) held.left = true;
    else if (RIGHT.has(event.code)) held.right = true;
    else if (USE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_USE;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) held.up = false;
    else if (DOWN.has(event.code)) held.down = false;
    else if (LEFT.has(event.code)) held.left = false;
    else if (RIGHT.has(event.code)) held.right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    held.up = false;
    held.down = false;
    held.left = false;
    held.right = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const point = toLogical(event.clientX - rect.left, event.clientY - rect.top);
    click = point;
  });

  return {
    /** Normalised move direction from the held keys, { mx, my }. */
    direction() {
      const mx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const my = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      return { mx, my };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last click's logical point, if any, and clears it. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
