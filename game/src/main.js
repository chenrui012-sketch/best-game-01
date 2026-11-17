// EMBERFALL — entry point. Boots the canvas, runs the fixed-step loop,
// routes input to the right screen, and stages the deterministic screenshot
// scenes behind ?shot=<scene>&seed=<n> (then window.__shotReady is set).
import { STEP, VIEW } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { buttonsFor, render } from './render.js';
import { chooseUpgrade, createWorld, fireNova, resetRun, stepWorld } from './world.js';
import { stageShot } from './shots.js';
import {
  SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_VICTORY,
} from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number(params.get('seed') || '1') >>> 0 || 1;

const world = createWorld(shotSeed);
const input = createInput(canvas);
const audio = createAudio();

function clickButton(id) {
  if (id === 'start') {
    audio.unlock();
    audio.click();
    resetRun(world);
  } else if (id && id.startsWith('up')) {
    chooseUpgrade(world, Number(id.slice(2)), audio);
  } else if (id === 'resume') {
    audio.click();
    world.mode = SCREEN_PLAY;
  } else if (id === 'restart' || id === 'again') {
    audio.click();
    resetRun(world);
  } else if (id === 'endless') {
    audio.click();
    world.endless = true;
    world.mode = SCREEN_PLAY;
    world.waveState = 'fight';
  } else if (id === 'title') {
    audio.click();
    world.mode = SCREEN_TITLE;
    world.enemies = [];
    world.bullets = [];
    world.ebullets = [];
  }
}

function handleClick() {
  const buttons = buttonsFor(world);
  for (const b of buttons) {
    if (input.mouseX >= b.x && input.mouseX <= b.x + b.w && input.mouseY >= b.y && input.mouseY <= b.y + b.h) {
      clickButton(b.id);
      return;
    }
  }
  // A click anywhere on the title also starts the game.
  if (world.mode === SCREEN_TITLE) clickButton('start');
}

function handleKeys() {
  if (input.pressed('KeyM')) {
    world.muted = audio.toggleMute();
  }
  if (world.mode === SCREEN_TITLE) {
    if (input.pressed('Enter') || input.pressed('Space')) clickButton('start');
    return;
  }
  if (world.mode === SCREEN_PLAY) {
    if (input.pressed('KeyP') || input.pressed('Escape')) world.mode = SCREEN_PAUSE;
    if (input.pressed('KeyR')) resetRun(world);
    if (input.pressed('KeyQ')) {
      // Nova is spent in the step; this only wakes audio.
      audio.unlock();
    }
    return;
  }
  if (world.mode === SCREEN_PAUSE) {
    if (input.pressed('KeyP') || input.pressed('Escape')) world.mode = SCREEN_PLAY;
    if (input.pressed('KeyR')) resetRun(world);
    return;
  }
  if (world.mode === SCREEN_UPGRADE) {
    if (input.pressed('Digit1')) chooseUpgrade(world, 0, audio);
    if (input.pressed('Digit2')) chooseUpgrade(world, 1, audio);
    if (input.pressed('Digit3')) chooseUpgrade(world, 2, audio);
    return;
  }
  if (world.mode === SCREEN_OVER || world.mode === SCREEN_VICTORY) {
    if (input.pressed('KeyR') || input.pressed('Enter') || input.pressed('Space')) {
      if (world.mode === SCREEN_VICTORY && input.pressed('KeyR')) resetRun(world);
      else if (world.mode === SCREEN_OVER) resetRun(world);
      else if (input.pressed('Enter') || input.pressed('Space')) resetRun(world);
    }
    if (input.pressed('KeyE') && world.mode === SCREEN_VICTORY) {
      world.endless = true;
      world.mode = SCREEN_PLAY;
    }
  }
}

// ---- screenshot mode: deterministic, no audio, no input, one frame ----
if (shotName) {
  try {
    world.best = 0;
    stageShot(shotName, world, shotSeed);
    render(ctx, world, input);
    window.__shotReady = true;
  } catch (err) {
    window.__shotError = String(err && err.message ? err.message : err);
    document.title = `shot error: ${window.__shotError}`;
  }
} else {
  // ---- live game ----
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    // First gesture unlocks audio.
    if (input.justClicked || input.justPressed.size > 0) audio.unlock();
    handleKeys();
    if (input.justClicked) handleClick();
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      stepWorld(world, input, STEP, audio);
      input.endStep();
      acc -= STEP;
      guard += 1;
    }
    if (guard === 5) acc = 0;
    render(ctx, world, input);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
