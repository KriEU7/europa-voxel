// Easter eggs: one funny scene per island, full of (friendly!) stereotypes about the country.
// Each builder returns { group, colliders, update(dt, t) }. Local coordinates: front = +z,
// colliders are circles { x, z, r, top } so they can be turned with the scene.
import * as THREE from 'three';
import { createVoxels, set, box, buildMesh } from '../voxel.js';
import { createCharacter } from './character.js';

export const EGGS = {
  france: {
    title: 'The Mona Lisa heist',
    text: 'Two Italians are trying to take the Mona Lisa "back home": Leonardo da Vinci was Italian, but his painting is in the Louvre in Paris! The French painter is too busy sleeping next to his baguettes.',
  },
  belgium: {
    title: 'The great fries fight',
    text: 'A French man and a Belgian man argue: who invented fries? The French call them "French fries", but the Belgians say fries are Belgian! Meanwhile: waffles and chocolate for everyone.',
  },
  netherlands: {
    title: 'Too many bikes!',
    text: 'In the Netherlands there are more bicycles than people! Here you can see a mountain of bikes, giant wooden clogs, cheese wheels and tulips.',
  },
  uk: {
    title: 'Tea time in the rain',
    text: "It's raining (of course!), but nothing can stop a British tea party. And look at the phone box: a perfect, polite queue.",
  },
  germany: {
    title: 'Always on time',
    text: "This man is waiting for the 8 o'clock train and checks his watch every minute: in Germany you must be on time! Lederhosen, sausages, a giant pretzel… and socks with sandals!",
  },
  spain: {
    title: 'Siesta time',
    text: "After a giant paella it's time for a siesta in the hammock… but the flamenco dancer never stops! ¡Olé!",
  },
  italy: {
    title: 'Pineapple on pizza?!',
    text: "Mamma mia! Somebody put PINEAPPLE on the pizza! For Italians it's a disaster. Look at those hand gestures!",
  },
  greece: {
    title: 'Opa!',
    text: 'At Greek parties people sometimes break plates for fun – Opa! The philosopher keeps thinking, and the goat watches everything.',
  },
};

// ---- Helpers ------------------------------------------------------------------------

const shadowed = (o) => (o.traverse((m) => m.isMesh && (m.castShadow = m.receiveShadow = true)), o);
function vox(size, draw) {
  const v = createVoxels();
  draw(v);
  return shadowed(buildMesh(v, size));
}
const hash = (x, y, z = 0) => {
  const h = Math.sin(x * 12.99 + y * 78.23 + z * 37.72) * 43758.55;
  return h - Math.floor(h);
};
// Thick line from a to b ([x, y, z] in voxels).
function line(v, a, b, r, color) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 2));
  const R = Math.ceil(r);
  for (let i = 0; i <= n; i++) {
    const p = a.map((c, k) => c + ((b[k] - c) * i) / n);
    for (let x = -R; x <= R; x++)
      for (let y = -R; y <= R; y++)
        for (let z = -R; z <= R; z++) if (Math.hypot(x, y, z) <= r + 0.01) set(v, Math.round(p[0] + x), Math.round(p[1] + y), Math.round(p[2] + z), color);
  }
}
// Horizontal disc (or ring) at height y.
function disc(v, y, r, color, r0 = -1) {
  const R = Math.ceil(r);
  for (let x = -R; x <= R; x++)
    for (let z = -R; z <= R; z++) {
      const d = Math.hypot(x, z);
      if (d <= r && d > r0) set(v, x, y, z, color);
    }
}
function put(group, obj, x, y, z, ry = 0) {
  obj.position.set(x, y, z);
  obj.rotation.y = ry;
  group.add(obj);
  return obj;
}
function person(group, look, x, z, ry) {
  const ch = createCharacter({ hairStyle: 'short', bottom: 'long', skin: '#f1c27d', ...look });
  put(group, ch.group, x, 0, z, ry);
  return ch;
}

// Floating "Z z z" over somebody who sleeps.
function sleeping(group, x, y, z) {
  const Z = vox(0.06, (v) => {
    box(v, -2, 2, 0, 2, 2, 0, '#ffffff');
    box(v, -2, -2, 0, 2, -2, 0, '#ffffff');
    for (let i = -1; i <= 1; i++) set(v, i, i, 0, '#ffffff');
  });
  const zs = [0, 1, 2].map(() => put(group, Z.clone(), x, y, z));
  return (t) =>
    zs.forEach((m, i) => {
      const k = (t * 0.4 + i / 3) % 1;
      m.position.set(x + Math.sin(k * 5) * 0.2 + k * 0.3, y + k * 1.2, z);
      m.scale.setScalar(Math.sin(k * Math.PI) * (0.6 + k));
    });
}
// A speech bubble with "!" that pops up over somebody who is shouting.
function shout() {
  return vox(0.05, (v) => {
    box(v, -4, 0, -1, 4, 9, 1, '#ffffff');
    box(v, -3, -1, -1, 3, 10, 1, '#ffffff');
    box(v, -1, -3, 0, 0, -1, 0, '#ffffff');
    box(v, 0, 4, 2, 0, 8, 2, '#e53935');
    set(v, 0, 2, 2, '#e53935');
    box(v, 0, 4, -2, 0, 8, -2, '#e53935');
    set(v, 0, 2, -2, '#e53935');
  });
}
// Simple table: top at `h` voxels (size 0.1), cloth colour can be a function.
function table(w, d, h, cloth, drape = 0) {
  return vox(0.1, (v) => {
    box(v, -w, h, -d, w, h, d, cloth);
    if (drape) for (const [x0, z0, x1, z1] of [[-w, -d, w, -d], [-w, d, w, d], [-w, -d, -w, d], [w, -d, w, d]]) box(v, x0, h - drape, z0, x1, h - 1, z1, cloth);
    for (const [x, z] of [[-w + 1, -d + 1], [w - 1, -d + 1], [-w + 1, d - 1], [w - 1, d - 1]]) box(v, x, 0, z, x, h - 1, z, '#6b4a30');
  });
}
const checks = (a, b) => (x, y, z) => ((Math.floor(x / 2) + Math.floor(z / 2)) % 2 ? a : b);

