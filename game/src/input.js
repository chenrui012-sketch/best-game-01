// Keyboard and mouse, in canvas coordinates. The world reads this object
// each fixed step; edges (justPressed / justClicked) are consumed by the
// step that sees them, so a tap never fires twice.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    justPressed: new Set(),
    mouseX: 640,
    mouseY: 360,
    mouseDown: false,
    justClicked: false,
    // Synthetic drive for the screenshot autopilot: shots.js writes these.
    auto: null,
  };

  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (!event.repeat) {
      input.keys.add(event.code);
      input.justPressed.add(event.code);
    }
  });
  window.addEventListener('keyup', (event) => input.keys.delete(event.code));
  window.addEventListener('blur', () => input.keys.clear());
  canvas.addEventListener('mousemove', (event) => {
    const p = toCanvas(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = toCanvas(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    if (event.button === 0) {
      input.mouseDown = true;
      input.justClicked = true;
    }
    if (event.button === 2) input.justPressed.add('Nova');
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  input.endStep = function endStep() {
    input.justPressed.clear();
    input.justClicked = false;
  };
  input.pressed = function pressed(code) {
    return input.justPressed.has(code);
  };
  input.down = function down(code) {
    return input.keys.has(code);
  };
  // Movement vector from WASD or arrows, normalised.
  input.move = function move() {
    let x = 0;
    let y = 0;
    if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
    if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
    if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
    if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    if (len > 0) { x /= len; y /= len; }
    if (input.auto) { x = input.auto.mx; y = input.auto.my; }
    return { x, y };
  };
  input.firing = function firing() {
    return input.mouseDown || input.keys.has('Space') || (input.auto && input.auto.fire);
  };
  return input;
}
