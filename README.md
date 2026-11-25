[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/0xfari/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/0xfari/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

# Wok Rush

An original time-management cooking game for the [best-cooking-game-20261125-0137 bounty](https://make.fun/bounty/best-cooking-game-20261125-0137). You are the only cook in a tiny kitchen: grab ingredients from the pantry, chop them on the board or cook them on the stove, build each dish on the plating counter, and run it to the serve window before the customer's patience runs out.

## How it plays

- **Four ingredients, two stations:** Noodle and Egg go on the stove, Tomato and Chili go on the chopping board. A raw ingredient can never go on a plate.
- **Four recipes, different combinations:** Golden Noodle (noodle + tomato), Sunny Plate (egg + tomato), Spicy Noodle (noodle + chili), and the three-ingredient Sunrise Special (egg + noodle + chili).
- **Pressure that grows:** a new order arrives every few seconds, patience shrinks as the shift's day rises, and a pan left heating too long burns — bin it and start again.
- **Score and strikes:** serving earns the dish's points plus a tip for patience left. Three customers walking out ends the shift early; otherwise the 150-second clock decides it.
- **Plan your route:** the pantry, board, stove, plate and serve window sit on different walls, so every dish is a little route-planning puzzle.

## Controls

Move with `WASD` or arrow keys, press `E` or `Space` to use the station you are standing at, `P` to pause. Or click anywhere to walk there — click a station to walk to it and use it on arrival. `Space` or click starts the shift and restarts after it ends.

## Run it

```sh
node serve.ts        # serves game/ at http://localhost:8080
```

No build step, no network request, no library: plain static files under `game/`, with the entry point `main.ts` copying `game/` and `screenshots/` to `/output` and writing `dossier.json`. Sound is synthesized WebAudio bleeps, no audio files.

## Layout

- `game/src/config.js` — tuning numbers, palette, layout constants
- `game/src/random.js` — seeded random (mulberry32) for repeatable orders
- `game/src/recipes.js` — ingredients, stations, the four recipes, plate matching
- `game/src/kitchen.js` — the floor plan: station rectangles and reach geometry
- `game/src/chef.js` — the chef: movement, carrying, chop/cook jobs, burning
- `game/src/orders.js` — the order board: spawning, patience, expiry, tips
- `game/src/world.js` — the rules: using stations, serving, score, strikes, clock
- `game/src/input.js` — keyboard and click-to-move input
- `game/src/audio.js` — synthesized sound effects (WebAudio, no files)
- `game/src/render.js` — the kitchen, the dishes, the HUD, the screens
- `game/src/shots.js` — the screenshot scenes (`?shot=start|play|end`) and autopilot
- `game/src/main.js` — boot and the one loop

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