// ---- France: the Mona Lisa heist ------------------------------------------------------

function monaLisa(u, w) {
  const dx = u - 0.5;
  const face = (dx / 0.12) ** 2 + ((w - 0.7) / 0.14) ** 2 < 1;
  const hair = (dx / 0.2) ** 2 + ((w - 0.71) / 0.19) ** 2 < 1 || (Math.abs(dx) < 0.21 && Math.abs(dx) > 0.1 && w > 0.42 && w < 0.72);
  const body = w < 0.56 && Math.abs(dx) < 0.13 + (0.56 - w) * 0.75;
  if (face) {
    if (w > 0.72 && w < 0.75 && Math.abs(Math.abs(dx) - 0.0536) < 0.015) return '#2a1c10'; // eyes
    if (w > 0.6 && w < 0.625 && Math.abs(dx) < 0.03) return '#8a4a30'; // the famous smile
    return '#d9a86a';
  }
  if (hair) return '#2a1c10';
  if (body) {
    if (w > 0.46 && Math.abs(dx) < 0.09) return '#d9a86a';
    if (w > 0.1 && w < 0.2 && dx > -0.2 && dx < 0.15) return '#d29c62'; // folded hands
    return w > 0.3 ? '#3a2e1c' : '#2b2216';
  }
  return w > 0.55 ? (u < 0.5 ? '#8fa07a' : '#7f9672') : w > 0.4 ? '#7a7448' : '#5e5a3a'; // misty landscape
}

function france() {
  const group = new THREE.Group();
  // Easel (the "tripod") with the painting
  put(group, vox(0.1, (v) => {
    const W = '#8b5a2b';
    line(v, [-6, 0, 4], [-2, 24, 0], 0.5, W);
    line(v, [6, 0, 4], [2, 24, 0], 0.5, W);
    line(v, [0, 0, -7], [0, 22, -1], 0.5, W);
    box(v, -7, 9, 1, 6, 9, 4, W);
  }), 0, 0, -1.2);
  const painting = vox(0.04, (v) => {
    const W = 28, H = 40;
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) set(v, x - 14, y, 1, monaLisa((x + 0.5) / W, (y + 0.5) / H));
    for (let x = -16; x <= 15; x++)
      for (let y = -2; y <= H + 1; y++) {
        if (x >= -14 && x < 14 && y >= 0 && y < H) continue;
        set(v, x, y, 1, (x + y) % 3 ? '#c9a227' : '#e0bd45');
        set(v, x, y, 2, '#b08a1c');
      }
    box(v, -16, -2, 0, 15, H + 1, 0, '#5a3a1e');
  });
  painting.rotation.x = -0.16;
  put(group, painting, 0, 1.08, -0.95);

  // Two Italians tiptoeing towards it, with a sack for the loot
  const thief1 = person(group, { hair: '#1a1a1a', moustache: true, hat: 'cap', hatColor: '#009246', top: 'tshirt', shirt: '#009246', pants: '#f4f4f4' }, -1.6, -0.2, 2.2);
  const thief2 = person(group, { hair: '#2b1b10', moustache: true, top: 'striped', shirt: '#ce2b37', stripe: '#f4f4f4', pants: '#1a1a1a', skin: '#e0ac80' }, -2.6, 0.5, 2.0);
  put(group, vox(0.08, (v) => {
    for (let y = 0; y <= 7; y++) disc(v, y, 4 - Math.abs(y - 3) * 0.5, '#9a7b4f');
    box(v, -1, 8, -1, 0, 9, 0, '#7a5c36');
  }), -3.2, 0, -0.4);

  // The French painter, asleep on a picnic blanket with baguettes and cheese
  put(group, vox(0.1, (v) => {
    box(v, -10, 0, -8, 10, 0, 8, checks('#e53935', '#ffffff'));
    for (const [x, z] of [[4, -5], [6, -4]]) box(v, x, 1, z, x, 1, z + 7, '#d9a35b');
    for (let y = 1; y <= 2; y++) disc(v, y, 2.5, '#f2d16b');
    box(v, -6, 1, 3, -3, 2, 5, '#f6e7a1');
  }), 2.4, 0, 0.6);
  const painter = person(group, { hair: '#222222', moustache: true, hat: 'beret', hatColor: '#1a1a1a', top: 'striped', shirt: '#1c2f5e', stripe: '#ffffff', pants: '#2b2b2b', baguette: true }, 2.0, 0.4, -0.4);
  const zzz = sleeping(group, 2.0, 1.6, 0.4);

  return {
    group,
    colliders: [{ x: 0, z: -1.2, r: 0.8, top: 2.6 }, { x: -1.6, z: -0.2, r: 0.45, top: 2 }, { x: -2.6, z: 0.5, r: 0.45, top: 2 }, { x: 2.0, z: 0.4, r: 0.7, top: 1.2 }],
    update(dt, t) {
      for (const [ch, k] of [[thief1, 0], [thief2, 1.3]]) {
        ch.animate(dt, { speed: 0.35 });
        const p = ch.parts;
        p.hips.rotation.x = 0.35; // crouching
        p.head.rotation.y = Math.sin(t * 1.4 + k) * 0.7; // looking around
        p.armR.rotation.x = -1.3 - Math.sin(t * 2 + k) * 0.15; // reaching for the frame
        p.armL.rotation.x = -0.6;
        p.foreL.rotation.x = -1.2; // "shhh!"
      }
      painter.animate(dt, { sitting: true });
      painter.parts.shinL.rotation.x = painter.parts.shinR.rotation.x = 0.1;
      painter.parts.head.rotation.x = 0.45 + Math.sin(t * 1.2) * 0.04;
      zzz(t);
    },
  };
}

