// The game itself: state, the fixed step, collisions, waves, scoring and
// the win/lose flow. Rendering lives in render.js; this module never draws.
import { COLORS, PLAYER_BASE, VIEW, WIN_WAVE, waveComposition } from './config.js';
import { clamp, dist2, makeRng, range } from './random.js';
import { deathDrops, makeEnemy, spawnPoint, updateEnemy } from './enemies.js';
import { applyUpgrade, rollChoices } from './upgrades.js';
import { loadBest, saveBest } from './storage.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

export function createWorld(seed) {
  const rng = makeRng(seed >>> 0 || 1);
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({ x: rng() * VIEW.width, y: rng() * VIEW.height, r: range(rng, 0.5, 1.8), tw: range(rng, 0, Math.PI * 2), sp: range(rng, 0.4, 1.6) });
  }
  const motes = [];
  for (let i = 0; i < 26; i += 1) {
    motes.push({ x: rng() * VIEW.width, y: rng() * VIEW.height, r: range(rng, 2, 5), vx: range(rng, -8, 8), vy: range(rng, -14, -4), a: range(rng, 0.08, 0.3) });
  }
  return {
    rng,
    mode: SCREEN_TITLE,
    time: 0,
    runTime: 0,
    best: loadBest(),
    player: freshPlayer(),
    bullets: [],
    ebullets: [],
    enemies: [],
    parts: [],
    floats: [],
    pickups: [],
    sparks: [],
    wave: 0,
    score: 0,
    kills: 0,
    combo: 0,
    comboT: 0,
    comboBest: 0,
    spawnQueue: [],
    spawnT: 0,
    waveState: 'idle',
    banner: { text: '', sub: '', t: 0 },
    choices: [],
    taken: {},
    shake: 0,
    hitStop: 0,
    flash: 0,
    novaUsed: 0,
    shotsFired: 0,
    shotsHit: 0,
    stars,
    motes,
    titleT: 0,
    stats: null,
    muted: false,
    endless: false,
  };
}

function freshPlayer() {
  return {
    x: VIEW.width / 2, y: VIEW.height / 2,
    vx: 0, vy: 0,
    angle: -Math.PI / 2,
    hp: PLAYER_BASE.maxHp, maxHp: PLAYER_BASE.maxHp,
    fireCd: 0, invulnT: 0,
    speed: PLAYER_BASE.speed,
    fireInterval: PLAYER_BASE.fireInterval,
    bulletSpeed: PLAYER_BASE.bulletSpeed,
    bulletLife: 0.9,
    damage: PLAYER_BASE.bulletDamage,
    projectiles: PLAYER_BASE.projectiles,
    pierce: PLAYER_BASE.pierce,
    magnet: PLAYER_BASE.magnet,
    novaCharge: 0, novaNeed: PLAYER_BASE.novaNeed, novaRate: 1,
    aegis: 0, aegisMax: 0,
    radius: PLAYER_BASE.radius,
  };
}

export function resetRun(world, seed) {
  const best = world.best;
  const fresh = createWorld(seed === undefined ? (Math.random() * 0xffffffff) >>> 0 : seed >>> 0);
  Object.keys(fresh).forEach((k) => { world[k] = fresh[k]; });
  world.best = best;
  world.mode = SCREEN_PLAY;
  startWave(world, 1);
}

// ---- waves ----

export function startWave(world, n) {
  world.wave = n;
  world.waveState = 'intro';
  world.spawnQueue = waveComposition(n, world.rng);
  world.spawnT = 0.8;
  const boss = world.spawnQueue.includes('boss');
  world.banner = {
    text: boss ? 'THE HOLLOW KING' : `WAVE ${n}`,
    sub: boss ? 'Break the crown. Free the dawn.' : n === WIN_WAVE ? 'Hold the line — dawn is coming.' : '',
    t: 2.2,
  };
  const p = world.player;
  if (p.aegisMax > 0) p.aegis = p.aegisMax;
}

