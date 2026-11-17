// The between-wave draft: after each cleared wave the player picks one of
// three upgrades. Each upgrade knows its own cap, so the draft never offers
// a maxed-out pick, and each apply() is the whole effect.
export const UPGRADES = [
  {
    id: 'rapid', name: 'Rapid Chamber', icon: '»', max: 4,
    desc: 'Fire 18% faster.',
    apply: (p) => { p.fireInterval *= 0.82; },
  },
  {
    id: 'heavy', name: 'Heavy Embers', icon: '●', max: 5,
    desc: '+1 damage on every shot.',
    apply: (p) => { p.damage += 1; },
  },
  {
    id: 'twin', name: 'Twin Spark', icon: '✦', max: 3,
    desc: '+1 projectile per shot.',
    apply: (p) => { p.projectiles += 1; },
  },
  {
    id: 'pierce', name: 'Piercing Light', icon: '→', max: 3,
    desc: 'Shots pass through +1 enemy.',
    apply: (p) => { p.pierce += 1; },
  },
  {
    id: 'swift', name: 'Swift Boots', icon: '≫', max: 3,
    desc: 'Move 12% faster.',
    apply: (p) => { p.speed *= 1.12; },
  },
  {
    id: 'heart', name: 'Ember Heart', icon: '♥', max: 3,
    desc: '+1 max health and heal 1 now.',
    apply: (p) => { p.maxHp += 1; p.hp = Math.min(p.maxHp, p.hp + 1); },
  },
  {
    id: 'magnet', name: 'Magnet Core', icon: '◎', max: 3,
    desc: 'Sparks fly to you from 60% further.',
    apply: (p) => { p.magnet *= 1.6; },
  },
  {
    id: 'dynamo', name: 'Nova Dynamo', icon: '☀', max: 3,
    desc: 'Nova charges 30% faster.',
    apply: (p) => { p.novaRate *= 1.3; },
  },
  {
    id: 'longburn', name: 'Long Burn', icon: '—', max: 3,
    desc: 'Shots fly 25% faster and further.',
    apply: (p) => { p.bulletSpeed *= 1.25; p.bulletLife *= 1.25; },
  },
  {
    id: 'aegis', name: 'Aegis Shell', icon: '⬡', max: 2,
    desc: 'A shield blocks one hit each wave.',
    apply: (p) => { p.aegisMax += 1; p.aegis = p.aegisMax; },
  },
];

// Three distinct upgrades the player has not maxed out yet.
export function rollChoices(rng, taken) {
  const open = UPGRADES.filter((u) => (taken[u.id] || 0) < u.max);
  const choices = [];
  while (choices.length < 3 && open.length > 0) {
    const i = Math.floor(rng() * open.length);
    choices.push(open.splice(i, 1)[0]);
  }
  return choices;
}

export function applyUpgrade(player, upgrade, taken) {
  upgrade.apply(player);
  taken[upgrade.id] = (taken[upgrade.id] || 0) + 1;
}