// ---- Belgium: who invented fries? -------------------------------------------------------

function belgium() {
  const group = new THREE.Group();
  put(group, vox(0.1, (v) => {
    box(v, -14, 0, -7, 13, 9, 6, '#a0714a');
    box(v, -14, 3, 7, 13, 6, 7, '#fdda24');
    box(v, -15, 10, -8, 14, 10, 8, '#d9b48a');
    for (const [x, z] of [[-14, -7], [13, -7], [-14, 6], [13, 6]]) box(v, x, 11, z, x, 21, z, '#6b4a30');
    for (let z = -9; z <= 10; z++)
      for (let x = -16; x <= 15; x++) set(v, x, 23 - Math.round((z + 9) * 0.25), z, ['#1a1a1a', '#fdda24', '#ef3340'][Math.floor((x + 16) / 4) % 3]);
    // Giant fries cone on the roof
    for (let y = 24; y <= 34; y++) disc(v, y, 2 + (y - 24) * 0.35, '#e53935', 1 + (y - 24) * 0.35);
    for (let i = 0; i < 40; i++) {
      const x = Math.round((hash(i, 1) - 0.5) * 8), z = Math.round((hash(i, 2) - 0.5) * 8);
      if (Math.hypot(x, z) < 5) box(v, x, 30, z, x, 35 + Math.round(hash(i, 3) * 6), z, hash(i, 4) < 0.5 ? '#f6c945' : '#e8b020');
    }
    disc(v, 39, 1.5, '#fffbe6'); // mayo!
  }), 0, 0, -2);
  // Waffles and chocolate
  put(group, table(6, 5, 8, '#c8b08a'), 3.2, 0, 0.6, -0.4);
  put(group, vox(0.06, (v) => {
    for (let k = 0; k < 4; k++) box(v, -5, k * 2, -5, 4, k * 2 + 1, 4, (x, y, z) => ((x + z) % 2 ? '#e0a440' : '#c98a2e'));
    for (let k = 0; k < 3; k++) box(v, 7, k, -6, 12, k, 5, (x, y, z) => (z % 3 === 0 || x === 9 ? '#4e2c17' : '#5d3820'));
  }), 3.0, 0.9, 0.6, -0.4);
  const french = person(group, { hair: '#222222', moustache: true, hat: 'beret', hatColor: '#1a1a1a', top: 'striped', shirt: '#1c2f5e', stripe: '#ffffff', pants: '#2b2b2b' }, -1.0, 1.4, Math.PI / 2);
  const belgian = person(group, { hair: '#c9a15b', hat: 'cap', hatColor: '#1a1a1a', top: 'tshirt', shirt: '#ef3340', pants: '#1f3264', beard: true, skin: '#f5d0b0' }, 0.7, 1.4, -Math.PI / 2);
  const bubble = put(group, shout(), 0, 2.6, 1.4);

  return {
    group,
    colliders: [{ x: -0.8, z: -2, r: 0.9, top: 2.4 }, { x: 0.8, z: -2, r: 0.9, top: 2.4 }, { x: 3.2, z: 0.6, r: 0.7, top: 1 }, { x: -1, z: 1.4, r: 0.45, top: 2 }, { x: 0.7, z: 1.4, r: 0.45, top: 2 }],
    update(dt, t) {
      const turn = Math.floor(t / 2) % 2; // they talk in turns
      [french, belgian].forEach((ch, i) => {
        ch.animate(dt, {});
        const p = ch.parts, talking = i === turn, s = Math.sin(t * 9 + i);
        p.armR.rotation.x = talking ? -1.5 + s * 0.3 : -0.4;
        p.foreR.rotation.x = talking ? -0.4 : -1.6; // crossed arms when listening
        p.armL.rotation.x = talking ? -0.8 - s * 0.4 : -0.4;
        p.foreL.rotation.x = talking ? -1.2 : -1.6;
        p.head.rotation.x = talking ? -0.15 + s * 0.05 : 0.05;
      });
      bubble.position.x = turn ? 0.7 : -1.0;
      bubble.position.y = 2.6 + Math.abs(Math.sin(t * 6)) * 0.1;
    },
  };
}

// ---- Netherlands: more bikes than people ---------------------------------------------------

function bike(color) {
  return vox(0.05, (v) => {
    for (const z of [-11, 11])
      for (let a = 0; a < 64; a++) set(v, 0, Math.round(7 + Math.cos((a / 64) * Math.PI * 2) * 6.5), Math.round(z + Math.sin((a / 64) * Math.PI * 2) * 6.5), '#222222');
    for (const [a, b] of [[[0, 7, -11], [0, 8, -3]], [[0, 7, -11], [0, 17, -5]], [[0, 8, -3], [0, 18, -5]], [[0, 17, -5], [0, 17, 7]], [[0, 8, -3], [0, 16, 7]], [[0, 7, 11], [0, 20, 8]]])
      line(v, a, b, 0.5, color);
    box(v, -1, 19, -7, 1, 19, -3, '#3a2414'); // saddle
    box(v, -4, 20, 8, 4, 20, 8, '#888888'); // handlebar
    box(v, -3, 15, 10, 3, 19, 15, '#8b5a2b'); // basket
  });
}

