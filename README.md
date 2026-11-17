# EMBERFALL — Defend the Last Ember

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/chenrui012-sketch/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/chenrui012-sketch/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A complete, original neon arena survival game that runs offline in a
desktop browser from static files. No network requests, no build step, no
libraries: one canvas, eleven small ES modules, and WebAudio sound
synthesised in code.

## The game

You are the last ember in a dark arena. Hollows drift in from the night —
drifters that chase, darts that telegraph and lunge, spitters that hold
range and fire, splitters that break into minis — and every fifth wave the
Hollow King arrives with a radial bullet storm. Hold the line through ten
waves and dawn breaks.

- **Goal:** survive all 10 waves. Clear a wave, draft one of three
  upgrades, face the next. After the win, endless mode keeps going.
- **Score:** kills build a combo multiplier; sparks charge the Nova blast;
  the best score is kept in localStorage.
- **Controls:** WASD / arrows to move, mouse to aim, hold click or Space
  to shoot, Q or right-click for Nova when charged, P to pause, R to
  restart, M to mute. Menus work with mouse or keyboard (Enter, 1/2/3).
- **Feedback on every action:** particles, screen shake, hit-stop on the
  boss kill, floating score text, a wave banner, and a synth sound for
  every shot, pop, pickup, nova and fanfare.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` through any static file server. The game is
`game/` — `index.html` plus `src/*.js` modules.

## Screenshots

`shots.json` lists the four deterministic scenes (`?shot=title|play|
upgrade|victory&seed=<n>`): each plays the real rules forward from a
seeded world with a simple autopilot, so the same seed always renders the
same frame. `screenshots/` holds the four renders taken in headless
Chromium.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the kit's vendored `vendor/makefun-game.ts`.

## Files

| File | Job |
| --- | --- |
| `game/index.html` | The page: canvas, styles, module entry |
| `game/src/main.js` | Boot, fixed-step loop, screen routing, shot mode |
| `game/src/world.js` | State, the fixed step, waves, scoring, win/lose |
| `game/src/enemies.js` | Enemy kinds and their behaviour |
| `game/src/render.js` | All drawing: arena, HUD, every screen |
| `game/src/upgrades.js` | The between-wave draft |
| `game/src/audio.js` | Synthesised sound effects and music |
| `game/src/input.js` | Keyboard and mouse |
| `game/src/config.js` | Tuning, palette, wave plans |
| `game/src/random.js` | Seeded randomness |
| `game/src/shots.js` | Deterministic screenshot scenes + autopilot |
| `game/src/storage.js` | Best score in localStorage |

## License

MIT — see `LICENSE`.
