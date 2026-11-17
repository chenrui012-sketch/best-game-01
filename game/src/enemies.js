// Enemy kinds and how each one moves, attacks and dies. The world owns the
// arrays; this module owns the per-kind behaviour, so a new foe is a new
// entry here, not a change to the loop.
import { ENEMY, VIEW } from './config.js';
import { angleTo, clamp, range } from './random.js';

// Spawn just outside the arena, on the edge farthest from the player.
export function spawnPoint(rng, px, py) {
  const side = Math.floor(rng() * 4);
  const m = 40;
  if (side === 0) return { x: range(rng, 0, VIEW.width), y: -m };
  if (side === 1) return { x: VIEW.width + m, y: range(rng, 0, VIEW.height) };
  if (side === 2) return { x: range(rng, 0, VIEW.width), y: VIEW.height + m };
  return { x: -m, y: range(rng, 0, VIEW.height) };
}

export function makeEnemy(kind, x, y, wave, rng) {
  const base = ENEMY[kind];
  const r = rng || Math.random;
  const hpScale = 1 + (wave - 1) * 0.12;
  return {
    kind,
    x, y,
    vx: 0, vy: 0,
    hp: Math.round(base.hp * hpScale),
    maxHp: Math.round(base.hp * hpScale),
    radius: base.radius,
    speed: base.speed * (1 + Math.min(0.4, (wave - 1) * 0.03)),
    score: base.score,
    color: base.color,
    t: 0,
    state: 'enter',
    stateT: 0,
    angle: 0,
    fireCd: range(r, 1, 2),
    flashT: 0,
    seed: r() * Math.PI * 2,
  };
}

// Steer one enemy for dt. `world` is the live state (player position,
// arrays to push enemy bullets into, the rng, the spawn hook for splitters).
export function updateEnemy(e, dt, world) {
  const p = world.player;
  const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
  const ang = Math.atan2(p.y - e.y, p.x - e.x);
  e.t += dt;
  if (e.flashT > 0) e.flashT -= dt;

  if (e.kind === 'drifter') {
    e.vx += Math.cos(ang) * e.speed * 2.4 * dt;
    e.vy += Math.sin(ang) * e.speed * 2.4 * dt;
  } else if (e.kind === 'dart') {
    // Wander, then telegraph and lunge at the player.
    if (e.state === 'enter' || e.state === 'wander') {
      e.stateT += dt;
      e.vx += Math.cos(e.seed + e.t * 0.7) * 60 * dt;
      e.vy += Math.sin(e.seed + e.t * 0.7) * 60 * dt;
      if (e.stateT > 1.6 && d < 420) { e.state = 'aim'; e.stateT = 0; e.angle = ang; }
    } else if (e.state === 'aim') {
      e.stateT += dt;
      e.vx *= 0.9;
      e.vy *= 0.9;
      e.angle = ang;
      if (e.stateT > 0.45) {
        e.state = 'lunge';
        e.stateT = 0;
        e.vx = Math.cos(ang) * e.speed * 3.4;
        e.vy = Math.sin(ang) * e.speed * 3.4;
      }
    } else {
      e.stateT += dt;
      if (e.stateT > 0.55) { e.state = 'wander'; e.stateT = 0; }
    }
  } else if (e.kind === 'spitter') {
    // Hold a ring around the player and spit slow orbs.
    const want = 300;
    const radial = d < want - 40 ? -1 : d > want + 40 ? 1 : 0;
    e.vx += Math.cos(ang) * radial * e.speed * 2 * dt;
    e.vy += Math.sin(ang) * radial * e.speed * 2 * dt;
    e.vx += Math.cos(ang + Math.PI / 2) * 40 * dt;
    e.vy += Math.sin(ang + Math.PI / 2) * 40 * dt;
    e.fireCd -= dt;
    if (e.fireCd <= 0 && d < 560) {
      e.fireCd = 2.3;
      world.ebullets.push({
        x: e.x, y: e.y,
        vx: Math.cos(ang) * 210, vy: Math.sin(ang) * 210,
        radius: 7, dmg: 1, life: 4,
      });
    }
  } else if (e.kind === 'splitter' || e.kind === 'mini') {
    e.vx += Math.cos(ang) * e.speed * 2.2 * dt;
    e.vy += Math.sin(ang) * e.speed * 2.2 * dt;
  } else if (e.kind === 'boss') {
    // The Hollow King: slow pursuit, radial bursts, and it calls drifters.
    e.stateT += dt;
    e.vx += Math.cos(ang) * e.speed * 1.6 * dt;
    e.vy += Math.sin(ang) * e.speed * 1.6 * dt;
    e.fireCd -= dt;
    if (e.fireCd <= 0) {
      e.fireCd = 2.6;
      const n = 10 + Math.floor(world.wave / 2);
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2 + e.t;
        world.ebullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(a) * 170, vy: Math.sin(a) * 170,
          radius: 8, dmg: 1, life: 5,
        });
      }
      if (world.enemies.length < 14) {
        for (let i = 0; i < 2; i += 1) {
          const s = spawnPoint(world.rng, p.x, p.y);
          world.enemies.push(makeEnemy('drifter', s.x, s.y, world.wave, world.rng));
        }
      }
    }
    if (e.stateT > 7) {
      e.stateT = 0;
      e.vx = Math.cos(ang) * e.speed * 4;
      e.vy = Math.sin(ang) * e.speed * 4;
    }
  }

  // Soft speed cap and drag, then integrate.
  const sp = Math.hypot(e.vx, e.vy);
  const cap = e.kind === 'dart' && e.state === 'lunge' ? e.speed * 3.4 : e.speed * 1.6;
  if (sp > cap) { e.vx = (e.vx / sp) * cap; e.vy = (e.vy / sp) * cap; }
  e.vx *= (1 - 0.6 * dt);
  e.vy *= (1 - 0.6 * dt);
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.x = clamp(e.x, -80, VIEW.width + 80);
  e.y = clamp(e.y, -80, VIEW.height + 80);
}

// What a dead enemy leaves behind: sparks (nova fuel) and, rarely, a heart.
export function deathDrops(e, world) {
  const sparks = e.kind === 'boss' ? 30 : e.kind === 'splitter' ? 6 : 3;
  for (let i = 0; i < sparks; i += 1) {
    const a = world.rng() * Math.PI * 2;
    world.sparks.push({
      x: e.x, y: e.y,
      vx: Math.cos(a) * range(world.rng, 40, 160),
      vy: Math.sin(a) * range(world.rng, 40, 160),
      value: 1, t: 0,
    });
  }
  if (e.kind === 'splitter') {
    for (let i = 0; i < 2; i += 1) {
      const m = makeEnemy('mini', e.x + range(world.rng, -14, 14), e.y + range(world.rng, -14, 14), world.wave, world.rng);
      world.enemies.push(m);
    }
  }
  if (e.kind !== 'boss' && world.rng() < 0.02) {
    world.pickups.push({ kind: 'heart', x: e.x, y: e.y, t: 0 });
  }
}