function netherlands() {
  const group = new THREE.Group();
  const COLORS = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#ff7f00', '#8e24aa', '#222222'];
  const pile = [[0, 0.1, 0, 1.5, 0.3], [0.3, 0.3, 0.2, -1.45, 1.2], [-0.4, 0.5, -0.1, 1.35, 2.2], [0.2, 0.7, 0.1, -1.5, -0.6], [-1.3, 0, 0.4, 0.25, 0.4], [1.4, 0, -0.3, -0.3, -0.3], [0.1, 0.95, -0.2, 1.2, 0.9]];
  pile.forEach(([x, y, z, rz, ry], i) => {
    const b = put(group, bike(COLORS[i]), x, y, z - 0.6, ry);
    b.rotation.z = rz;
  });
  // Cheese wheels, giant clogs, tulips
  put(group, vox(0.08, (v) => {
    for (let k = 0; k < 4; k++) for (let y = 0; y < 3; y++) disc(v, k * 3 + y, 5 - k * 0.4, k === 2 ? '#c62828' : y === 1 ? '#f6c945' : '#e8b020');
  }), 1.9, 0, 1.6);
  for (const x of [-2.1, -1.4])
    put(group, vox(0.08, (v) => {
      for (let z = -7; z <= 9; z++) {
        const w = z > 3 ? Math.max(1, 3 - Math.round((z - 3) * 0.4)) : 3, top = z > 3 ? 3 + (z > 7 ? 1 : 0) : 5;
        box(v, -w, 0, z, w - 1, top, z, z > 3 && z < 7 ? '#d9a95b' : '#e8c170');
      }
      box(v, -2, 4, -5, 1, 5, 2, '#4a3020'); // the hole for the foot
      box(v, -2, 4, 4, 1, 4, 5, '#d32f2f'); // painted flower
    }), x, 0, 1.5, 0.2);
  put(group, vox(0.1, (v) => {
    for (let i = 0; i < 30; i++) {
      const a = Math.PI * (0.9 + (i / 30) * 1.2), r = 32 + (i % 3) * 3;
      const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
      box(v, x, 0, z, x, 3, z, '#2e7d32');
      box(v, x, 4, z, x + 1, 5, z + 1, ['#e53935', '#fdd835', '#ec407a', '#fb8c00'][i % 4]);
    }
  }), 0, 0, 0.6);

  // Somebody riding round and round
  const rider = new THREE.Group();
  rider.add(bike('#ff7f00'));
  const cyclist = createCharacter({ hairStyle: 'long', hair: '#f0d58c', top: 'tshirt', shirt: '#ff7f00', bottom: 'long', pants: '#21468b', skin: '#f5d0b0' });
  cyclist.group.position.set(0, 0.82, -0.25);
  rider.add(cyclist.group);
  group.add(rider);

  return {
    group,
    colliders: [{ x: 0, z: -0.6, r: 1.6, top: 1.4 }, { x: 1.9, z: 1.6, r: 0.5, top: 1 }, { x: -1.75, z: 1.5, r: 0.8, top: 0.5 }],
    update(dt, t) {
      const a = t * 0.45;
      rider.position.set(Math.sin(a) * 3.8, 0, -0.4 + Math.cos(a) * 3.8);
      rider.rotation.y = a + Math.PI / 2;
      rider.rotation.z = -0.12; // leaning into the curve
      cyclist.animate(dt, { sitting: true });
      const p = cyclist.parts, s = Math.sin(t * 7);
      p.legL.rotation.x = -1.2 + s * 0.35;
      p.legR.rotation.x = -1.2 - s * 0.35;
      p.shinL.rotation.x = 1.3 - s * 0.3;
      p.shinR.rotation.x = 1.3 + s * 0.3;
      p.armL.rotation.x = p.armR.rotation.x = -1.1;
      p.foreL.rotation.x = p.foreR.rotation.x = -0.2;
    },
  };
}

// ---- UK: tea time in the rain ------------------------------------------------------------

function chair() {
  return vox(0.1, (v) => {
    box(v, -2, 4, -2, 2, 4, 2, '#6b4a30');
    for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) box(v, x, 0, z, x, 3, z, '#5a3a20');
    box(v, -2, 5, -2, 2, 10, -2, '#6b4a30');
  });
}

