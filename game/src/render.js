// Everything the player sees: the arena, the HUD and every screen. The
// world never draws; this module never steps. Button rectangles are shared
// with main.js through buttonsFor(), so clicks and drawing always agree.
import { COLORS, VIEW, WIN_WAVE } from './config.js';
import {
  SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_VICTORY,
} from './world.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, font, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  ctx.font = font || `700 ${size}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

function glowDot(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Button rectangles for the current screen, in canvas coordinates.
export function buttonsFor(world) {
  const cx = VIEW.width / 2;
  if (world.mode === SCREEN_TITLE) {
    return [{ id: 'start', x: cx - 170, y: 512, w: 340, h: 66 }];
  }
  if (world.mode === SCREEN_UPGRADE) {
    return world.choices.map((c, i) => ({ id: `up${i}`, x: 170 + i * 330, y: 268, w: 300, h: 240 }));
  }
  if (world.mode === SCREEN_PAUSE) {
    return [
      { id: 'resume', x: cx - 170, y: 380, w: 340, h: 56 },
      { id: 'restart', x: cx - 170, y: 452, w: 340, h: 56 },
    ];
  }
  if (world.mode === SCREEN_OVER) {
    return [
      { id: 'restart', x: cx - 170, y: 500, w: 340, h: 60 },
      { id: 'title', x: cx - 170, y: 574, w: 340, h: 48 },
    ];
  }
  if (world.mode === SCREEN_VICTORY) {
    return [
      { id: 'again', x: cx - 350, y: 512, w: 330, h: 60 },
      { id: 'endless', x: cx + 20, y: 512, w: 330, h: 60 },
      { id: 'title', x: cx - 170, y: 588, w: 340, h: 46 },
    ];
  }
  return [];
}

function drawBackground(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, COLORS.bgTop);
  g.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Nebula blobs.
  ctx.save();
  ctx.globalAlpha = 0.16;
  glowDot(ctx, 220, 150, 130, '#7b2fbe', 1);
  glowDot(ctx, 1060, 560, 150, '#ff5e3a', 1);
  glowDot(ctx, 900, 120, 100, '#4cc9f0', 1);
  ctx.restore();
  // Stars.
  for (const s of world.stars) {
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(s.tw);
    ctx.fillStyle = '#dfe6ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Drifting ember motes.
  for (const m of world.motes) {
    ctx.globalAlpha = m.a;
    ctx.fillStyle = COLORS.ember;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Arena edge.
  ctx.strokeStyle = 'rgba(139, 147, 184, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, VIEW.width - 20, VIEW.height - 20);
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (world.mode === SCREEN_OVER) return;
  const blink = p.invulnT > 0 && Math.floor(world.time * 14) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  // Glow and core.
  glowDot(ctx, p.x, p.y, 26, COLORS.ember, 0.85);
  ctx.fillStyle = COLORS.emberHot;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.emberDeep;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  // Aim wedge.
  ctx.rotate(0);
  ctx.fillStyle = COLORS.white;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.angle) * (p.radius + 12), p.y + Math.sin(p.angle) * (p.radius + 12));
  ctx.lineTo(p.x + Math.cos(p.angle + 2.5) * p.radius, p.y + Math.sin(p.angle + 2.5) * p.radius);
  ctx.lineTo(p.x + Math.cos(p.angle - 2.5) * p.radius, p.y + Math.sin(p.angle - 2.5) * p.radius);
  ctx.closePath();
  ctx.fill();
  // Aegis ring.
  if (p.aegis > 0) {
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnemy(ctx, e, world) {
  ctx.save();
  const flash = e.flashT > 0;
  ctx.translate(e.x, e.y);
  if (e.kind === 'drifter') {
    glowDot(ctx, 0, 0, e.radius + 6, e.color, 0.5);
    ctx.fillStyle = flash ? COLORS.white : e.color;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + e.t * 0.6;
      const r = e.radius * (i % 2 === 0 ? 1 : 0.72);
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.red;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'dart') {
    ctx.rotate(e.state === 'aim' || e.state === 'lunge' ? e.angle : e.t * 2);
    ctx.fillStyle = flash ? COLORS.white : e.color;
    ctx.beginPath();
    ctx.moveTo(e.radius + 8, 0);
    ctx.lineTo(-e.radius, e.radius * 0.8);
    ctx.lineTo(-e.radius * 0.5, 0);
    ctx.lineTo(-e.radius, -e.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    if (e.state === 'aim') {
      ctx.strokeStyle = 'rgba(247, 37, 133, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.radius + 10, 0);
      ctx.lineTo(e.radius + 60, 0);
      ctx.stroke();
    }
  } else if (e.kind === 'spitter') {
    glowDot(ctx, 0, 0, e.radius + 8, e.color, 0.45);
    ctx.fillStyle = flash ? COLORS.white : e.color;
    ctx.beginPath();
    ctx.moveTo(0, -e.radius);
    ctx.lineTo(e.radius, 0);
    ctx.lineTo(0, e.radius);
    ctx.lineTo(-e.radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.bgBottom;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'splitter') {
    glowDot(ctx, 0, 0, e.radius + 6, e.color, 0.45);
    ctx.fillStyle = flash ? COLORS.white : e.color;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(5, 6, 15, 0.55)';
    ctx.beginPath();
    ctx.arc(-6, -5, e.radius * 0.34, 0, Math.PI * 2);
    ctx.arc(7, 6, e.radius * 0.34, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'mini') {
    ctx.fillStyle = flash ? COLORS.white : e.color;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'boss') {
    glowDot(ctx, 0, 0, e.radius + 26, e.color, 0.6);
    ctx.fillStyle = flash ? COLORS.white : '#3d0a1e';
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2 + Math.sin(e.t * 0.8) * 0.05;
      const r = e.radius * (i % 2 === 0 ? 1.15 : 0.8);
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = COLORS.emberHot;
    ctx.beginPath();
    ctx.arc(0, 0, 14 + Math.sin(e.t * 5) * 3, 0, Math.PI * 2);
    ctx.fill();
    // Boss health bar above the crown.
    const w = 130;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-w / 2, -e.radius - 26, w, 9);
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(-w / 2, -e.radius - 26, w * Math.max(0, e.hp / e.maxHp), 9);
  }
  ctx.restore();
}

function drawHUD(ctx, world) {
  const p = world.player;
  ctx.save();
  // Score, top left.
  text(ctx, `SCORE ${world.score.toLocaleString('en-US')}`, 28, 34, 26, COLORS.white, 'left');
  text(ctx, `BEST ${Math.max(world.best, world.score).toLocaleString('en-US')}`, 28, 62, 15, COLORS.dim, 'left');
  if (world.combo >= 3) {
    text(ctx, `COMBO x${world.combo}`, 28, 90, 18, COLORS.gold, 'left');
  }
  // Wave, top centre.
  text(ctx, `WAVE ${world.wave} / ${WIN_WAVE}`, VIEW.width / 2, 34, 24, COLORS.emberHot, 'center');
  const left = world.spawnQueue.length + world.enemies.length;
  text(ctx, left > 0 ? `${left} hollow${left === 1 ? '' : 's'} remain` : 'clear!', VIEW.width / 2, 60, 14, COLORS.dim, 'center');
  // Hearts, top right.
  for (let i = 0; i < p.maxHp; i += 1) {
    const x = VIEW.width - 34 - i * 34;
    ctx.fillStyle = i < p.hp ? COLORS.red : 'rgba(139, 147, 184, 0.3)';
    ctx.beginPath();
    ctx.arc(x - 6, 28, 8, 0, Math.PI * 2);
    ctx.arc(x + 6, 28, 8, 0, Math.PI * 2);
    ctx.moveTo(x - 13, 32);
    ctx.lineTo(x, 46);
    ctx.lineTo(x + 13, 32);
    ctx.fill();
  }
  // Nova bar, under the hearts.
  const bw = 180;
  const bx = VIEW.width - 28 - bw;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(ctx, bx, 58, bw, 14, 7);
  ctx.fill();
  const frac = p.novaCharge / p.novaNeed;
  ctx.fillStyle = frac >= 1 ? COLORS.emberHot : COLORS.ember;
  if (frac > 0) {
    rr(ctx, bx, 58, bw * frac, 14, 7);
    ctx.fill();
  }
  text(ctx, frac >= 1 ? 'NOVA READY — Q' : 'NOVA', bx + bw / 2, 65, 11, frac >= 1 ? '#1a1005' : COLORS.white, 'center');
  // First-wave hint.
  if (world.wave === 1 && world.runTime < 6 && world.mode === SCREEN_PLAY) {
    text(ctx, 'WASD move  •  mouse aim  •  hold click to shoot  •  Q for Nova when charged', VIEW.width / 2, VIEW.height - 30, 15, COLORS.dim, 'center');
  }
  ctx.restore();
}

function drawBanner(ctx, world) {
  if (world.banner.t <= 0 || !world.banner.text) return;
  const a = Math.min(1, world.banner.t);
  ctx.save();
  ctx.globalAlpha = a;
  text(ctx, world.banner.text, VIEW.width / 2, 250, 54, COLORS.emberHot, 'center', '800 54px "Segoe UI", system-ui, sans-serif');
  if (world.banner.sub) text(ctx, world.banner.sub, VIEW.width / 2, 296, 18, COLORS.white, 'center');
  ctx.restore();
}

function drawButton(ctx, b, label, sub, hot) {
  ctx.save();
  ctx.fillStyle = hot ? 'rgba(255, 154, 60, 0.22)' : COLORS.panel;
  rr(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fill();
  ctx.strokeStyle = hot ? COLORS.emberHot : COLORS.panelLine;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? 8 : 0), 22, COLORS.white, 'center');
  if (sub) text(ctx, sub, b.x + b.w / 2, b.y + b.h / 2 + 18, 13, COLORS.dim, 'center');
  ctx.restore();
}

function drawTitle(ctx, world, hover) {
  const cx = VIEW.width / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 15, 0.45)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  glowDot(ctx, cx, 210, 150, COLORS.ember, 0.5);
  text(ctx, 'EMBERFALL', cx, 200, 84, COLORS.emberHot, 'center', '800 84px "Segoe UI", system-ui, sans-serif');
  text(ctx, 'Defend the last ember. Ten waves stand between night and dawn.', cx, 258, 20, COLORS.white, 'center');
  text(ctx, 'WASD / arrows — move      Mouse — aim      Hold click / Space — shoot', cx, 330, 17, COLORS.dim, 'center');
  text(ctx, 'Q / right-click — Nova blast when charged      P — pause      M — mute', cx, 358, 17, COLORS.dim, 'center');
  text(ctx, 'Clear a wave, draft an upgrade, survive all ten waves to win.', cx, 386, 17, COLORS.dim, 'center');
  if (world.best > 0) text(ctx, `BEST SCORE ${world.best.toLocaleString('en-US')}`, cx, 432, 18, COLORS.gold, 'center');
  const b = buttonsFor(world)[0];
  drawButton(ctx, b, '▶  LIGHT THE EMBER', 'click or press Enter', hover === 'start');
  text(ctx, 'A complete game: 10 waves, 6 foes, a boss, upgrades, sound — no network, no installs.', cx, 628, 14, COLORS.dim, 'center');
  ctx.restore();
}

function drawUpgrade(ctx, world, hover) {
  const cx = VIEW.width / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 15, 0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, `WAVE ${world.wave} CLEARED`, cx, 150, 40, COLORS.emberHot, 'center', '800 40px "Segoe UI", system-ui, sans-serif');
  text(ctx, 'Choose one ember to carry into the next wave — click a card or press 1 / 2 / 3.', cx, 196, 17, COLORS.white, 'center');
  const buttons = buttonsFor(world);
  world.choices.forEach((c, i) => {
    const b = buttons[i];
    const hot = hover === `up${i}`;
    ctx.fillStyle = hot ? 'rgba(255, 154, 60, 0.20)' : COLORS.panel;
    rr(ctx, b.x, b.y, b.w, b.h, 14);
    ctx.fill();
    ctx.strokeStyle = hot ? COLORS.emberHot : COLORS.panelLine;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, c.icon, b.x + b.w / 2, b.y + 52, 44, COLORS.emberHot, 'center');
    text(ctx, c.name, b.x + b.w / 2, b.y + 108, 21, COLORS.white, 'center');
    // Wrap the description over two lines by hand.
    const words = c.desc.split(' ');
    let line = '';
    let y = b.y + 152;
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 26) {
        text(ctx, line.trim(), b.x + b.w / 2, y, 15, COLORS.dim, 'center');
        line = w;
        y += 24;
      } else {
        line += ' ' + w;
      }
    }
    if (line.trim()) text(ctx, line.trim(), b.x + b.w / 2, y, 15, COLORS.dim, 'center');
    text(ctx, `[ ${i + 1} ]`, b.x + b.w / 2, b.y + b.h - 26, 15, COLORS.gold, 'center');
  });
  ctx.restore();
}

