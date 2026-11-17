// All sound is synthesised with WebAudio: no audio files, nothing fetched.
// The context is created on the first user gesture (browser autoplay rules)
// and every call is a no-op until then, so screenshots and silent tabs
// never break. M toggles mute.
export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    muted: false,
    musicT: 0,
    step: 0,
  };

  audio.unlock = function unlock() {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
      // A low drone underneath everything, started once.
      const drone = audio.ctx.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = 55;
      const droneGain = audio.ctx.createGain();
      droneGain.gain.value = 0.05;
      drone.connect(droneGain);
      droneGain.connect(audio.master);
      drone.start();
      const drone2 = audio.ctx.createOscillator();
      drone2.type = 'triangle';
      drone2.frequency.value = 82.5;
      const drone2Gain = audio.ctx.createGain();
      drone2Gain.gain.value = 0.025;
      drone2.connect(drone2Gain);
      drone2Gain.connect(audio.master);
      drone2.start();
    } catch {
      audio.ctx = null;
    }
  };

  audio.toggleMute = function toggleMute() {
    audio.muted = !audio.muted;
    if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
    return audio.muted;
  };

  function tone(freq, dur, type, vol, slideTo) {
    if (!audio.ctx || audio.muted) return;
    const t = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, low) {
    if (!audio.ctx || audio.muted) return;
    const t = audio.ctx.currentTime;
    const len = Math.max(1, Math.floor(audio.ctx.sampleRate * dur));
    const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ctx.createBufferSource();
    src.buffer = buf;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low || 1200;
    const gain = audio.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start(t);
  }

  audio.shoot = () => tone(880, 0.07, 'square', 0.05, 320);
  audio.pop = () => { tone(220, 0.12, 'triangle', 0.12, 60); noise(0.08, 0.08, 900); };
  audio.hit = () => tone(140, 0.08, 'sawtooth', 0.1, 70);
  audio.pickup = () => { tone(660, 0.08, 'sine', 0.09); setTimeout(() => tone(990, 0.1, 'sine', 0.08), 50); };
  audio.nova = () => { noise(0.5, 0.25, 500); tone(110, 0.5, 'sine', 0.2, 30); };
  audio.horn = () => { tone(196, 0.35, 'sawtooth', 0.1, 196); tone(294, 0.35, 'sawtooth', 0.07, 294); };
  audio.click = () => tone(520, 0.05, 'sine', 0.08);
  audio.upgrade = () => { tone(523, 0.12, 'sine', 0.1); setTimeout(() => tone(784, 0.16, 'sine', 0.1), 90); };
  audio.gameOver = () => { tone(330, 0.4, 'sawtooth', 0.12, 110); tone(220, 0.6, 'sawtooth', 0.1, 55); };
  audio.victory = () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sine', 0.12), i * 120));
  };

  // A slow pentatonic pluck, one note every other beat, called from the
  // game step with dt so it stays in time with the game, not the wall clock.
  const SCALE = [220, 261.6, 293.7, 329.6, 392, 440, 523.3];
  audio.music = function music(dt) {
    if (!audio.ctx || audio.muted) return;
    audio.musicT += dt;
    if (audio.musicT < 0.5) return;
    audio.musicT = 0;
    audio.step += 1;
    if (audio.step % 2 === 0) {
      const note = SCALE[(audio.step * 5 + 3) % SCALE.length] / 2;
      tone(note, 0.9, 'sine', 0.035);
    }
  };

  return audio;
}