function uk() {
  const group = new THREE.Group();
  put(group, table(6, 6, 7, '#ffffff', 3), -1.0, 0, 0.5);
  put(group, vox(0.05, (v) => {
    for (let y = 0; y <= 6; y++) disc(v, y, 4.5 - Math.abs(y - 3) * 0.45, y === 3 ? '#1e5aa8' : '#ffffff'); // teapot
    disc(v, 7, 1.5, '#ffffff');
    set(v, 0, 8, 0, '#1e5aa8');
    line(v, [5, 2, 0], [8, 6, 0], 0.5, '#ffffff'); // spout
    box(v, -6, 2, 0, -6, 5, 0, '#ffffff'); // handle
    for (const [x, z] of [[-9, 6], [9, -6]]) {
      box(v, x - 2, 0, z - 2, x + 2, 0, z + 2, '#ffffff'); // saucer
      box(v, x - 1, 1, z - 1, x + 1, 2, z + 1, '#f4f4f4');
      set(v, x, 2, z, '#8d5524'); // tea
    }
    for (let i = 0; i < 4; i++) box(v, -3 + i * 2, 0, -9, -2 + i * 2, 1, -8, '#e0b070'); // biscuits
  }), -1.0, 0.8, 0.5);
  put(group, chair(), -2.3, 0, 0.5, Math.PI / 2);
  put(group, chair(), 0.3, 0, 0.5, -Math.PI / 2);
  const lady = person(group, { hairStyle: 'bun', hair: '#d7a86e', hat: 'sunhat', hatColor: '#f8bbd0', top: 'dress', shirt: '#7e57c2', bottom: 'skirt', skin: '#f5d0b0', glasses: true }, -2.3, 0.5, Math.PI / 2);
  const gent = person(group, { hair: '#9e9e9e', moustache: true, hat: 'bowler', hatColor: '#1a1a1a', top: 'tshirt', shirt: '#2b2b2b', pants: '#2b2b2b', long: true, shoes: '#111111' }, 0.3, 0.5, -Math.PI / 2);
  lady.group.position.y = gent.group.position.y = 0.36;

  // A little rain cloud that follows the party
  put(group, vox(0.15, (v) => {
    for (const [x, y, z, r] of [[0, 0, 0, 4], [-4, -1, 1, 3], [4, -1, -1, 3], [1, 1, 3, 3], [-1, 0, -3, 3]])
      for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) if (Math.hypot(a, b * 1.6, c) <= r) set(v, x + a, y + b, z + c, b < -1 ? '#7d8a96' : '#9eabb7');
  }), -1.0, 3.9, 0.5);
  const dropGeo = new THREE.BoxGeometry(0.03, 0.25, 0.03), dropMat = new THREE.MeshBasicMaterial({ color: '#9fd3ff' });
  const drops = Array.from({ length: 36 }, (_, i) => {
    const m = new THREE.Mesh(dropGeo, dropMat);
    m.userData = { x: -1.0 + (hash(i, 7) - 0.5) * 3, z: 0.5 + (hash(i, 8) - 0.5) * 3, k: hash(i, 9) };
    return put(group, m, 0, 0, 0);
  });

  // Phone box with a perfect queue
  put(group, vox(0.1, (v) => {
    box(v, -5, 0, -5, 4, 24, 4, '#c8102e');
    for (const [axis, side] of [['z', 4], ['x', -5], ['x', 4]])
      for (let a = -3; a <= 2; a++)
        for (let y = 8; y <= 19; y++) {
          if (a % 3 === 0 || y % 4 === 0) continue;
          axis === 'z' ? set(v, a, y, side, '#d6eef7') : set(v, side, y, a, '#d6eef7');
        }
    box(v, -4, 21, 5, 3, 22, 5, '#f4f4f4'); // TELEPHONE sign
    box(v, -4, 25, -4, 3, 25, 3, '#c8102e');
    box(v, -2, 26, -2, 1, 26, 1, '#c8102e');
  }), 2.6, 0, -1.6);
  const queue = [
    { hair: '#3b2a1a', hat: 'bowler', hatColor: '#1a1a1a', top: 'tshirt', shirt: '#1c2f5e', pants: '#1a1a1a', long: true },
    { hairStyle: 'long', hair: '#c97b3c', top: 'dress', shirt: '#2e7d32', bottom: 'skirt', skin: '#f5d0b0' },
    { hair: '#1a1a1a', hat: 'cap', hatColor: '#012169', top: 'tshirt', shirt: '#c8102e', bottom: 'shorts', pants: '#012169', skin: '#8d5524' },
  ].map((look, i) => person(group, look, 2.6, -0.3 + i * 0.85, Math.PI));

  return {
    group,
    colliders: [
      { x: -1, z: 0.5, r: 0.8, top: 1 }, { x: -2.3, z: 0.5, r: 0.45, top: 2 }, { x: 0.3, z: 0.5, r: 0.45, top: 2 },
      { x: 2.6, z: -1.6, r: 0.7, top: 2.7 }, ...[0, 1, 2].map((i) => ({ x: 2.6, z: -0.3 + i * 0.85, r: 0.4, top: 2 })),
    ],
    update(dt, t) {
      for (const [ch, k] of [[lady, 0], [gent, 2.5]]) {
        ch.animate(dt, { sitting: true });
        const sip = Math.max(0, Math.sin(t * 0.8 + k)) ** 3; // a sip every few seconds
        ch.parts.armR.rotation.x = -0.7 - sip * 0.9;
        ch.parts.foreR.rotation.x = -0.6 - sip * 1.3;
      }
      for (const ch of queue) ch.animate(dt, {});
      for (const d of drops) {
        const k = (t * 1.3 + d.userData.k) % 1;
        d.position.set(d.userData.x, 3.4 - k * 3.4, d.userData.z);
      }
    },
  };
}

// ---- Germany: always on time ---------------------------------------------------------------

function germany() {
  const group = new THREE.Group();
  // Station clock: 7:59, the train leaves at 8:00!
  put(group, vox(0.1, (v) => {
    box(v, 0, 0, 0, 0, 24, 0, '#7a7a7a');
    for (let x = -6; x <= 6; x++)
      for (let y = -6; y <= 6; y++) {
        const d = Math.hypot(x, y);
        if (d > 6.4) continue;
        const c = d > 5.4 ? '#333333' : '#ffffff';
        set(v, x, 30 + y, 0, c);
        set(v, x, 30 + y, 1, c);
      }
    for (let h = 0; h < 12; h++) set(v, Math.round(Math.sin((h / 12) * Math.PI * 2) * 4.6), 30 + Math.round(Math.cos((h / 12) * Math.PI * 2) * 4.6), 2, '#222222');
    line(v, [0, 30, 2], [-2.5, 28.5, 2], 0, '#222222'); // hour hand (almost 8)
    line(v, [0, 30, 2], [-0.4, 34.5, 2], 0, '#222222'); // minute hand (59)
  }), -2.4, 0, -1.4);
  const second = put(group, vox(0.025, (v) => box(v, 0, -2, 0, 0, 16, 0, '#e53935')), -2.36, 3.05, -1.1);

  const waiting = person(group, { hair: '#e8c170', moustache: true, hat: 'sunhat', hatColor: '#2e5e2a', top: 'tshirt', shirt: '#f4f4f4', suspenders: '#5d4037', bottom: 'shorts', pants: '#6d4c41', socks: '#f4f4f4', shoes: '#8b5a2b', watch: true }, -1.2, -0.4, 0.4);

  // Sausages on the grill
  put(group, vox(0.1, (v) => {
    for (const [x, z] of [[-4, -3], [4, -3], [0, 4]]) line(v, [x, 0, z], [x * 0.6, 7, z * 0.6], 0, '#333333');
    for (let y = 7; y <= 10; y++) disc(v, y, 4 + (y - 7) * 0.6, '#2b2b2b');
    disc(v, 11, 6, '#9e9e9e');
    for (let i = -2; i <= 2; i++) box(v, i * 2, 12, -3, i * 2, 12, 3, i % 2 ? '#a0522d' : '#b5651d');
  }), 1.4, 0, -1.2);
  const smokeGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22), smokeMat = new THREE.MeshLambertMaterial({ color: '#d0d0d0' });
  const smoke = Array.from({ length: 5 }, () => put(group, new THREE.Mesh(smokeGeo, smokeMat), 1.4, 1.3, -1.2));

  // Giant pretzel
  put(group, vox(0.08, (v) => {
    const B = (x, y, z) => (hash(x, y, z) < 0.12 ? '#ffffff' : '#8b4513');
    for (let a = 0; a < 80; a++) {
      const t = (a / 80) * Math.PI * 2;
      line(v, [Math.round(Math.cos(t) * 8), Math.round(12 + Math.sin(t) * 8), 0], [Math.round(Math.cos(t) * 8), Math.round(12 + Math.sin(t) * 8), 0], 1.4, B);
    }
    line(v, [-4, 18, 0], [3, 5, 0], 1.4, B);
    line(v, [4, 18, 0], [-3, 5, 0], 1.4, B);
    box(v, -3, 0, -2, 3, 2, 2, '#6b4a30');
  }), 2.6, 0, 1.2, -0.5);

  return {
    group,
    colliders: [{ x: -2.4, z: -1.4, r: 0.35, top: 3.6 }, { x: -1.2, z: -0.4, r: 0.45, top: 2 }, { x: 1.4, z: -1.2, r: 0.6, top: 1.3 }, { x: 2.6, z: 1.2, r: 0.8, top: 1.6 }],
    update(dt, t) {
      second.rotation.z = -Math.floor(t) * (Math.PI / 30); // tick, tick
      waiting.animate(dt, {});
      const p = waiting.parts, look = (t % 5) < 3; // checks his watch again and again
      p.armL.rotation.x = look ? -1.4 : -0.1;
      p.armL.rotation.z = look ? 0.5 : -0.06;
      p.foreL.rotation.x = look ? -1.0 : -0.25;
      p.head.rotation.x = look ? 0.35 : 0;
      p.head.rotation.y = look ? -0.4 : 0;
      p.legR.rotation.x = look ? 0 : -Math.abs(Math.sin(t * 8)) * 0.15; // tapping his foot
      smoke.forEach((m, i) => {
        const k = (t * 0.35 + i / 5) % 1;
        m.position.set(1.4 + Math.sin(k * 6 + i) * 0.2, 1.3 + k * 2, -1.2);
        m.scale.setScalar(0.5 + k * 1.5);
      });
    },
  };
}

