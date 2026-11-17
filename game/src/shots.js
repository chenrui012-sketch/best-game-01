// The screenshot scenes behind ?shot=title|play|upgrade|victory. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot (keep away from foes and their
// bullets, chase sparks when safe, always fire at the nearest hollow, spend
// the nova into a crowd), so the frame is what a real game looks like and
// the same seed always gives the same frame. No wall clock anywhere: the
// scenes run on the fixed step, so two runs are byte-identical.
import { STEP, VIEW } from './config.js';
import { clamp } from './random.js';
import { makeEnemy, spawnPoint } from './enemies.js';
import { chooseUpgrade, createWorld, resetRun, startWave, stepWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_VICTORY } from './world.js';

const SAMPLE = STEP;

// Upgrade picks, best first, for the autopilot's draft.
const PICK_ORDER = ['twin', 'heavy', 'rapid', 'pierce', 'heart', 'swift', 'magnet', 'dynamo', 'longburn', 'aegis'];

function nearest(list, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const o of list) {
    const d = (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y);
    if (d < bestD) { bestD = d; best = o; }
  }
  return { o: best, d: Math.sqrt(bestD) };
}

// The autopilot's input for one step: where to move, where to aim, whether
// to fire or spend the nova. Movement samples eight directions and takes
// the one that keeps the most room from foes and their bullets, stays near
// the middle of the arena, and sweeps up sparks when nothing is close.
function autopilot(world) {
  const p = world.player;
  let bestA = 0;
  let bestScore = -Infinity;
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2;
    const nx = clamp(p.x + Math.cos(a) * p.speed * 0.4, 20, VIEW.width - 20);
    const ny = clamp(p.y + Math.sin(a) * p.speed * 0.4, 20, VIEW.height - 20);
    let minD = Infinity;
    for (const e of world.enemies) {
      const d = Math.hypot(nx - (e.x + e.vx * 0.4), ny - (e.y + e.vy * 0.4)) - e.radius;
      if (d < minD) minD = d;
    }
    let minB = Infinity;
    for (const b of world.ebullets) {
      const d = Math.hypot(nx - (b.x + b.vx * 0.4), ny - (b.y + b.vy * 0.4));
      if (d < minB) minB = d;
    }
    let score = Math.min(minD, 260) + Math.min(minB, 200) * 0.6;
    score -= Math.hypot(nx - VIEW.width / 2, ny - VIEW.height / 2) * 0.12;
    if (minD > 200 && world.sparks.length > 0) {
      const s = nearest(world.sparks, p.x, p.y);
      if (s.o) score -= Math.hypot(nx - s.o.x, ny - s.o.y) * 0.25;
    }
    if (score > bestScore) { bestScore = score; bestA = a; }
  }
  const mx = Math.cos(bestA);
  const my = Math.sin(bestA);
  // Aim at the nearest hollow.
  const near = nearest(world.enemies, p.x, p.y);
  let ax = p.x + Math.cos(p.angle) * 100;
  let ay = p.y + Math.sin(p.angle) * 100;
  if (near.o) { ax = near.o.x; ay = near.o.y; }
  // Spend the nova into a crowd.
  let nearCount = 0;
  for (const e of world.enemies) {
    if (Math.hypot(e.x - p.x, e.y - p.y) < 380) nearCount += 1;
  }
  const nova = p.novaCharge >= p.novaNeed && nearCount >= 4;
  return { mx, my, ax, ay, fire: true, nova };
}

function fakeInput(auto) {
  return {
    move: () => ({ x: auto.mx, y: auto.my }),
    firing: () => auto.fire,
    pressed: () => false,
    auto,
  };
}

function runSteps(world, input, seconds, stopWhen) {
  const n = Math.floor(seconds / STEP);
  for (let i = 0; i < n; i += 1) {
    const auto = autopilot(world);
    input.auto.mx = auto.mx;
    input.auto.my = auto.my;
    input.auto.ax = auto.ax;
    input.auto.ay = auto.ay;
    input.auto.fire = auto.fire;
    input.auto.nova = auto.nova;
    stepWorld(world, input, STEP, null);
    if (stopWhen && stopWhen(world)) return true;
  }
  return false;
}

function autoDraft(world) {
  // Pick the best offered upgrade by the fixed order.
  let best = 0;
  let bestRank = 99;
  world.choices.forEach((c, i) => {
    const r = PICK_ORDER.indexOf(c.id);
    if (r >= 0 && r < bestRank) { bestRank = r; best = i; }
  });
  chooseUpgrade(world, best, null);
}