function drawPause(ctx, world, hover) {
  const cx = VIEW.width / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 15, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'PAUSED', cx, 300, 48, COLORS.white, 'center', '800 48px "Segoe UI", system-ui, sans-serif');
  const buttons = buttonsFor(world);
  drawButton(ctx, buttons[0], 'RESUME', 'P or click', hover === 'resume');
  drawButton(ctx, buttons[1], 'RESTART RUN', 'R', hover === 'restart');
  ctx.restore();
}

function statsLines(world) {
  const s = world.stats;
  const mins = Math.floor(s.time / 60);
  const secs = Math.floor(s.time % 60);
  return [
    [`SCORE`, s.score.toLocaleString('en-US')],
    [`WAVE REACHED`, `${s.wave} / ${WIN_WAVE}`],
    [`HOLLOWS SLAIN`, `${s.kills}`],
    [`BEST COMBO`, `x${s.comboBest}`],
    [`ACCURACY`, `${s.accuracy}%`],
    [`TIME`, `${mins}:${String(secs).padStart(2, '0')}`],
    [`NOVA BLASTS`, `${s.novaUsed}`],
  ];
}

function drawStats(ctx, world, y0) {
  const cx = VIEW.width / 2;
  statsLines(world).forEach(([k, v], i) => {
    const y = y0 + i * 30;
    text(ctx, k, cx - 180, y, 16, COLORS.dim, 'left');
    text(ctx, v, cx + 180, y, 16, COLORS.white, 'right');
  });
}