// ---- Spain: siesta and flamenco ------------------------------------------------------------

function spain() {
  const group = new THREE.Group();
  put(group, vox(0.1, (v) => {
    for (const z of [-17, 17]) box(v, 0, 0, z, 0, 15, z, '#7a5230');
    for (let z = -13; z <= 13; z++) {
      const y = Math.round(6 + 4 * (z / 13) ** 2);
      box(v, -4, y, z, 4, y, z, Math.floor((z + 13) / 3) % 2 ? '#f1bf00' : '#c60b1e');
    }
    line(v, [0, 15, -17], [0, 10, -13], 0, '#e8d8b0');
    line(v, [0, 15, 17], [0, 10, 13], 0, '#e8d8b0');
  }), -1.6, 0, 0);
  const sleeper = person(group, { hair: '#1a1a1a', moustache: true, hat: 'sunhat', hatColor: '#e6c27a', top: 'tshirt', shirt: '#ffffff', bottom: 'shorts', pants: '#1f3264', skin: '#e0ac80' }, -1.6, 1.05, 0);
  sleeper.group.rotation.x = -Math.PI / 2;
  sleeper.group.position.y = 0.78;
  const zzz = sleeping(group, -1.6, 1.4, -0.9);

  const dancer = person(group, { hairStyle: 'bun', hair: '#1a1a1a', top: 'dress', shirt: '#d32f2f', bottom: 'skirt', shoes: '#1a1a1a', skin: '#e0ac80' }, 1.5, 0.8, 0);

  // Giant paella
  put(group, vox(0.1, (v) => {
    for (const [x, z] of [[-6, -4], [6, -4], [0, 7]]) box(v, x, 0, z, x, 1, z, '#333333');
    disc(v, 2, 9, '#3a3a3a');
    disc(v, 3, 9, '#3a3a3a', 8);
    box(v, -12, 3, -1, -10, 3, 1, '#3a3a3a');
    box(v, 10, 3, -1, 12, 3, 1, '#3a3a3a');
    disc(v, 3, 8, (x, y, z) => {
      const h = hash(x, z);
      return h < 0.08 ? '#f48a8a' : h < 0.14 ? '#43a047' : h < 0.2 ? '#d32f2f' : h < 0.6 ? '#f2c230' : '#e8a020';
    });
    for (const [x, z] of [[3, 2], [-4, -3], [0, -5]]) box(v, x, 4, z, x + 1, 4, z, '#fff59d'); // lemon
  }), 1.4, 0, -1.8);
  // Guitar leaning on the hammock post
  const guitar = put(group, vox(0.05, (v) => {
    for (let x = -5; x <= 5; x++)
      for (let y = 0; y <= 16; y++)
        if (Math.hypot(x, y - 5) <= 5 || Math.hypot(x, y - 12) <= 3.8) {
          set(v, x, y, 0, Math.hypot(x, y - 9) < 1.6 ? '#2b1b10' : '#c68642');
          set(v, x, y, -1, '#8d5524');
        }
    box(v, -1, 17, 0, 0, 30, 0, '#5a3a1e');
    box(v, -1, 31, 0, 0, 34, 0, '#2b1b10');
  }), -1.0, 0, 1.9, 0.4);
  guitar.rotation.x = -0.25;

  return {
    group,
    colliders: [{ x: -1.6, z: -1.7, r: 0.25, top: 1.6 }, { x: -1.6, z: 1.7, r: 0.25, top: 1.6 }, { x: -1.6, z: 0, r: 0.6, top: 1.2 }, { x: 1.5, z: 0.8, r: 0.5, top: 2 }, { x: 1.4, z: -1.8, r: 0.95, top: 0.5 }],
    update(dt, t) {
      zzz(t);
      dancer.animate(dt, {});
      dancer.group.rotation.y += dt * 1.8;
      dancer.group.position.y = Math.abs(Math.sin(t * 5)) * 0.07;
      const p = dancer.parts;
      p.armL.rotation.z = -2.6 + Math.sin(t * 3) * 0.15;
      p.armR.rotation.z = 2.6 - Math.sin(t * 3) * 0.15;
      p.foreL.rotation.x = p.foreR.rotation.x = -0.4;
      p.hips.rotation.z = Math.sin(t * 5) * 0.06;
      sleeper.animate(dt, {});
    },
  };
}

