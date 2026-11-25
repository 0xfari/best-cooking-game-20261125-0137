// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 kitchen is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Every dish, counter and ticket is drawn from flat
// canvas shapes — the kitchen's whole look lives in this file.

import { FIELD, FONT, LIVES, PALETTE, SHIFT_SECONDS } from './config.js';
import { INGREDIENTS, recipeForPlate } from './recipes.js';
import { PANTRY, STATIONS, STATION_BIN, STATION_BOARD, STATION_PANTRY, STATION_PLATE, STATION_SERVE, STATION_STOVE } from './kitchen.js';
import { jobOvercooking, jobProgress } from './chef.js';
import { MAX_ORDERS } from './orders.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const HUD_HEIGHT = 60;
const TICKET = { width: 264, height: 76, gap: 14 };

/** Draw one ingredient as a little dish icon, raw (pale) or prepared (vivid). */
export function drawIngredient(context, ingredientId, x, y, radius, prepared) {
  const ingredient = INGREDIENTS[ingredientId];
  context.save();
  context.translate(x, y);
  if (!prepared) context.globalAlpha = 0.55;
  if (ingredientId === 'noodle') {
    context.strokeStyle = ingredient.color;
    context.lineWidth = Math.max(2, radius / 4);
    context.lineCap = 'round';
    for (let i = -1; i <= 1; i += 1) {
      context.beginPath();
      context.moveTo(-radius, i * radius * 0.45);
      context.bezierCurveTo(-radius / 2, i * radius * 0.45 - radius * 0.5, radius / 2, i * radius * 0.45 + radius * 0.5, radius, i * radius * 0.45);
      context.stroke();
    }
  } else if (ingredientId === 'egg') {
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.ellipse(0, 0, radius, radius * 0.75, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f2a93b';
    context.beginPath();
    context.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
    context.fill();
  } else if (ingredientId === 'tomato') {
    context.fillStyle = ingredient.color;
    context.beginPath();
    context.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#4e9a44';
    context.beginPath();
    context.moveTo(0, -radius * 0.9);
    context.lineTo(-radius * 0.4, -radius * 0.4);
    context.lineTo(radius * 0.4, -radius * 0.4);
    context.closePath();
    context.fill();
  } else if (ingredientId === 'chili') {
    context.strokeStyle = ingredient.color;
    context.lineWidth = Math.max(3, radius / 2.5);
    context.lineCap = 'round';
    context.beginPath();
    context.arc(0, -radius * 0.2, radius * 0.8, Math.PI * 0.15, Math.PI * 0.85);
    context.stroke();
    context.strokeStyle = '#4e9a44';
    context.lineWidth = Math.max(2, radius / 5);
    context.beginPath();
    context.moveTo(-radius * 0.75, -radius * 0.75);
    context.lineTo(-radius * 0.95, -radius * 1.1);
    context.stroke();
  }
  context.restore();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, dpr: 1 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.dpr = ratio;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  /** Canvas CSS pixels (relative to the canvas) into logical kitchen coords. */
  function toLogical(cssX, cssY) {
    return {
      x: (cssX * view.dpr - view.x) / view.scale,
      y: (cssY * view.dpr - view.y) / view.scale,
    };
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function roundRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function drawFloor() {
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.floorDark;
    const tile = 64;
    for (let ty = 0; ty < FIELD.height / tile; ty += 1) {
      for (let tx = 0; tx < FIELD.width / tile; tx += 1) {
        if ((tx + ty) % 2 === 0) context.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, HUD_HEIGHT);
    context.fillStyle = PALETTE.panelEdge;
    context.fillRect(0, HUD_HEIGHT - 4, FIELD.width, 4);
  }

  function drawPantry() {
    for (const crate of PANTRY) {
      const ingredient = INGREDIENTS[crate.ingredient];
      context.fillStyle = PALETTE.counter;
      roundRect(crate.x, crate.y, crate.width, crate.height, 10);
      context.fill();
      context.fillStyle = PALETTE.counterTop;
      roundRect(crate.x + 5, crate.y + 5, crate.width - 10, crate.height - 34, 8);
      context.fill();
      drawIngredient(context, crate.ingredient, crate.x + 30, crate.y + 26, 15, true);
      text(ingredient.name, crate.x + 52, crate.y + 33, 17, '#3d2b1f', 'left', 'bold ');
      text(ingredient.station === 'stove' ? 'cook on stove' : 'chop on board', crate.x + crate.width / 2, crate.y + crate.height - 10, 13, '#5b3d22', 'center');
    }
    text('PANTRY', 75, 168, 18, PALETTE.text, 'center', 'bold ');
  }

  function drawBoard() {
    const station = STATIONS.find((s) => s.id === STATION_BOARD);
    context.fillStyle = PALETTE.counter;
    roundRect(station.x, station.y, station.width, station.height, 10);
    context.fill();
    context.fillStyle = PALETTE.board;
    roundRect(station.x + 14, station.y + 14, station.width - 28, station.height - 40, 8);
    context.fill();
    context.strokeStyle = '#b98d54';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(station.x + 40, station.y + 30);
    context.lineTo(station.x + 120, station.y + 70);
    context.stroke();
    text('CHOPPING BOARD', station.x + station.width / 2, station.y + station.height - 8, 15, '#3d2b1f', 'center', 'bold ');
  }

  function drawStove(state) {
    const station = STATIONS.find((s) => s.id === STATION_STOVE);
    context.fillStyle = PALETTE.stove;
    roundRect(station.x, station.y, station.width, station.height, 10);
    context.fill();
    context.fillStyle = PALETTE.stoveTop;
    roundRect(station.x + 12, station.y + 10, station.width - 24, station.height - 44, 8);
    context.fill();
    const flicker = Math.sin(state.elapsed * 9) * 0.15 + 1;
    for (let burner = 0; burner < 2; burner += 1) {
      const bx = station.x + 70 + burner * 140;
      const by = station.y + 48;
      context.fillStyle = '#22222a';
      context.beginPath();
      context.arc(bx, by, 34, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.flame;
      context.beginPath();
      context.arc(bx, by, 22 * flicker, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.flameCore;
      context.beginPath();
      context.arc(bx, by, 11 * flicker, 0, Math.PI * 2);
      context.fill();
    }
    text('STOVE — watch the pan, it burns!', station.x + station.width / 2, station.y + station.height - 8, 15, '#e8e0d0', 'center', 'bold ');
  }

  function drawPlateCounter(state) {
    const station = STATIONS.find((s) => s.id === STATION_PLATE);
    context.fillStyle = PALETTE.counter;
    roundRect(station.x, station.y, station.width, station.height, 10);
    context.fill();
    context.fillStyle = PALETTE.plate;
    context.beginPath();
    context.ellipse(station.x + station.width / 2, station.y + 78, 72, 46, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#c9bfa8';
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(station.x + station.width / 2, station.y + 78, 58, 34, 0, 0, Math.PI * 2);
    context.stroke();
    const plate = state.plate;
    for (let i = 0; i < plate.length; i += 1) {
      drawIngredient(context, plate[i], station.x + station.width / 2 + (i - (plate.length - 1) / 2) * 42, station.y + 78, 16, true);
    }
    const ready = recipeForPlate(plate) !== null;
    text('PLATING', station.x + station.width / 2, station.y + 26, 17, '#3d2b1f', 'center', 'bold ');
    text(ready ? 'READY TO SERVE!' : 'build the dish here', station.x + station.width / 2, station.y + station.height - 14, 15, ready ? '#2e6b4f' : '#5b3d22', 'center', 'bold ');
  }

  function drawServeWindow(state) {
    const station = STATIONS.find((s) => s.id === STATION_SERVE);
    context.fillStyle = PALETTE.serve;
    roundRect(station.x, station.y, station.width, station.height, 10);
    context.fill();
    context.fillStyle = PALETTE.serveTop;
    roundRect(station.x + 10, station.y + 10, station.width - 20, station.height - 60, 8);
    context.fill();
    context.fillStyle = '#dcefe4';
    context.fillRect(station.x + 24, station.y + 30, station.width - 48, 10);
    context.fillRect(station.x + 24, station.y + 52, station.width - 48, 10);
    text('SERVE WINDOW', station.x + station.width / 2, station.y + 100, 17, '#eaf6ee', 'center', 'bold ');
    text('E here with a ready plate', station.x + station.width / 2, station.y + station.height - 14, 14, '#cfe8d8', 'center');
    void state;
  }

  function drawBin() {
    const station = STATIONS.find((s) => s.id === STATION_BIN);
    context.fillStyle = PALETTE.bin;
    roundRect(station.x, station.y, station.width, station.height, 10);
    context.fill();
    context.fillStyle = '#3f4750';
    roundRect(station.x + 16, station.y + 14, station.width - 32, station.height - 44, 8);
    context.fill();
    text('BIN', station.x + station.width / 2, station.y + station.height - 8, 15, '#dfe6ec', 'center', 'bold ');
  }

  function drawOrderTicket(order, x) {
    const y = 70;
    const fraction = Math.max(0, order.patience / order.maxPatience);
    const urgent = order.patience < 12;
    context.fillStyle = urgent ? '#5a2320' : PALETTE.panel;
    roundRect(x, y, TICKET.width, TICKET.height, 10);
    context.fill();
    context.strokeStyle = urgent ? PALETTE.red : PALETTE.panelEdge;
    context.lineWidth = 2;
    roundRect(x, y, TICKET.width, TICKET.height, 10);
    context.stroke();
    text(order.recipe.name, x + 12, y + 24, 18, PALETTE.text, 'left', 'bold ');
    text(`${order.recipe.points} pts`, x + TICKET.width - 12, y + 24, 15, PALETTE.gold, 'right', 'bold ');
    for (let i = 0; i < order.recipe.needs.length; i += 1) {
      drawIngredient(context, order.recipe.needs[i], x + 26 + i * 36, y + 48, 13, true);
    }
    context.fillStyle = '#3a2c1e';
    roundRect(x + 12, y + TICKET.height - 16, TICKET.width - 24, 8, 4);
    context.fill();
    context.fillStyle = fraction > 0.5 ? PALETTE.green : fraction > 0.25 ? PALETTE.gold : PALETTE.red;
    roundRect(x + 12, y + TICKET.height - 16, (TICKET.width - 24) * fraction, 8, 4);
    context.fill();
    text(`${Math.ceil(order.patience)}s`, x + TICKET.width - 12, y + 52, 15, urgent ? '#ffb3ad' : PALETTE.muted, 'right');
  }

  function drawOrderBoard(state) {
    text('ORDERS', 160, 96, 16, PALETTE.muted, 'left', 'bold ');
    const orders = state.board.orders;
    for (let i = 0; i < MAX_ORDERS; i += 1) {
      const x = 236 + i * (TICKET.width + TICKET.gap);
      if (i < orders.length) drawOrderTicket(orders[i], x);
      else {
        context.fillStyle = 'rgba(0,0,0,0.25)';
        roundRect(x, 70, TICKET.width, TICKET.height, 10);
        context.fill();
        text('waiting for customers…', x + TICKET.width / 2, 112, 15, PALETTE.muted, 'center');
      }
    }
  }

  function drawHud(state) {
    text('WOK RUSH', 24, 40, 30, PALETTE.gold, 'left', 'bold ');
    text(`Score ${state.score}`, 220, 40, 26, PALETTE.text, 'left', 'bold ');
    const timeFraction = Math.max(0, state.timeLeft / SHIFT_SECONDS);
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = Math.floor(state.timeLeft % 60);
    const clock = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    const urgent = state.timeLeft <= 30;
    context.fillStyle = '#3a2c1e';
    roundRect(560, 18, 260, 26, 8);
    context.fill();
    context.fillStyle = urgent ? PALETTE.red : PALETTE.gold;
    roundRect(560, 18, 260 * timeFraction, 26, 8);
    context.fill();
    text(clock, 690, 40, 24, urgent ? '#ffb3ad' : PALETTE.text, 'center', 'bold ');
    text(`Day ${state.level}`, 860, 40, 22, PALETTE.text, 'left', 'bold ');
    text(`Served ${state.served}`, 960, 40, 22, PALETTE.green, 'left');
    for (let life = 0; life < LIVES; life += 1) {
      context.fillStyle = life < state.lives ? PALETTE.red : '#4a3226';
      context.beginPath();
      const hx = 1130 + life * 34;
      const hy = 30;
      context.arc(hx - 6, hy, 8, 0, Math.PI * 2);
      context.arc(hx + 6, hy, 8, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(hx - 13, hy + 2);
      context.lineTo(hx, hy + 16);
      context.lineTo(hx + 13, hy + 2);
      context.closePath();
      context.fill();
    }
  }

  function drawChef(state) {
    const chef = state.chef;
    context.save();
    context.translate(chef.x, chef.y);
    context.fillStyle = 'rgba(0,0,0,0.3)';
    context.beginPath();
    context.ellipse(0, 20, 24, 8, 0, 0, Math.PI * 2);
    context.fill();
    // Apron body.
    context.fillStyle = '#2e7d6b';
    roundRect(-20, -8, 40, 34, 12);
    context.fill();
    // Head and toque.
    context.fillStyle = '#f2c89b';
    context.beginPath();
    context.arc(0, -18, 15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(-9, -30, 9, 0, Math.PI * 2);
    context.arc(0, -34, 10, 0, Math.PI * 2);
    context.arc(9, -30, 9, 0, Math.PI * 2);
    context.fill();
    context.fillRect(-14, -32, 28, 8);
    context.fillStyle = '#241a12';
    context.beginPath();
    context.arc(-5 * chef.facing, -18, 1.8, 0, Math.PI * 2);
    context.arc(5 * chef.facing, -18, 1.8, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // What the chef carries, in a bubble above the hat.
    if (chef.carry !== null) {
      context.fillStyle = chef.carry.burnt ? '#3a3a3a' : '#fff6e8';
      context.beginPath();
      context.arc(chef.x, chef.y - 58, 20, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(chef.x, chef.y - 58, 20, 0, Math.PI * 2);
      context.stroke();
      if (chef.carry.burnt) {
        text('X', chef.x, chef.y - 50, 22, '#ff8a80', 'center', 'bold ');
      } else {
        drawIngredient(context, chef.carry.ingredient, chef.x, chef.y - 58, 13, chef.carry.prepared);
      }
    }

    // Chop/cook progress ring and warning while a pan overcooks.
    if (chef.job !== null) {
      const progress = jobProgress(chef);
      const overcooking = jobOvercooking(chef);
      context.strokeStyle = 'rgba(0,0,0,0.45)';
      context.lineWidth = 7;
      context.beginPath();
      context.arc(chef.x, chef.y - 58, 26, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = overcooking ? PALETTE.red : PALETTE.gold;
      context.lineWidth = 7;
      context.beginPath();
      context.arc(chef.x, chef.y - 58, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress));
      context.stroke();
      if (overcooking) text('BURNING!', chef.x, chef.y - 92, 18, PALETTE.red, 'center', 'bold ');
    }

    // Click-to-move target marker.
    if (chef.target !== null) {
      context.strokeStyle = 'rgba(255,246,232,0.7)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(chef.target.x, chef.target.y, 8, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawPopups(state) {
    for (const popup of state.popups) {
      context.globalAlpha = Math.min(1, popup.life);
      text(popup.text, popup.x, popup.y, 22, popup.color, 'center', 'bold ');
    }
    context.globalAlpha = 1;
    if (state.message !== '') {
      text(state.message, FIELD.width / 2, 700, 20, PALETTE.text, 'center', 'bold ');
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 34;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(10,6,4,0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    roundRect(x, y, width, height, 16);
    context.stroke();
    text(title, FIELD.width / 2, y + 64, 46, accent || PALETTE.gold, 'center', 'bold ');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + 112 + i * 34, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 30, 22, PALETTE.gold, 'center', 'bold ');
  }

  /** Paint one frame: the kitchen, then the HUD or a panel for the screen. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor();
    drawPantry();
    drawBoard();
    drawStove(state);
    drawPlateCounter(state);
    drawServeWindow(state);
    drawBin();
    drawChef(state);
    drawPopups(state);
    drawOrderBoard(state);
    drawHud(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('WOK RUSH', [
        'Run the busiest little kitchen in town.',
        'Grab ingredients, chop or cook them, plate the dish,',
        'and serve it before the customer walks out.',
        `Best score ${best}`,
      ], 'Press Space or click to start the shift');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The stove is off and the customers wait.'], 'Press P to get back to work', PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      const lines = [
        `Score ${state.score}   •   Dishes served ${state.served}   •   Orders lost ${state.missed}`,
        `Best score ${best}`,
        state.lives <= 0 ? 'Too many customers walked out.' : 'The shift is over — the kitchen is closed.',
      ];
      drawPanel('Shift over', lines, 'Press Space or click to work another shift', PALETTE.text);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toLogical };
}
