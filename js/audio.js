// All sounds are synthesised with the Web Audio API: no audio files needed.
// Buses: master -> music / sfx / ambience. Volumes come from the settings (0..1).

let ctx = null, master, music, sfx, ambience, noiseBuf, engine;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export function initAudio(volumes) {
  if (ctx) return ctx.resume();
  ctx = new AudioContext();
  master = ctx.createGain();
  master.connect(ctx.destination);
  [music, sfx, ambience] = [0, 1, 2].map(() => {
    const g = ctx.createGain();
    g.connect(master);
    return g;
  });
  setVolumes(volumes);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  startSea();
  startMusic();
}

export function setVolumes({ master: m, music: mu, sfx: s, ambience: a }) {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(m, t, 0.05);
  music.gain.setTargetAtTime(mu * 0.5, t, 0.05);
  sfx.gain.setTargetAtTime(s, t, 0.05);
  ambience.gain.setTargetAtTime(a, t, 0.05);
}

// ---- Small helpers ----------------------------------------------------------

function tone(freq, start, dur, { type = 'sine', gain = 0.2, bus = sfx, slideTo, attack = 0.005 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(bus);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function noise(start, dur, { freq = 1000, q = 1, type = 'bandpass', gain = 0.3, bus = sfx } = {}) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(start, Math.random());
  src.stop(start + dur + 0.05);
}

// ---- Sound effects ----------------------------------------------------------

const STEP_SOUND = {
  grass: { freq: 900, q: 0.8, gain: 0.16 },
  gravel: { freq: 2600, q: 0.6, gain: 0.22 },
  sand: { freq: 600, q: 0.5, gain: 0.14 },
  wood: { freq: 350, q: 2, gain: 0.3 },
  asphalt: { freq: 1500, q: 1.2, gain: 0.15 },
};

export const sounds = {
  step(ground = 'grass') {
    if (!ctx) return;
    noise(ctx.currentTime, 0.09, STEP_SOUND[ground] ?? STEP_SOUND.grass);
  },
  jump() { ctx && tone(300, ctx.currentTime, 0.18, { type: 'triangle', slideTo: 600, gain: 0.12 }); },
  land() { ctx && noise(ctx.currentTime, 0.15, { freq: 300, type: 'lowpass', gain: 0.35 }); },
  click() { ctx && tone(880, ctx.currentTime, 0.06, { type: 'square', gain: 0.05 }); },
  hover() { ctx && tone(1320, ctx.currentTime, 0.03, { type: 'sine', gain: 0.03 }); },
  open() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(midi(76), t, 0.35, { type: 'triangle', gain: 0.15 });
    tone(midi(83), t + 0.09, 0.45, { type: 'triangle', gain: 0.15 });
  },
  welcome() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [72, 76, 79, 84].forEach((n, i) => tone(midi(n), t + i * 0.1, 0.5, { type: 'triangle', gain: 0.13 }));
  },
  talk() {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 5; i++) tone(260 + Math.random() * 200, t + i * 0.07, 0.06, { type: 'square', gain: 0.03 });
  },
  enter() { ctx && noise(ctx.currentTime, 0.4, { freq: 800, type: 'lowpass', gain: 0.25 }); },
  stamp() {
    // Rubber stamp: a thud and a little "ta-da"
    if (!ctx) return;
    const t = ctx.currentTime;
    noise(t, 0.18, { freq: 250, type: 'lowpass', gain: 0.9 });
    tone(90, t, 0.2, { type: 'sine', gain: 0.4, slideTo: 50 });
    [72, 79, 84].forEach((n, i) => tone(midi(n), t + 0.25 + i * 0.09, 0.4, { type: 'triangle', gain: 0.12 }));
  },
  crash() {
    if (!ctx) return;
    const t = ctx.currentTime;
    noise(t, 0.5, { freq: 400, type: 'lowpass', gain: 0.6 });
    tone(500, t + 0.05, 0.9, { type: 'triangle', slideTo: 120, gain: 0.15 }); // "boing" while spinning
  },
};

// Engine of the boat or plane. kind = null to switch it off. power = 0..1
export function setEngine(kind, power = 0) {
  if (!ctx) return;
  const t = ctx.currentTime;
  if (!kind) {
    if (engine) engine.g.gain.setTargetAtTime(0, t, 0.2);
    return;
  }
  if (!engine || engine.kind !== kind) {
    if (engine) engine.g.gain.setTargetAtTime(0, t, 0.1), engine.o.stop(t + 1);
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth';
    f.type = 'lowpass';
    f.frequency.value = kind === 'plane' ? 900 : 500;
    g.gain.value = 0;
    o.connect(f).connect(g).connect(sfx);
    o.start();
    engine = { kind, o, g };
  }
  const base = engine.kind === 'plane' ? 70 : 45;
  engine.o.frequency.setTargetAtTime(base + power * (engine.kind === 'plane' ? 110 : 60), t, 0.1);
  engine.g.gain.setTargetAtTime(0.05 + power * 0.07, t, 0.1);
}

// ---- Ambience: sea waves + birds -----------------------------------------------

let birdTimer = 0;
function startSea() {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
  src.buffer = noiseBuf;
  src.loop = true;
  f.type = 'lowpass';
  f.frequency.value = 450;
  g.gain.value = 0.12;
  lfo.frequency.value = 0.12;
  lfoGain.gain.value = 0.08;
  lfo.connect(lfoGain).connect(g.gain);
  src.connect(f).connect(g).connect(ambience);
  src.start();
  lfo.start();
}

// Called every frame: chirping birds when you are on an island.
export function updateAmbience(dt, onIsland) {
  if (!ctx || !onIsland) return;
  birdTimer -= dt;
  if (birdTimer > 0) return;
  birdTimer = 2 + Math.random() * 6;
  const t = ctx.currentTime, f = 2200 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) tone(f, t + i * 0.13, 0.09, { slideTo: f * 1.3, gain: 0.05, bus: ambience });
}

// ---- Music: a cheerful little loop (C – Am – F – G) ---------------------------------

const MELODY = [
  [72, null, 76, 79, 76, null, 74, 72], [69, null, 72, 76, 74, 72, 71, null],
  [69, 72, 77, null, 76, 74, 72, null], [71, 74, 79, null, 77, 76, 74, 71],
  [72, 76, 79, 84, 83, 79, 76, null], [76, 74, 72, 69, 72, null, 76, null],
  [77, 76, 74, 72, 74, 76, 77, null], [79, null, 74, 71, 72, null, null, null],
];
const CHORDS = [[48, 64, 67], [45, 64, 69], [41, 65, 69], [43, 62, 67]];
const EIGHTH = 60 / 104 / 2;

function startMusic() {
  let step = 0, next = ctx.currentTime + 0.5;
  setInterval(() => {
    if (ctx.state !== 'running') return;
    while (next < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % 8, i = step % 8, chord = CHORDS[bar % 4];
      const note = MELODY[bar][i];
      if (note) tone(midi(note), next, EIGHTH * 1.8, { type: 'triangle', gain: 0.09, bus: music, attack: 0.01 });
      if (i === 0 || i === 4) tone(midi(chord[0] - (i === 4 ? 0 : 12)), next, EIGHTH * 3.5, { gain: 0.16, bus: music });
      if (i === 0) for (const n of chord.slice(1)) tone(midi(n), next, EIGHTH * 7.5, { gain: 0.035, bus: music, attack: 0.15 });
      if (i % 2 === 1) noise(next, 0.04, { freq: 7000, type: 'highpass', gain: 0.025, bus: music });
      step++;
      next += EIGHTH;
    }
  }, 60);
}