// ---- Italy: pineapple on the pizza! ---------------------------------------------------------

function italy() {
  const group = new THREE.Group();
  put(group, vox(0.1, (v) => {
    box(v, -12, 0, -12, 12, 7, 12, (x, y, z) => (hash(x, y, z) < 0.5 ? '#9e9e9e' : '#8a8a8a'));
    for (let x = -11; x <= 11; x++)
      for (let y = 0; y <= 11; y++)
        for (let z = -11; z <= 11; z++) {
          const d = Math.hypot(x, y, z);
          if (d > 11 || d < 9.5 || (z > 5 && Math.abs(x) < 4 && y < 7)) continue;
          set(v, x, 8 + y, z, hash(x, y, z) < 0.3 ? '#a04a22' : '#b5562a');
        }
    disc(v, 8, 8, '#4a3a30');
    for (let i = 0; i < 14; i++) set(v, Math.round((hash(i, 1) - 0.5) * 8), 9 + Math.floor(hash(i, 2) * 3), -4 + Math.round(hash(i, 3) * 4), hash(i, 4) < 0.5 ? '#ffb300' : '#e65100'); // fire
    box(v, -2, 19, -6, 1, 25, -3, '#8a8a8a'); // chimney
  }), -1.8, 0, -1.8, 0.3);
  put(group, table(8, 6, 7, checks('#d32f2f', '#ffffff'), 2), 1.0, 0, 0.2);
  put(group, vox(0.06, (v) => {
    // The pizza (with pineapple!) and a plate of spaghetti
    disc(v, 0, 8, '#d9a35b');
    disc(v, 1, 7, (x, y, z) => {
      const h = hash(x, z);
      return h < 0.2 ? '#ffd54f' : h < 0.3 ? '#f48fb1' : h < 0.65 ? '#ffe082' : '#d84315';
    });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      box(v, Math.round(Math.cos(a) * 4), 2, Math.round(Math.sin(a) * 4), Math.round(Math.cos(a) * 4) + 1, 2, Math.round(Math.sin(a) * 4), '#fdd835');
    }
    for (let x = 12; x <= 24; x++) for (let z = -6; z <= 6; z++) if (Math.hypot(x - 18, z) <= 6) set(v, x, 0, z, '#ffffff');
    for (let i = 0; i < 70; i++) {
      const x = 18 + Math.round((hash(i, 5) - 0.5) * 8), z = Math.round((hash(i, 6) - 0.5) * 8), y = 1 + Math.floor(hash(i, 7) * 3);
      if (Math.hypot(x - 18, z) < 4.2) set(v, x, y, z, y === 3 ? '#c62828' : '#f3d27a');
    }
    for (const [x, z] of [[17, -1], [19, 2], [20, -2]]) box(v, x, 3, z, x + 1, 4, z + 1, '#6d3b1f');
  }), 0.5, 0.8, 0.2);
  const chef = person(group, { hair: '#1a1a1a', moustache: true, hat: 'chef', hatColor: '#ffffff', top: 'apron', shirt: '#f4f1ea', pants: '#424242' }, 2.6, 0.2, -Math.PI / 2);
  const nonna = person(group, { hairStyle: 'bun', hair: '#d8d8d8', top: 'dress', shirt: '#1a1a1a', bottom: 'skirt', glasses: true, skin: '#e0ac80' }, 1.0, 1.6, Math.PI);
  const bubble = put(group, shout(), 2.6, 2.7, 0.2);
  // Vespa
  put(group, vox(0.05, (v) => {
    for (const z of [-10, 10]) for (let a = 0; a < 40; a++) set(v, 0, Math.round(4 + Math.cos((a / 40) * Math.PI * 2) * 3.5), Math.round(z + Math.sin((a / 40) * Math.PI * 2) * 3.5), '#222222');
    box(v, -3, 5, -12, 3, 11, -2, '#7fd1b9'); // body
    box(v, -2, 4, -2, 2, 6, 8, '#7fd1b9'); // footboard
    box(v, -3, 6, 8, 3, 17, 9, '#7fd1b9'); // leg shield
    box(v, -2, 12, -10, 2, 13, -3, '#5d4037'); // seat
    box(v, -5, 18, 8, 5, 18, 8, '#c0c0c0'); // handlebar
    box(v, -1, 16, 10, 1, 17, 10, '#fff59d'); // light
  }), -2.6, 0, 1.4, 0.6);

  return {
    group,
    colliders: [{ x: -1.8, z: -1.8, r: 1.3, top: 2.5 }, { x: 1, z: 0.2, r: 0.9, top: 0.9 }, { x: 2.6, z: 0.2, r: 0.45, top: 2 }, { x: 1, z: 1.6, r: 0.45, top: 2 }, { x: -2.6, z: 1.4, r: 0.6, top: 1 }],
    update(dt, t) {
      chef.animate(dt, {});
      nonna.animate(dt, {});
      const c = chef.parts, s = Math.sin(t * 10), s2 = Math.sin(t * 10 + 1.5);
      c.armR.rotation.x = -0.9;
      c.foreR.rotation.x = -1.3 + s * 0.3; // pinched fingers: "ma che fai?!"
      c.armL.rotation.x = -0.9;
      c.foreL.rotation.x = -1.3 + s2 * 0.3;
      c.head.rotation.x = -0.1 + s * 0.04;
      const n = nonna.parts; // hands on the head: disaster!
      n.armL.rotation.x = n.armR.rotation.x = -2.6;
      n.armL.rotation.z = -0.5;
      n.armR.rotation.z = 0.5;
      n.foreL.rotation.x = n.foreR.rotation.x = -1.5;
      n.head.rotation.y = Math.sin(t * 4) * 0.35; // shaking her head
      bubble.position.y = 2.7 + Math.abs(Math.sin(t * 6)) * 0.12;
    },
  };
}

