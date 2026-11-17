// EMBERFALL — tuning, palette and wave plans. One place for every number the
// game balances on, so tuning never means hunting through logic.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const WIN_WAVE = 10;

export const COLORS = {
  bgTop: '#0b1026',
  bgBottom: '#05060f',
  ember: '#ff9a3c',
  emberHot: '#ffd166',
  emberDeep: '#ff5e3a',
  cyan: '#4cc9f0',
  magenta: '#f72585',
  violet: '#7b2fbe',
  green: '#80ed99',
  red: '#ff4d6d',
  gold: '#ffd166',
  white: '#f4f1de',
  dim: '#8b93b8',
  panel: 'rgba(10, 14, 38, 0.82)',
  panelLine: 'rgba(255, 209, 102, 0.35)',
};

export const PLAYER_BASE = {
  radius: 14,
  speed: 340,
  maxHp: 3,
  fireInterval: 0.16,
  bulletSpeed: 760,
  bulletDamage: 1,
  bulletRadius: 5,
  projectiles: 1,
  pierce: 0,
  magnet: 100,
  novaNeed: 100,
};

// hp, radius, speed, score, colour and behaviour tag per enemy kind.
export const ENEMY = {
  drifter: { hp: 3, radius: 18, speed: 95, score: 50, color: '#8b5cf6', cost: 1 },
  dart: { hp: 2, radius: 13, speed: 150, score: 80, color: '#f72585', cost: 2 },
  spitter: { hp: 4, radius: 17, speed: 70, score: 120, color: '#4cc9f0', cost: 3 },
  splitter: { hp: 6, radius: 24, speed: 60, score: 150, color: '#80ed99', cost: 3 },
  mini: { hp: 1, radius: 9, speed: 210, score: 30, color: '#b5179e', cost: 0 },
  boss: { hp: 220, radius: 52, speed: 55, score: 2500, color: '#ff4d6d', cost: 0 },
};

// How many of each kind a wave sends. Budget grows with the wave; bosses
// arrive on waves 5 and 10, with escorts.
export function waveComposition(wave, rng) {
  const list = [];
  const budget = 6 + wave * 4;
  let spent = 0;
  const counts = { drifter: 0, dart: 0, spitter: 0, splitter: 0 };
  // Drifters always lead; faster and stranger kinds join as waves rise.
  counts.drifter = 3 + wave * 2;
  spent += counts.drifter * ENEMY.drifter.cost;
  if (wave >= 2) { counts.dart = 1 + wave; spent += counts.dart * ENEMY.dart.cost; }
  if (wave >= 3) { counts.spitter = wave - 1; spent += counts.spitter * ENEMY.spitter.cost; }
  if (wave >= 4) { counts.splitter = Math.floor(wave / 2); spent += counts.splitter * ENEMY.splitter.cost; }
  while (spent < budget) { counts.drifter += 1; spent += 1; }
  for (const kind of ['splitter', 'spitter', 'dart', 'drifter']) {
    for (let i = 0; i < counts[kind]; i += 1) list.push(kind);
  }
  // Shuffle the tail so the wave never arrives in kind order.
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  if (wave === 5 || wave === WIN_WAVE) list.unshift('boss');
  return list;
}