function waveCleared(world) {
  world.waveState = 'clear';
  if (world.wave >= WIN_WAVE && !world.endless) {
    finishRun(world, true);
    return;
  }
  world.choices = rollChoices(world.rng, world.taken);
  world.mode = SCREEN_UPGRADE;
  world.banner = { text: '', sub: '', t: 0 };
}

export function chooseUpgrade(world, index, audio) {
  const up = world.choices[index];
  if (!up) return;
  applyUpgrade(world.player, up, world.taken);
  if (audio) audio.upgrade();
  addFloat(world, world.player.x, world.player.y - 30, up.name, COLORS.gold, 20);
  burst(world, world.player.x, world.player.y, COLORS.gold, 24, 220);
  world.mode = SCREEN_PLAY;
  startWave(world, world.wave + 1);
}

function finishRun(world, won) {
  const stats = {
    score: world.score,
    wave: world.wave,
    kills: world.kills,
    time: world.runTime,
    comboBest: world.comboBest,
    accuracy: world.shotsFired ? Math.round((100 * world.shotsHit) / world.shotsFired) : 0,
    novaUsed: world.novaUsed,
  };
  world.stats = stats;
  if (world.score > world.best) {
    world.best = world.score;
    saveBest(world.score);
    stats.newBest = true;
  }
  world.mode = won ? SCREEN_VICTORY : SCREEN_OVER;
}

// ---- effects ----

export function burst(world, x, y, color, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = world.rng() * Math.PI * 2;
    const s = range(world.rng, speed * 0.2, speed);
    world.parts.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: range(world.rng, 0.3, 0.8), maxLife: 0.8,
      size: range(world.rng, 2, 5), color,
      drag: 2.2,
    });
  }
}

export function addFloat(world, x, y, text, color, size) {
  world.floats.push({ x, y, text, color, size: size || 15, life: 1 });
}

function hurtPlayer(world, dmg, audio) {
  const p = world.player;
  if (p.invulnT > 0 || world.mode !== SCREEN_PLAY) return;
  if (p.aegis > 0) {
    p.aegis -= 1;
    p.invulnT = 0.8;
    burst(world, p.x, p.y, COLORS.cyan, 18, 200);
    if (audio) audio.hit();
    return;
  }
  p.hp -= dmg;
  p.invulnT = 1.2;
  world.shake = Math.max(world.shake, 10);
  world.flash = 0.35;
  burst(world, p.x, p.y, COLORS.red, 26, 260);
  if (audio) audio.hit();
  if (p.hp <= 0) {
    burst(world, p.x, p.y, COLORS.ember, 90, 420);
    burst(world, p.x, p.y, COLORS.white, 40, 300);
    world.shake = 18;
    finishRun(world, false);
    if (audio) audio.gameOver();
  }
}

export function fireNova(world, audio) {
  const p = world.player;
  if (p.novaCharge < p.novaNeed || world.mode !== SCREEN_PLAY) return false;
  p.novaCharge = 0;
  world.novaUsed += 1;
  world.flash = 0.6;
  world.shake = 16;
  burst(world, p.x, p.y, COLORS.emberHot, 70, 520);
  burst(world, p.x, p.y, COLORS.cyan, 40, 380);
  const R = 430;
  for (const e of world.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < R + e.radius) {
      damageEnemy(world, e, 6, audio);
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      e.vx += Math.cos(a) * 520;
      e.vy += Math.sin(a) * 520;
    }
  }
  for (const b of world.ebullets) {
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d < R) b.life = 0;
  }
  if (audio) audio.nova();
  return true;
}

function damageEnemy(world, e, dmg, audio) {
  e.hp -= dmg;
  e.flashT = 0.12;
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    world.kills += 1;
    world.combo += 1;
    world.comboT = 2.5;
    world.comboBest = Math.max(world.comboBest, world.combo);
    const mult = 1 + Math.min(world.combo, 20) * 0.05;
    const gained = Math.round(e.score * mult);
    world.score += gained;
    addFloat(world, e.x, e.y, `+${gained}`, world.combo >= 5 ? COLORS.gold : COLORS.white, world.combo >= 5 ? 18 : 14);
    burst(world, e.x, e.y, e.color, e.kind === 'boss' ? 90 : 22, e.kind === 'boss' ? 460 : 260);
    if (e.kind === 'boss') {
      world.hitStop = 0.22;
      world.shake = 20;
      world.flash = 0.5;
    }
    deathDrops(e, world);
    if (audio) audio.pop();
  }
}

