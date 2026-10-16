// Sea easter eggs: creatures that come up from the open sea now and then (seen from the boat).
// CREATURES is live: update() moves them and sets `up` (0 = under water, 1 = fully out),
// so the big map and the minimap can draw an icon where something is surfacing.
import * as THREE from 'three';
import { set, box } from '../voxel.js';
import { vox, line } from './eggs.js';
import { WATER_LEVEL, waveAt } from '../world.js';

export const CREATURES = [
  {
    id: 'nessie', icon: '🦕', x: -170, z: -250, depth: 7, period: 34, offset: 0,
    title: 'Nessie, the Loch Ness Monster!',
    text: 'In Scotland (part of the UK) people say a monster lives in Loch Ness, a very deep lake. Nobody has ever proved it… but you just saw her!',
  },
  {
    id: 'whale', icon: '🐋', x: -190, z: 170, depth: 5, period: 28, offset: 9,
    title: 'A giant whale!',
    text: 'Blue whales are the biggest animals that have ever lived – bigger than any dinosaur! Whales swim in the Atlantic Ocean, near Spain and Portugal.',
  },
  {
    id: 'kraken', icon: '🐙', x: 660, z: 450, depth: 9, period: 40, offset: 17,
    title: 'The Kraken!',
    text: 'The Kraken is a sea monster from old Norwegian stories: a giant octopus that pulls ships under the sea. Sail away, quickly!',
  },
];

// ---- Models (front = +z, y = 0 is the water line) ---------------------------------------

function nessie() {
  const G = '#3f8f5f', L = '#8fcf7a';
  const group = new THREE.Group();
  group.add(vox(0.4, (v) => {
    for (const [c, r] of [[-5, 4], [4, 4.5]]) // two humps
      for (let a = 0; a < Math.PI; a += 0.25) line(v, [0, Math.sin(a) * r, c + Math.cos(a) * r], [0, Math.sin(a + 0.25) * r, c + Math.cos(a + 0.25) * r], 1.3, G);
    line(v, [0, -1, 9], [0, 6, 10], 1.6, G); // long neck
    line(v, [0, 6, 10], [0, 12, 12], 1.3, G);
    box(v, -2, 11, 11, 2, 14, 16, G); // head
    box(v, -1, 11, 17, 1, 13, 18, L); // snout
    for (const x of [-2, 2]) set(v, x, 13, 14, '#ffffff'), set(v, x, 13, 15, '#111111');
    for (let y = 2; y <= 10; y += 2) set(v, 0, y + 1, 9 + y * 0.3, L); // little spikes
    line(v, [0, 1, -8], [0, 0, -15], 1.2, G); // tail
    line(v, [0, 0, -15], [0, -1, -19], 0.6, G);
  }));
  return { group, update() {} };
}

function whale() {
  const D = '#3d5a80', W = '#dfe7ee';
  const group = new THREE.Group();
  group.add(vox(0.5, (v) => {
    for (let x = -5; x <= 5; x++)
      for (let y = -4; y <= 4; y++)
        for (let z = -12; z <= 12; z++) if ((x / 5) ** 2 + (y / 4) ** 2 + (z / 12) ** 2 <= 1) set(v, x, y, z, y < -1 ? W : D);
    for (const x of [-4, 4]) set(v, x, 0, 6, '#ffffff'), set(v, x, 0, 7, '#111111');
    line(v, [0, 0, -11], [0, 1, -16], 1.5, D); // tail
    box(v, -5, 1, -18, 5, 2, -16, D); // flukes
  }));
  const spout = vox(0.3, (v) => {
    line(v, [0, 0, 0], [0, 11, 0], 1, (x, y) => (y % 2 ? '#ffffff' : '#bfe8ff'));
    for (let a = 0; a < 6.3; a += 0.6) line(v, [0, 11, 0], [Math.cos(a) * 4, 8, Math.sin(a) * 4], 0.8, '#ffffff');
  });
  spout.position.set(0, 2, 2.5);
  group.add(spout);
  return {
    group,
    update(t, up) {
      const s = up > 0.9 ? Math.max(0, Math.sin(t * 2.5)) : 0; // blows water every second or so
      spout.scale.set(1, s, 1);
      spout.visible = s > 0.05;
    },
  };
}