// ---- Greece: Opa! --------------------------------------------------------------------------

function greece() {
  const group = new THREE.Group();
  put(group, vox(0.06, (v) => {
    for (let i = 0; i < 160; i++) {
      const a = hash(i, 1) * Math.PI * 2, r = Math.sqrt(hash(i, 2)) * 12;
      const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
      set(v, x, Math.max(0, Math.round((12 - r) / 5 + hash(i, 3))), z, hash(i, 4) < 0.25 ? '#1e5aa8' : '#f4f4f4');
    }
  }), 1.5, 0, -0.6);
  put(group, table(4, 4, 8, '#c8b08a'), -1.0, 0, -1.4);
  put(group, vox(0.05, (v) => {
    for (let k = 0; k < 8; k++) disc(v, k, 5, k % 2 ? '#1e5aa8' : '#ffffff');
  }), -1.0, 0.9, -1.4);
  const plateMesh = vox(0.05, (v) => (disc(v, 0, 4, '#ffffff'), disc(v, 0, 4, '#1e5aa8', 3.2)));
  const plate = put(group, plateMesh, 0, 0, 0);
  const thrower = person(group, { hair: '#1a1a1a', moustache: true, hat: 'cap', hatColor: '#0d5eaf', top: 'tshirt', shirt: '#ffffff', pants: '#1a1a1a', skin: '#e0ac80' }, -0.9, -0.3, Math.PI / 2);

  // Philosopher statue, "The Thinker" style
  put(group, vox(0.1, (v) => box(v, -5, 0, -5, 4, 7, 4, '#d8d4ca')), -2.4, 0, 1.2);
  const statue = createCharacter({ skin: '#eeeae0', hair: '#d8d4ca', beard: true, top: 'dress', shirt: '#f4f1ea', bottom: 'long', pants: '#e8e4dc', shoes: '#e0dcd2', socks: '#e0dcd2' });
  put(group, statue.group, -2.45, 0.8, 1.15, 0.6);
  statue.parts.armR.rotation.x = -1.9;
  statue.parts.foreR.rotation.x = -2.0;
  statue.parts.head.rotation.x = 0.3;

  // A goat on a rock and an amphora with olive oil
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), new THREE.MeshLambertMaterial({ color: '#9a9a96', flatShading: true }));
  put(group, shadowed(rock), 2.4, 0.35, 1.5);
  const goat = put(group, vox(0.05, (v) => {
    const fur = (x, y, z) => (hash(x, y, z) < 0.15 ? '#8d6e63' : '#f4f1ea');
    box(v, -3, 8, -6, 3, 14, 6, fur);
    for (const [x, z] of [[-3, -6], [2, -6], [-3, 5], [2, 5]]) box(v, x, 0, z, x + 1, 7, z + 1, '#d7ccc8');
    box(v, -2, 13, 6, 2, 18, 10, fur);
    box(v, -1, 14, 11, 1, 16, 12, '#f4f1ea');
    box(v, -1, 11, 10, 0, 12, 10, '#bcaaa4'); // beard
    for (const x of [-2, 2]) {
      line(v, [x, 18, 7], [x, 21, 4], 0, '#5d4037'); // horns
      set(v, x, 17, 11, '#1a1a1a');
    }
    box(v, -1, 12, -7, 0, 13, -7, '#f4f1ea');
  }), 2.4, 0.95, 1.5, -0.8);
  put(group, vox(0.05, (v) => {
    const R = [2, 3, 4, 5, 5.5, 6, 6, 6, 5.5, 5, 4.5, 4, 3, 2, 2, 2, 2.5, 3];
    R.forEach((r, y) => disc(v, y, r, y === 8 || y === 9 ? '#1a1a1a' : '#c4622d', r - 1.2));
    for (const x of [-4, 4]) line(v, [x, 15, 0], [x * 1.4, 12, 0], 0, '#c4622d');
  }), 0.4, 0, 1.9);

  return {
    group,
    colliders: [{ x: 1.5, z: -0.6, r: 0.8, top: 0.3 }, { x: -1, z: -1.4, r: 0.5, top: 1.3 }, { x: -0.9, z: -0.3, r: 0.45, top: 2 }, { x: -2.4, z: 1.2, r: 0.65, top: 3 }, { x: 2.4, z: 1.5, r: 0.7, top: 2 }, { x: 0.4, z: 1.9, r: 0.35, top: 0.9 }],
    update(dt, t) {
      thrower.animate(dt, {});
      const k = (t % 1.8) / 1.8, a = thrower.parts.armR;
      a.rotation.x = k < 0.35 ? (k / 0.35) * 1.0 : k < 0.5 ? 1.0 - ((k - 0.35) / 0.15) * 2.8 : -1.8 + Math.min(1, (k - 0.5) / 0.3) * 1.8;
      plate.visible = k > 0.45 && k < 0.85;
      if (plate.visible) {
        const f = (k - 0.45) / 0.4;
        plate.position.set(-0.5 + f * 2.0, 1.9 + Math.sin(f * Math.PI) * 0.8 - f * 1.7, -0.3 - f * 0.3);
        plate.rotation.z = f * 12;
      }
      goat.rotation.y = -0.8 + Math.sin(t * 0.7) * 0.4;
    },
  };
}

export const EGG_BUILDERS = { france, belgium, netherlands, uk, germany, spain, italy, greece };