function drawOver(ctx, world, hover) {
  const cx = VIEW.width / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 15, 0.66)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'THE EMBER DIES', cx, 130, 52, COLORS.red, 'center', '800 52px "Segoe UI", system-ui, sans-serif');
  text(ctx, 'The night takes the arena — but embers always return.', cx, 178, 18, COLORS.white, 'center');
  if (world.stats && world.stats.newBest) text(ctx, '★ NEW BEST SCORE ★', cx, 212, 20, COLORS.gold, 'center');
  drawStats(ctx, world, 250);
  const buttons = buttonsFor(world);
  drawButton(ctx, buttons[0], '↻  TRY AGAIN', 'R or click', hover === 'restart');
  drawButton(ctx, buttons[1], 'BACK TO TITLE', '', hover === 'title');
  ctx.restore();
}

function drawVictory(ctx, world, hover) {
  const cx = VIEW.width / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 15, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  glowDot(ctx, cx, 130, 170, COLORS.emberHot, 0.6);
  text(ctx, 'DAWN BREAKS', cx, 130, 56, COLORS.emberHot, 'center', '800 56px "Segoe UI", system-ui, sans-serif');
  text(ctx, 'Ten waves held. The last ember becomes the first sunrise.', cx, 180, 18, COLORS.white, 'center');
  if (world.stats && world.stats.newBest) text(ctx, '★ NEW BEST SCORE ★', cx, 212, 20, COLORS.gold, 'center');
  drawStats(ctx, world, 248);
  const buttons = buttonsFor(world);
  drawButton(ctx, buttons[0], '↻  PLAY AGAIN', 'new run', hover === 'again');
  drawButton(ctx, buttons[1], 'ENDLESS MODE', 'waves never stop', hover === 'endless');
  drawButton(ctx, buttons[2], 'BACK TO TITLE', '', hover === 'title');
  ctx.restore();
}