function kraken() {
  const R = '#b03a5b', P = '#f1b5c4';
  const group = new THREE.Group();
  group.add(vox(0.4, (v) => {
    for (let x = -6; x <= 6; x++)
      for (let y = -2; y <= 7; y++)
        for (let z = -6; z <= 6; z++) if (Math.hypot(x, y * 0.9, z) <= 6.5) set(v, x, y, z, R);
    for (const x of [-3, 3]) box(v, x - 1, 2, 5, x + 1, 4, 6, '#fff3a0'), set(v, x, 3, 7, '#111111');
  }));
  const arms = [];
  for (let i = 0; i < 6; i++) {
    const arm = new THREE.Group(), a = (i / 6) * Math.PI * 2 + 0.3;
    arm.add(vox(0.4, (v) => {
      let p = [0, -2, 0];
      for (let k = 1; k <= 12; k++) {
        const q = [0, k * 1.4 - 2, Math.sin(k * 0.35) * k * 0.45]; // curls outward at the top
        line(v, p, q, 1.8 - k * 0.1, (x, y) => (y % 3 === 0 ? P : R));
        p = q;
      }
    }));
    arm.position.set(Math.sin(a) * 6, 0, Math.cos(a) * 6);
    arm.rotation.y = a;
    group.add(arm);
    arms.push(arm);
  }
  return { group, update: (t) => arms.forEach((arm, i) => (arm.rotation.x = Math.sin(t * 1.6 + i) * 0.3)) };
}

const BUILDERS = { nessie, whale, kraken };

// Up for ~40% of the period: rises, stays, sinks, then hides under the water.
function upAt(c, t) {
  const f = (((t + c.offset) % c.period) + c.period) % c.period / c.period;
  const s = (x) => x * x * (3 - 2 * x);
  return f < 0.1 ? s(f / 0.1) : f < 0.35 ? 1 : f < 0.45 ? s(1 - (f - 0.35) / 0.1) : 0;
}

export function createSeaCreatures(scene) {
  const list = CREATURES.map((c) => {
    const m = BUILDERS[c.id]();
    scene.add(m.group);
    return Object.assign(c, { home: { x: c.x, z: c.z }, up: 0, ...m });
  });
  return {
    list,
    update(t) {
      for (const c of list) {
        c.up = upAt(c, t);
        // Nessie swims in a slow circle, the others just turn a bit.
        if (c.id === 'nessie') {
          const a = t * 0.08;
          c.x = c.home.x + Math.cos(a) * 25;
          c.z = c.home.z + Math.sin(a) * 25;
          c.group.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
        } else c.group.rotation.y = Math.sin(t * 0.1 + c.offset) * 0.6;
        c.group.position.set(c.x, WATER_LEVEL + waveAt(c.x, c.z, t) - (1 - c.up) * c.depth, c.z);
        c.group.visible = c.up > 0;
        if (c.group.visible) c.update(t, c.up);
      }
    },
  };
}

// Map icon: rings on the water, and the creature's icon popping out while it is up
// (only bubbles while it hides). toScreen(x, z) -> [x, y] on the canvas.
export function drawCreatures(g, toScreen, t, scale) {
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const c of CREATURES) {
    const [x, y] = toScreen(c.x, c.z);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2 * scale;
    for (let i = 0; i < 2; i++) {
      const f = (t * 0.7 + i / 2) % 1;
      g.globalAlpha = (1 - f) * (0.25 + c.up * 0.75);
      g.beginPath();
      g.arc(x, y, (5 + f * (8 + c.up * 14)) * scale, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
    if (c.up > 0.05) {
      g.font = `${(12 + c.up * 12) * scale}px sans-serif`;
      g.fillText(c.icon, x, y - c.up * 6 * scale);
    } else {
      g.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(x + (i - 1) * 4 * scale, y - ((t * 8 + i * 5) % 12) * scale, (1.5 + i * 0.5) * scale, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
}