// ---- the fixed step ----

export function stepWorld(world, input, dt, audio) {
  world.time += dt;
  if (world.banner.t > 0) world.banner.t -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - 40 * dt);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - 1.6 * dt);

  // Background always drifts, even on menus.
  for (const s of world.stars) {
    s.tw += dt * s.sp;
  }
  for (const m of world.motes) {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    if (m.y < -10) { m.y = VIEW.height + 10; m.x = world.rng() * VIEW.width; }
    if (m.x < -10) m.x = VIEW.width + 10;
    if (m.x > VIEW.width + 10) m.x = -10;
  }

  if (world.mode === SCREEN_TITLE) {
    world.titleT += dt;
    // Attract mode: a few drifters wander behind the title.
    if (world.enemies.length < 6 && world.rng() < dt * 0.8) {
      const s = spawnPoint(world.rng, VIEW.width / 2, VIEW.height / 2);
      world.enemies.push(makeEnemy('drifter', s.x, s.y, 1, world.rng));
    }
    for (const e of world.enemies) updateEnemy(e, dt, world);
    world.enemies = world.enemies.filter((e) => e.x > -90 && e.x < VIEW.width + 90 && e.y > -90 && e.y < VIEW.height + 90);
    stepParticles(world, dt);
    return;
  }

  if (world.mode !== SCREEN_PLAY) {
    stepParticles(world, dt);
    stepFloats(world, dt);
    return;
  }

  if (world.hitStop > 0) {
    world.hitStop -= dt;
    return;
  }

  world.runTime += dt;
  const p = world.player;
  if (audio) audio.music(dt);

  // Movement and aim.
  const mv = input.move();
  p.vx = mv.x * p.speed;
  p.vy = mv.y * p.speed;
  p.x = clamp(p.x + p.vx * dt, 20, VIEW.width - 20);
  p.y = clamp(p.y + p.vy * dt, 20, VIEW.height - 20);
  const aimX = input.auto ? input.auto.ax : input.mouseX;
  const aimY = input.auto ? input.auto.ay : input.mouseY;
  p.angle = Math.atan2(aimY - p.y, aimX - p.x);
  if (p.invulnT > 0) p.invulnT -= dt;
  if (p.fireCd > 0) p.fireCd -= dt;

  // Nova charges passively and from sparks.
  p.novaCharge = Math.min(p.novaNeed, p.novaCharge + 1.5 * p.novaRate * dt);

  // Fire.
  if (input.firing() && p.fireCd <= 0) {
    p.fireCd = p.fireInterval;
    world.shotsFired += 1;
    const n = p.projectiles;
    for (let i = 0; i < n; i += 1) {
      const off = (i - (n - 1) / 2) * 0.14;
      const a = p.angle + off;
      world.bullets.push({
        x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20,
        vx: Math.cos(a) * p.bulletSpeed, vy: Math.sin(a) * p.bulletSpeed,
        radius: 5, dmg: p.damage, pierce: p.pierce, life: p.bulletLife,
      });
    }
    burst(world, p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22, COLORS.emberHot, 2, 60);
    if (audio) audio.shoot();
  }

  // Nova on Q, right-click or the auto flag.
  if ((input.pressed('KeyQ') || input.pressed('Nova') || (input.auto && input.auto.nova)) && p.novaCharge >= p.novaNeed) {
    fireNova(world, audio);
  }

  // Spawning.
  if (world.spawnQueue.length > 0) {
    world.spawnT -= dt;
    if (world.spawnT <= 0) {
      world.spawnT = 0.55;
      const kind = world.spawnQueue.shift();
      const s = spawnPoint(world.rng, p.x, p.y);
      world.enemies.push(makeEnemy(kind, s.x, s.y, world.wave, world.rng));
    }
  } else if (world.enemies.length === 0 && world.waveState !== 'clear') {
    waveCleared(world);
  }

  // Enemies.
  for (const e of world.enemies) updateEnemy(e, dt, world);

  // Player bullets.
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    for (const e of world.enemies) {
      if (e.dead) continue;
      if (dist2(b.x, b.y, e.x, e.y) < (b.radius + e.radius) * (b.radius + e.radius)) {
        world.shotsHit += 1;
        damageEnemy(world, e, b.dmg, audio);
        burst(world, b.x, b.y, COLORS.emberHot, 4, 120);
        if (b.pierce > 0) {
          b.pierce -= 1;
        } else {
          b.life = 0;
        }
        break;
      }
    }
  }
  world.bullets = world.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < VIEW.width + 20 && b.y > -20 && b.y < VIEW.height + 20);

  // Enemy bullets.
  for (const b of world.ebullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (dist2(b.x, b.y, p.x, p.y) < (b.radius + p.radius - 4) * (b.radius + p.radius - 4)) {
      b.life = 0;
      hurtPlayer(world, b.dmg, audio);
    }
  }
  world.ebullets = world.ebullets.filter((b) => b.life > 0 && b.x > -30 && b.x < VIEW.width + 30 && b.y > -30 && b.y < VIEW.height + 30);

  // Touch damage.
  for (const e of world.enemies) {
    if (e.dead) continue;
    if (dist2(e.x, e.y, p.x, p.y) < (e.radius + p.radius - 2) * (e.radius + p.radius - 2)) {
      hurtPlayer(world, 1, audio);
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      e.vx -= Math.cos(a) * 160;
      e.vy -= Math.sin(a) * 160;
      if (world.mode !== SCREEN_PLAY) break;
    }
  }
  world.enemies = world.enemies.filter((e) => !e.dead);

  // Combo decay.
  if (world.comboT > 0) {
    world.comboT -= dt;
    if (world.comboT <= 0) world.combo = 0;
  }

  // Sparks fly to the player.
  for (const s of world.sparks) {
    s.t += dt;
    const d2 = dist2(s.x, s.y, p.x, p.y);
    if (d2 < p.magnet * p.magnet) {
      const d = Math.sqrt(d2) || 1;
      const pull = 900 * (1 - d / (p.magnet * 2.2));
      s.vx += ((p.x - s.x) / d) * pull * dt * 4;
      s.vy += ((p.y - s.y) / d) * pull * dt * 4;
    } else {
      s.vx *= (1 - 1.5 * dt);
      s.vy *= (1 - 1.5 * dt);
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (d2 < (p.radius + 10) * (p.radius + 10)) {
      s.t = 99;
      p.novaCharge = Math.min(p.novaNeed, p.novaCharge + 3);
      if (audio && world.rng() < 0.4) audio.pickup();
    }
  }
  world.sparks = world.sparks.filter((s) => s.t < 6);

  // Heart pickups.
  for (const k of world.pickups) {
    k.t += dt;
    if (dist2(k.x, k.y, p.x, p.y) < (p.radius + 14) * (p.radius + 14)) {
      k.t = 99;
      p.hp = Math.min(p.maxHp, p.hp + 1);
      addFloat(world, p.x, p.y - 26, '+1 HP', COLORS.green, 17);
      burst(world, p.x, p.y, COLORS.green, 16, 180);
      if (audio) audio.pickup();
    }
  }
  world.pickups = world.pickups.filter((k) => k.t < 12);

  stepParticles(world, dt);
  stepFloats(world, dt);
}

function stepParticles(world, dt) {
  for (const pt of world.parts) {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= (1 - pt.drag * dt);
    pt.vy *= (1 - pt.drag * dt);
  }
  world.parts = world.parts.filter((pt) => pt.life > 0);
}

function stepFloats(world, dt) {
  for (const f of world.floats) {
    f.life -= dt * 0.8;
    f.y -= 34 * dt;
  }
  world.floats = world.floats.filter((f) => f.life > 0);
}
