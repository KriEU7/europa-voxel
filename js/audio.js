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
  startRain();
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

function tone(freq, start, dur, { type = 'sine', gain = 0.2, bus = sfx, slideTo, attack = 0.005, detune = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.detune.value = detune;
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
  flutter() { // pigeons flying away
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 8; i++) noise(t + i * 0.05, 0.05, { freq: 1200, q: 0.7, gain: 0.25 });
  },
  kick() {
    if (!ctx) return;
    tone(160, ctx.currentTime, 0.12, { type: 'sine', gain: 0.35, slideTo: 90 });
    noise(ctx.currentTime, 0.06, { freq: 900, gain: 0.2 });
  },
  eat() { // crunch crunch
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) noise(t + i * 0.18, 0.08, { freq: 2200, q: 0.8, gain: 0.3 });
  },
  shutter() {
    if (!ctx) return;
    const t = ctx.currentTime;
    noise(t, 0.04, { freq: 3000, gain: 0.4 });
    noise(t + 0.09, 0.06, { freq: 1800, gain: 0.3 });
  },
  cheer() { // goal! a crowd and a little fanfare
    if (!ctx) return;
    const t = ctx.currentTime;
    noise(t, 1.4, { freq: 1100, q: 0.4, gain: 0.35 });
    [67, 72, 76, 79].forEach((n, i) => tone(midi(n), t + i * 0.08, 0.3, { type: 'square', gain: 0.05 }));
  },
  pickup() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(midi(84), t, 0.12, { type: 'triangle', gain: 0.12 });
    tone(midi(91), t + 0.07, 0.25, { type: 'triangle', gain: 0.12 });
  },
  whistle() { ctx && tone(2600, ctx.currentTime, 0.5, { type: 'sine', gain: 0.08, slideTo: 2300 }); },
  splash() { ctx && noise(ctx.currentTime, 0.4, { freq: 1500, q: 0.5, gain: 0.18 }); },
  gull() {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) tone(1400, t + i * 0.22, 0.18, { type: 'sawtooth', gain: 0.025, slideTo: 900, bus: ambience });
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
    f.frequency.value = kind === 'plane' ? 900 : kind === 'balloon' ? 300 : 500;
    g.gain.value = 0;
    o.connect(f).connect(g).connect(sfx);
    o.start();
    engine = { kind, o, g };
  }
  const base = engine.kind === 'plane' ? 70 : engine.kind === 'balloon' ? 32 : 45;
  engine.o.frequency.setTargetAtTime(base + power * (engine.kind === 'plane' ? 110 : 60), t, 0.1);
  engine.g.gain.setTargetAtTime(engine.kind === 'balloon' ? power * 0.14 : 0.05 + power * 0.07, t, 0.1); // the balloon only roars with the burner on
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