// Force the wave-clear path with the arena empty, so the game shows its
// own upgrade or victory screen with real stats.
function forceClear(world) {
  world.enemies = [];
  world.spawnQueue = [];
  world.waveState = 'fight';
  world.mode = SCREEN_PLAY;
  const input = fakeInput({ mx: 0, my: 0, ax: 0, ay: 0, fire: false, nova: false });
  stepWorld(world, input, STEP, null);
}

function playScene(world, seed) {
  // Wave 5, the Hollow King: the whole wave dropped into the arena at
  // once, 12 seconds of fighting — the boss, its radial bullet storm, and
  // four foe kinds converging on the player mid-arena.
  resetRun(world, seed);
  startWave(world, 5);
  while (world.spawnQueue.length > 0) {
    const kind = world.spawnQueue.shift();
    const s = {
      x: 120 + world.rng() * (VIEW.width - 240),
      y: 120 + world.rng() * (VIEW.height - 240),
    };
    world.enemies.push(makeEnemy(kind, s.x, s.y, 5, world.rng));
  }
  const input = fakeInput({ mx: 0, my: 0, ax: 0, ay: 0, fire: true, nova: false });
  const n = Math.floor(12 / STEP);
  for (let i = 0; i < n; i += 1) {
    const auto = autopilot(world);
    input.auto.mx = auto.mx;
    input.auto.my = auto.my;
    input.auto.ax = auto.ax;
    input.auto.ay = auto.ay;
    input.auto.fire = auto.fire;
    input.auto.nova = auto.nova;
    stepWorld(world, input, STEP, null);
    if (world.mode !== SCREEN_PLAY) break;
    if (world.enemies.length < 10) {
      for (let j = 0; j < 4; j += 1) {
        const s = spawnPoint(world.rng, world.player.x, world.player.y);
        world.enemies.push(makeEnemy('drifter', s.x, s.y, 5, world.rng));
      }
    }
  }
  return world.mode;
}

function upgradeScene(world, seed) {
  resetRun(world, seed);
  const input = fakeInput({ mx: 0, my: 0, ax: 0, ay: 0, fire: true, nova: false });
  const cleared = runSteps(world, input, 120, (w) => w.mode === SCREEN_UPGRADE || w.mode === SCREEN_OVER);
  if (!cleared || world.mode !== SCREEN_UPGRADE) forceClear(world);
  return world.mode;
}

function victoryScene(world, seed) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const w = createWorld(seed + attempt);
    w.best = 0;
    resetRun(w, seed + attempt);
    const input = fakeInput({ mx: 0, my: 0, ax: 0, ay: 0, fire: true, nova: false });
    const n = Math.floor(600 / STEP);
    let won = false;
    for (let i = 0; i < n; i += 1) {
      const auto = autopilot(w);
      input.auto.mx = auto.mx;
      input.auto.my = auto.my;
      input.auto.ax = auto.ax;
      input.auto.ay = auto.ay;
      input.auto.fire = auto.fire;
      input.auto.nova = auto.nova;
      stepWorld(w, input, STEP, null);
      if (w.mode === SCREEN_UPGRADE) autoDraft(w);
      if (w.mode === SCREEN_VICTORY) { won = true; break; }
      if (w.mode === SCREEN_OVER) break;
    }
    if (won) {
      Object.keys(w).forEach((k) => { world[k] = w[k]; });
      return world.mode;
    }
  }
  // The pilot could not win outright: stage the victory through the game's
  // own wave-clear path, with the stats a real run earned.
  const w = createWorld(seed);
  w.best = 0;
  resetRun(w, seed);
  const input = fakeInput({ mx: 0, my: 0, ax: 0, ay: 0, fire: true, nova: false });
  runSteps(w, input, 90, (x) => x.mode === SCREEN_OVER);
  Object.keys(w).forEach((k) => { world[k] = w[k]; });
  world.wave = 10;
  forceClear(world);
  return world.mode;
}

/**
 * Set `world` to the named scene (title, play, upgrade or victory; any
 * other name is title) and return the screen to draw.
 */
export function stageShot(name, world, seed) {
  if (name === 'play') return playScene(world, seed);
  if (name === 'upgrade') return upgradeScene(world, seed);
  if (name === 'victory') return victoryScene(world, seed);
  // Title: the arena drifts behind the menu for six seconds.
  const input = fakeInput({ mx: 0, my: 0, ax: 0, ay: 0, fire: false, nova: false });
  const n = Math.floor(6 / STEP);
  for (let i = 0; i < n; i += 1) stepWorld(world, input, STEP, null);
  return world.mode;
}