export function render(ctx, world, input) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((world.rng() - 0.5) * world.shake, (world.rng() - 0.5) * world.shake);
  }
  drawBackground(ctx, world);
  // Glow pass for sparks and bullets.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of world.sparks) {
    glowDot(ctx, s.x, s.y, 7, COLORS.gold, 0.8);
  }
  for (const b of world.bullets) {
    glowDot(ctx, b.x, b.y, 8, COLORS.emberHot, 0.9);
  }
  for (const pt of world.parts) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Pickups.
  for (const k of world.pickups) {
    const bob = Math.sin(world.time * 4 + k.x) * 3;
    glowDot(ctx, k.x, k.y + bob, 14, COLORS.green, 0.7);
    text(ctx, '♥', k.x, k.y + bob, 20, COLORS.green, 'center');
  }
  // Enemies, player, enemy bullets.
  for (const e of world.enemies) drawEnemy(ctx, e, world);
  for (const b of world.ebullets) {
    glowDot(ctx, b.x, b.y, 10, COLORS.magenta, 0.8);
    ctx.fillStyle = COLORS.magenta;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  drawPlayer(ctx, world);
  // Floating score text.
  for (const f of world.floats) {
    text(ctx, f.text, f.x, f.y, f.size, f.color, 'center', undefined, Math.max(0, f.life));
  }
  ctx.restore();

  // Flash overlay.
  if (world.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, world.flash);
    ctx.fillStyle = COLORS.emberHot;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.restore();
  }

  // Hover target for buttons, from the mouse position.
  let hover = null;
  if (input) {
    for (const b of buttonsFor(world)) {
      if (input.mouseX >= b.x && input.mouseX <= b.x + b.w && input.mouseY >= b.y && input.mouseY <= b.y + b.h) hover = b.id;
    }
  }

  if (world.mode === SCREEN_PLAY || world.mode === SCREEN_PAUSE || world.mode === SCREEN_UPGRADE) drawHUD(ctx, world);
  drawBanner(ctx, world);
  if (world.mode === SCREEN_TITLE) drawTitle(ctx, world, hover);
  if (world.mode === SCREEN_UPGRADE) drawUpgrade(ctx, world, hover);
  if (world.mode === SCREEN_PAUSE) drawPause(ctx, world, hover);
  if (world.mode === SCREEN_OVER) drawOver(ctx, world, hover);
  if (world.mode === SCREEN_VICTORY) drawVictory(ctx, world, hover);
}