// Rain: filtered noise, louder when it rains harder (sky.js).
let rainGain = null, rainLevel = 0;
function startRain() {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter();
  rainGain = ctx.createGain();
  src.buffer = noiseBuf;
  src.loop = true;
  f.type = 'highpass';
  f.frequency.value = 1800;
  rainGain.gain.value = 0;
  src.connect(f).connect(rainGain).connect(ambience);
  src.start();
}
export function setRain(level) {
  if (!rainGain || Math.abs(level - rainLevel) < 0.02) return;
  rainLevel = level;
  rainGain.gain.setTargetAtTime(level * 0.22, ctx.currentTime, 0.4);
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

// ---- Music: one little tune per island, the cheerful loop at sea -----------------------
// melody: one MIDI note (or _ = rest) per eighth. bar: eighths per bar (6 = waltz or 6/8).
// bass: how the left hand plays. lead: the instrument (trem = mandolin/bouzouki tremolo,
// bell = carillon, short = plucked guitar, musette = two detuned reeds like an accordion).

const _ = null;
const CHORD = {
  C: [48, 64, 67], Am: [45, 64, 69], F: [41, 65, 69], G: [43, 62, 67],
  E: [40, 64, 68], Dm: [38, 65, 69], A: [45, 61, 64],
};
const TUNES = {
  sea: {
    bpm: 104, bar: 8, bass: 'pop', hats: true, lead: { type: 'triangle', gain: 0.09 }, chords: 'C Am F G C Am F G',
    melody: [72, _, 76, 79, 76, _, 74, 72, 69, _, 72, 76, 74, 72, 71, _, 69, 72, 77, _, 76, 74, 72, _, 71, 74, 79, _, 77, 76, 74, 71,
      72, 76, 79, 84, 83, 79, 76, _, 76, 74, 72, 69, 72, _, 76, _, 77, 76, 74, 72, 74, 76, 77, _, 79, _, 74, 71, 72, _, _, _],
  },
  // Frère Jacques on the accordion
  france: {
    bpm: 116, bar: 8, bass: 'oompah', lead: { type: 'square', gain: 0.03, musette: true }, chords: 'C C C C C C G C',
    melody: [72, _, 74, _, 76, _, 72, _, 72, _, 74, _, 76, _, 72, _, 76, _, 77, _, 79, _, _, _, 76, _, 77, _, 79, _, _, _,
      79, 81, 79, 77, 76, _, 72, _, 79, 81, 79, 77, 76, _, 72, _, 72, _, 67, _, 72, _, _, _, 72, _, 67, _, 72, _, _, _],
  },
  // Bells of a carillon
  belgium: {
    bpm: 92, bar: 8, bass: 'pop', lead: { bell: true, gain: 0.07 }, chords: 'C C G G C C G C',
    melody: [79, _, 76, _, 72, _, 76, _, 79, _, 84, _, 79, _, _, _, 77, _, 74, _, 71, _, 74, _, 77, _, 79, _, 74, _, _, _,
      79, _, 76, _, 72, _, 76, _, 79, _, 84, _, 88, _, 84, _, 83, _, 79, _, 74, _, 79, _, 72, _, _, _, _, _, _, _],
  },
  // Barrel organ waltz
  netherlands: {
    bpm: 150, bar: 6, bass: 'waltz', lead: { type: 'square', gain: 0.035, musette: true }, chords: 'C C G G C G G C',
    melody: [72, _, 76, _, 79, _, 79, _, _, _, 77, 76, 74, _, 77, _, 81, _, 81, _, _, _, 79, 77,
      76, _, 79, _, 84, _, 83, _, 81, _, 79, _, 77, _, 76, _, 74, _, 72, _, _, _, _, _],
  },
  // London Bridge Is Falling Down
  uk: {
    bpm: 112, bar: 8, bass: 'pop', hats: true, lead: { type: 'square', gain: 0.04 }, chords: 'C C G C C C G C',
    melody: [79, _, _, 81, 79, _, 77, _, 76, _, 77, _, 79, _, _, _, 74, _, 76, _, 77, _, _, _, 76, _, 77, _, 79, _, _, _,
      79, _, _, 81, 79, _, 77, _, 76, _, 77, _, 79, _, _, _, 74, _, _, _, 79, _, _, _, 76, _, 72, _, _, _, _, _],
  },
  // Oompah polka
  germany: {
    bpm: 120, bar: 8, bass: 'oompah', lead: { type: 'square', gain: 0.045 }, chords: 'C G G C F C G C',
    melody: [72, _, 76, _, 79, _, 76, _, 74, _, 77, _, 79, _, 77, _, 74, _, 71, _, 67, _, 71, _, 72, _, _, _, 72, _, _, _,
      76, _, 77, _, 79, _, 81, _, 79, _, 77, _, 76, _, 74, _, 71, _, 74, _, 79, _, 74, _, 72, _, _, _, _, _, _, _],
  },
  // Flamenco guitar with castanets
  spain: {
    bpm: 100, bar: 8, bass: 'flamenco', lead: { type: 'triangle', gain: 0.1, short: true }, chords: 'Am G F E Am G F E',
    melody: [76, _, 77, 76, 74, _, 72, _, 74, _, 72, 71, 72, _, _, _, 69, _, 71, 72, 71, _, 69, _, 68, _, _, _, _, _, _, _,
      76, 77, 79, 77, 76, _, 74, _, 72, _, 74, 72, 71, _, _, _, 69, 71, 72, 71, 69, _, 68, _, 64, _, _, _, _, _, _, _],
  },
  // Tarantella on the mandolin
  italy: {
    bpm: 200, bar: 6, bass: 'six8', lead: { type: 'triangle', gain: 0.07, trem: true }, chords: 'Am F Dm E Dm Am E Am',
    melody: [76, 76, 76, 77, 76, 74, 72, 72, 72, 74, 72, 71, 69, 71, 72, 74, 76, 77, 76, _, _, 76, _, _,
      74, 74, 74, 76, 74, 72, 71, 71, 71, 72, 71, 69, 68, 69, 71, 72, 74, 71, 69, _, _, 69, _, _],
  },
  // Sirtaki-like dance on the bouzouki
  greece: {
    bpm: 126, bar: 8, bass: 'pop', lead: { type: 'square', gain: 0.04, trem: true }, chords: 'Dm Dm Dm C Dm Dm A Dm',
    melody: [74, _, 77, _, 81, _, 77, _, 79, _, 77, 76, 74, _, _, _, 74, _, 77, _, 81, _, 86, _, 84, _, 82, 81, 79, _, _, _,
      81, 82, 81, 79, 77, 79, 77, 76, 74, 76, 77, 79, 81, _, 81, _, 82, 81, 79, 77, 76, _, 73, _, 74, _, _, _, 74, _, _, _],
  },
};
for (const tune of Object.values(TUNES)) tune.chords = tune.chords.split(' ').map((c) => CHORD[c]);

function playLead(L, note, at, len) {
  const f = midi(note), o = { type: L.type, gain: L.gain, bus: music, attack: 0.01 };
  if (L.bell) {
    tone(f, at, len * 5, { ...o, type: 'sine' });
    tone(f * 2.01, at, len * 2.5, { ...o, type: 'sine', gain: L.gain * 0.35 });
    tone(f * 3, at, len, { ...o, type: 'sine', gain: L.gain * 0.15 });
  } else if (L.trem) for (let k = 0; k < 2; k++) tone(f, at + (k * len) / 2, len / 2, o);
  else if (L.musette) for (const d of [-9, 9]) tone(f, at, len * 1.8, { ...o, detune: d });
  else tone(f, at, len * (L.short ? 0.9 : 1.8), o);
}

function playBass(tune, chord, i, at, E) {
  const [root, ...top] = chord, stab = (dur) => top.forEach((n) => tone(midi(n), at, dur, { gain: 0.045, bus: music }));
  switch (tune.bass) {
    case 'pop':
      if (i === 0 || i === 4) tone(midi(root - (i === 4 ? 0 : 12)), at, E * 3.5, { gain: 0.16, bus: music });
      if (i === 0) top.forEach((n) => tone(midi(n), at, E * 7.5, { gain: 0.035, bus: music, attack: 0.15 }));
      break;
    case 'oompah':
      if (i % 4 === 0) tone(midi(root - 12 + (i ? 7 : 0)), at, E * 1.5, { gain: 0.18, bus: music });
      if (i % 4 === 2) stab(E);
      break;
    case 'waltz':
      if (i === 0) tone(midi(root - 12), at, E * 2, { gain: 0.18, bus: music });
      if (i === 2 || i === 4) stab(E);
      break;
    case 'six8':
      if (i === 0 || i === 3) tone(midi(root - 12 + (i ? 7 : 0)), at, E * 1.5, { gain: 0.16, bus: music });
      if (i === 1 || i === 4) stab(E * 0.8);
      break;
    case 'flamenco':
      if (i === 0) tone(midi(root - 12), at, E * 6, { gain: 0.16, bus: music });
      if (i === 0 || i === 3 || i === 6) chord.forEach((n, k) => tone(midi(n), at + k * 0.025, E * 2, { type: 'triangle', gain: 0.05, bus: music }));
      if ([1, 2, 5, 7].includes(i)) noise(at, 0.03, { freq: 4500, type: 'highpass', gain: 0.06, bus: music }); // castanets
      break;
  }
}

let wanted = 'sea';
// Change the tune (island id, or null at sea): it starts at the next bar.
export function setMusic(id) {
  wanted = TUNES[id] ? id : 'sea';
}

function startMusic() {
  let tune = TUNES.sea, step = 0, next = ctx.currentTime + 0.5;
  setInterval(() => {
    if (ctx.state !== 'running') return;
    while (next < ctx.currentTime + 0.25) {
      if (step % tune.bar === 0 && TUNES[wanted] !== tune) (tune = TUNES[wanted]), (step = 0);
      const E = 60 / tune.bpm / 2, bars = tune.melody.length / tune.bar;
      const bar = Math.floor(step / tune.bar) % bars, i = step % tune.bar;
      const note = tune.melody[bar * tune.bar + i];
      if (note) playLead(tune.lead, note, next, E);
      playBass(tune, tune.chords[bar % tune.chords.length], i, next, E);
      if (tune.hats && i % 2 === 1) noise(next, 0.04, { freq: 7000, type: 'highpass', gain: 0.025, bus: music });
      step++;
      next += E;
    }
  }, 60);
}
