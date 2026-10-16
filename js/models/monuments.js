// Voxel monuments of every island (the Eiffel Tower is in france.js).
// Each builder returns { object, colliders, update? }.
// Colliders are in world units relative to the monument centre, front = +z:
//   circle { x, z, r, top } or box { x0, z0, x1, z1, top }, top measured from the ground.
//   `air: true` = only the plane bumps into it (the upper part of tall buildings).
import * as THREE from 'three';
import { createVoxels, set, box, buildMesh, material } from '../voxel.js';
import { M, classify } from '../textures.js';

// Detail texture of a colour, with some materials replaced (e.g. white -> marble).
const swap = (map) => (hex) => map[classify(hex)] ?? classify(hex);

const shadow = (m) => ((m.castShadow = m.receiveShadow = true), m);
const hash = (x, y, z) => {
  const h = Math.sin(x * 12.99 + y * 78.23 + z * 37.72) * 43758.55;
  return h - Math.floor(h);
};

function ball(v, c, r, color, shell = false) {
  const R = Math.ceil(r);
  for (let x = -R; x <= R; x++)
    for (let y = -R; y <= R; y++)
      for (let z = -R; z <= R; z++) {
        const d = Math.hypot(x, y, z);
        if (d <= r && (!shell || d > r - 1.6)) set(v, Math.round(c.x) + x, Math.round(c.y) + y, Math.round(c.z) + z, typeof color === 'function' ? color(x, y, z) : color);
      }
}

function tube(v, a, b, r, color) {
  const len = a.distanceTo(b), p = new THREE.Vector3();
  for (let t = 0; t <= len; t += 0.7) ball(v, p.lerpVectors(a, b, t / len), r, color);
}

// Filled (or hollow) cylinder standing on y0.
function cylinder(v, cx, cz, r, y0, y1, color, hollow = false) {
  const R = Math.ceil(r);
  for (let x = -R; x <= R; x++)
    for (let z = -R; z <= R; z++) {
      const d = Math.hypot(x, z);
      if (d > r || (hollow && d < r - 1.5)) continue;
      for (let y = y0; y <= y1; y++) set(v, cx + x, y, cz + z, typeof color === 'function' ? color(x, y, z) : color);
    }
}

function cone(v, cx, cz, r, y0, h, color) {
  for (let k = 0; k < h; k++) cylinder(v, cx, cz, r * (1 - k / h), y0 + k, y0 + k, color);
}

// ---- Belgium: Atomium --------------------------------------------------------------

export function atomium() {
  const v = createVoxels(), S = 0.25, a = 24;
  const METAL = (x, y, z) => (Math.abs(y) <= 1 && (x + z) % 3 === 0 ? '#2e3d50' : hash(x, y, z) < 0.5 ? '#cfd6dd' : '#bcc4cc');
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 1, 1).normalize(), new THREE.Vector3(0, 1, 0));
  const lift = a * Math.sqrt(3) + 16;
  const corners = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1])
    corners.push({ o: [x, y, z], p: new THREE.Vector3(x * a, y * a, z * a).applyQuaternion(q).add(new THREE.Vector3(0, lift, 0)) });
  const centre = new THREE.Vector3(0, lift, 0);
  for (const c of corners) {
    tube(v, c.p, centre, 2.2, '#aeb6be');
    for (const d of corners) if (c.o.filter((k, i) => k !== d.o[i]).length === 1 && c.p.x < d.p.x + 1e-6) tube(v, c.p, d.p, 2.5, '#aeb6be');
  }
  // Supports: a pillar under the bottom sphere and three slanted legs.
  const bottom = corners.find((c) => c.o.every((k) => k === -1)).p;
  tube(v, new THREE.Vector3(0, 0, 0), bottom, 2.5, '#9aa2aa');
  for (const c of corners.filter((c) => c.o.filter((k) => k === -1).length === 2)) tube(v, new THREE.Vector3(c.p.x * 1.2, 0, c.p.z * 1.2), c.p, 1.8, '#9aa2aa');
  for (const p of [...corners.map((c) => c.p), centre]) ball(v, p, 9, METAL, true);
  // Small glass pavilion at the entrance
  box(v, -6, 0, 8, 5, 6, 14, '#9fd3f0');
  box(v, -7, 7, 7, 6, 7, 15, '#d9d9d9');

  const legs = corners.filter((c) => c.o.filter((k) => k === -1).length === 2).map((c) => ({ x: c.p.x * 1.2 * S, z: c.p.z * 1.2 * S, r: 0.6, top: 6 }));
  return {
    object: shadow(buildMesh(v, S, () => M.METAL)),
    colliders: [{ x: 0, z: 0, r: 2.6, top: 7 }, { x0: -1.8, z0: 2, x1: 1.6, z1: 3.8, top: 2 }, ...legs, { x: 0, z: 0, r: 12, top: 28, air: true }],
  };
}

// ---- Italy: Colosseum and Leaning Tower of Pisa ------------------------------------------

export function colosseum() {
  const v = createVoxels(), S = 0.4, A = 40, B = 32, T = 6, H = 30;
  for (let x = -A; x <= A; x++)
    for (let z = -B; z <= B; z++) {
      const e = Math.hypot(x / A, z / B);
      if (e > 1.035) continue;
      const proud = e > 1; // half-columns and cornices standing out of the outer wall
      const ei = Math.hypot(x / (A - T), z / (B - T));
      if (ei > 1) {
        // Outer wall with three rows of arches and a top row of windows
        const th = Math.atan2(z / B, x / A), s = th * (A + B) * 0.5;
        const u = ((s % 6) + 6) % 6;
        const ruined = th > 0.35 && th < 1.7;
        const outer = e > 1 - (T / A) * 0.5;
        const cut = 17 + Math.floor(hash(Math.round(s), 0, 0) * 6);
        for (let y = 0; y < H; y++) {
          if (ruined && outer && y > cut) continue;
          const tier = Math.min(3, Math.floor(y / 8)), ty = y - tier * 8;
          if (proud) {
            if (ty === 0 || ty === 7 || (tier < 3 && (u < 0.8 || u > 5.2))) set(v, x, y, z, ty === 0 || ty === 7 ? '#e2d3ae' : '#d9c79f');
            continue;
          }
          if (tier < 3 && ty >= 1 && ty <= 5 && u >= 1.5 && u <= 4.5 && !(ty === 5 && (u < 2.5 || u > 3.5))) continue;
          if (tier === 3 && ty >= 2 && ty <= 3 && u >= 2.5 && u <= 3.5 && Math.floor(s / 6) % 2 === 0) continue;
          set(v, x, y, z, ty === 0 ? '#c9b48a' : hash(x, y, z) < 0.5 ? '#dccba4' : '#d3c099');
        }
      } else if (ei > 0.55) {
        // Seats going down towards the arena
        const h = Math.round(((ei - 0.55) / 0.45) * 22);
        for (let y = 0; y <= h; y++) set(v, x, y, z, y === h ? (h % 2 ? '#c4b28c' : '#b5a27c') : '#a8966f');
      } else {
        set(v, x, 0, z, (x > 0 && (x % 5 === 0 || z % 5 === 0)) ? '#9c8763' : '#d6bf8e'); // arena (the floor is partly missing!)
      }
    }
  const colliders = [];
  for (let i = 0; i < 44; i++) {
    const th = (i / 44) * Math.PI * 2;
    colliders.push({ x: Math.cos(th) * (A - T / 2) * S, z: Math.sin(th) * (B - T / 2) * S, r: 1.8, top: 12 });
  }
  colliders.push({ x: 0, z: 0, r: 15, top: 9, air: true });
  return { object: shadow(buildMesh(v, S)), colliders };
}

export function pisa() {
  const v = createVoxels(), S = 0.25, R = 12;
  const MARBLE = (x, y, z) => (hash(x, y, z) < 0.5 ? '#f2efe6' : '#e9e4d6');
  for (let x = -R - 1; x <= R + 1; x++)
    for (let z = -R - 1; z <= R + 1; z++) {
      const d = Math.hypot(x, z), th = Math.atan2(z, x), col = ((th / (Math.PI * 2)) * 18 + 18) % 1;
      for (let y = 0; y < 66; y++) {
        const level = y < 10 ? 0 : y < 58 ? 1 + Math.floor((y - 10) / 8) : 7;
        const ty = level === 0 ? y : level === 7 ? y - 58 : (y - 10) % 8;
        let c = null;
        if (level === 0) {
          if (d <= R) c = ty >= 2 && ty <= 7 && col > 0.3 && col < 0.75 && d > R - 1 ? '#d8d2c2' : MARBLE(x, y, z); // blind arches
        } else if (level === 7) {
          if (d <= 8.5 && d > 7 && !(ty >= 2 && ty <= 5 && col < 0.5)) c = MARBLE(x, y, z);
        } else {
          if (d <= 9 && d > 7.5) c = '#d8d2c2'; // inner wall in the shade
          if (ty === 0 && d <= R + 1) c = '#e0dbcc'; // ledge
          if (ty === 7 && d <= R) c = MARBLE(x, y, z); // arches
          if (d > R - 1.2 && d <= R && col < 0.3) c = '#f7f4ec'; // columns
        }
        if (c) set(v, x, y, z, c);
      }
    }
  cone(v, 0, 0, 7, 66, 3, '#c9c2b0');
  const object = shadow(buildMesh(v, S, swap({ [M.PLASTER]: M.MARBLE, [M.STONE]: M.MARBLE })));
  const g = new THREE.Group();
  g.add(object);
  g.rotation.z = -0.09; // the famous lean!
  return { object: g, colliders: [{ x: 0, z: 0, r: 3.3, top: 17 }] };
}

// ---- Germany: Brandenburg Gate and Neuschwanstein Castle -----------------------------------

export function brandenburgGate() {
  const v = createVoxels(), S = 0.25;
  const STONE = (x, y, z) => (hash(x, y, z) < 0.5 ? '#e6dcc3' : '#ddd1b4');
  const COPPER = '#4f8f7a';
  box(v, -46, 0, -14, 45, 1, 13, '#cfc4a8');
  const XS = [-36, -23, -8, 8, 23, 36];
  for (const x of XS) {
    box(v, x - 2, 2, -8, x + 1, 27, 7, STONE); // walls between the passages
    for (const z of [-10, 10]) {
      cylinder(v, x, z, 4, 2, 2, '#d3c7aa');
      cylinder(v, x, z, 3, 3, 28, (cx, y, cz) => (Math.round(Math.atan2(cz, cx) * 3) % 2 ? '#e8dfc8' : '#d9cdb0'));
      box(v, x - 4, 29, z - 4, x + 3, 29, z + 3, '#d3c7aa');
    }
  }
  box(v, -40, 30, -14, 39, 35, 13, STONE);
  for (let x = -40; x <= 39; x += 4) for (const z of [-14, 13]) box(v, x, 32, z, x + 1, 33, z, '#bfb394'); // triglyphs
  box(v, -26, 36, -10, 25, 41, 9, STONE);
  box(v, -28, 36, -11, 27, 36, 10, '#d3c7aa');
  box(v, -10, 42, -5, 9, 43, 4, STONE);
  // Wings at both sides
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -54 : 41, x1 = x0 + 12;
    box(v, x0, 0, -11, x1, 21, 10, STONE);
    for (let z = -9; z <= 8; z += 4) box(v, sx < 0 ? x0 - 1 : x1 + 1, 6, z, sx < 0 ? x0 - 1 : x1 + 1, 14, z + 1, '#6b7a8a');
    for (let k = 0; k < 6; k++) box(v, x0 + k, 22 + k, -11 + k, x1 - k, 22 + k, 10 - k, '#8a8476');
  }
  // Quadriga: chariot, goddess and four horses (copper green)
  box(v, -3, 44, -3, 2, 48, 2, COPPER);
  box(v, -1, 48, -1, 0, 56, 0, COPPER);
  box(v, 1, 52, 0, 1, 61, 0, COPPER);
  box(v, 0, 61, -1, 2, 62, 1, COPPER);
  for (const hx of [-9, -4, 2, 7]) {
    box(v, hx, 48, 3, hx + 2, 51, 10, COPPER);
    for (const lz of [3, 9]) for (const lx of [hx, hx + 2]) box(v, lx, 44, lz, lx, 47, lz, COPPER);
    box(v, hx, 51, 9, hx + 2, 55, 11, COPPER);
    box(v, hx, 53, 12, hx + 2, 54, 13, COPPER);
  }
  const colliders = [{ x0: -11.5, z0: -3.5, x1: 11.5, z1: 3.5, top: 0.5 }]; // base step
  for (const x of XS) {
    colliders.push({ x0: x * S - 0.5, z0: -2.5, x1: x * S + 0.5, z1: 2.5, top: 8 });
    for (const z of [-10, 10]) colliders.push({ x: x * S, z: z * S, r: 0.85, top: 8 });
  }
  colliders.push({ x0: -13.5, z0: -2.8, x1: -10.2, z1: 2.8, top: 6 }, { x0: 10.2, z0: -2.8, x1: 13.5, z1: 2.8, top: 6 });
  colliders.push({ x0: -13.5, z0: -3.5, x1: 13.5, z1: 3.5, top: 16, air: true });
  return { object: shadow(buildMesh(v, S, swap({ [M.FOLIAGE]: M.METAL }))), colliders };
}

export function neuschwanstein() {
  const v = createVoxels(), S = 0.3;
  const WALL = (x, y, z) => (y % 6 >= 2 && y % 6 <= 3 && ((x + z) & 3) < 2 ? '#4a5d7a' : '#efe9df');
  const ROOF = '#4a5d7a';
  box(v, -20, 0, -8, 19, 38, 7, WALL);
  for (let k = 0; k <= 8; k++) box(v, -20, 39 + k, -8 + k, 19, 39 + k, 7 - k, ROOF);
  const towers = [[22, 0, 5, 60, 15], [-22, -6, 3, 48, 10], [-22, 6, 3, 44, 10], [10, 10, 3, 52, 10], [-8, 9, 2.5, 46, 8]];
  for (const [x, z, r, h, roof] of towers) {
    cylinder(v, x, z, r, 0, h, WALL);
    cylinder(v, x, z, r + 1, h + 1, h + 1, '#d9d2c4');
    cone(v, x, z, r + 1, h + 2, roof, ROOF);
    set(v, x, h + 2 + roof, z, '#d4af37');
  }
  box(v, -6, 0, 10, 5, 20, 16, '#b5654a'); // red gatehouse
  box(v, -2, 0, 17, 1, 6, 17, '#3a2a20');
  for (let x = -6; x <= 5; x += 2) box(v, x, 21, 10, x, 22, 16, '#b5654a');
  return {
    object: shadow(buildMesh(v, S, swap({ [M.PAINT]: M.ROOF }))),
    colliders: [
      { x0: -6, z0: -2.4, x1: 6, z1: 2.4, top: 14 }, { x0: -1.8, z0: 2.4, x1: 1.8, z1: 5, top: 7 },
      ...towers.map(([x, z, r, h, roof]) => ({ x: x * S, z: z * S, r: (r + 1) * S, top: (h + roof) * S })),
    ],
  };
}

// ---- Spain: Sagrada Família ------------------------------------------------------------------

function spire(v, cx, cz, r0, h, top) {
  for (let y = 0; y < h; y++) {
    const r = r0 * Math.pow(1 - y / h, 0.55) + 0.8;
    cylinder(v, cx, cz, r, y, y, (x, yy, z) => ((Math.round(Math.atan2(z, x) * 3) + yy) % 9 === 0 ? '#6f5c42' : hash(x, yy, z) < 0.5 ? '#d2bb92' : '#c4ad84'), true);
  }
  ball(v, { x: cx, y: h + 1, z: cz }, 2.2, top);
}

export function sagradaFamilia() {
  const v = createVoxels(), S = 0.3;
  const STONE = (x, y, z) => ((x * 3 + y) % 9 === 0 ? '#8f7a5a' : hash(x, y, z) < 0.5 ? '#c2ab84' : '#b8a27c');
  box(v, -16, 0, -26, 15, 30, 9, STONE); // nave
  cylinder(v, 0, -26, 12, 0, 26, STONE); // apse
  for (let x = -14; x <= 13; x += 4) box(v, x, 8, 10, x + 1, 24, 10, '#4c6a8a'); // tall windows
  box(v, -18, 0, 10, 17, 18, 14, STONE); // Nativity facade
  for (let k = 0; k < 6; k++) box(v, -10 + k, 18 + k * 2, 11, 9 - k, 19 + k * 2, 13, STONE);
  box(v, -3, 0, 15, 2, 9, 15, '#3a2f22'); // door
  for (const [x, top] of [[-16, '#d63a2f'], [-6, '#f2c230'], [5, '#f2c230'], [15, '#d63a2f']]) spire(v, x, 12, 3, 80 + (Math.abs(x) < 8 ? 10 : 0), top);
  spire(v, 0, -10, 5, 112, '#ffffff'); // tower of Jesus
  box(v, -4, 115, -10, 3, 116, -10, '#e8e8e8'); // cross on top
  box(v, 0, 112, -14, 0, 119, -6, '#e8e8e8');
  for (const [x, z] of [[-11, -2], [10, -2], [-11, -19], [10, -19]]) spire(v, x, z, 3, 92, '#ffffff');
  spire(v, 0, -26, 4, 100, '#f2c230'); // tower of Mary with its star
  // It's still being built: a construction crane!
  for (let y = 0; y <= 118; y++) for (const [x, z] of [[26, -12], [27, -12], [26, -11], [27, -11]]) if (y % 4 === 0 || (x + z) % 2 === 0) set(v, x, y, z, '#f2c230');
  for (let x = 14; x <= 52; x++) { set(v, x, 119, -12, '#f2c230'); if (x % 3 === 0) set(v, x, 120, -12, '#f2c230'); }
  box(v, 22, 116, -13, 25, 119, -10, '#e0e0e0');
  box(v, 14, 117, -13, 18, 118, -11, '#7a7a7a');
  for (let y = 100; y <= 118; y++) set(v, 48, y, -12, '#555555');
  box(v, 47, 98, -13, 49, 99, -11, '#555555');

  return {
    object: shadow(buildMesh(v, S)),
    colliders: [
      { x0: -5.4, z0: -8, x1: 5.1, z1: 4.5, top: 9 }, { x: 0, z: -7.8, r: 3.8, top: 8 },
      { x: 8, z: -3.45, r: 0.5, top: 36 }, // crane
      { x0: -5.4, z0: -11, x1: 5.1, z1: 4.5, top: 36, air: true },
    ],
  };
}

// ---- The Netherlands: windmill with turning sails --------------------------------------------

let millGeo = null, sailGeo = null;
export function windmill() {
  if (!millGeo) {
    const v = createVoxels(), S = 0.25;
    for (let y = 0; y < 40; y++) {
      const r = 10 - y * 0.1;
      for (let x = -11; x <= 11; x++)
        for (let z = -11; z <= 11; z++) {
          if (Math.max(Math.abs(x), Math.abs(z), (Math.abs(x) + Math.abs(z)) / 1.414) > r) continue;
          let c = y < 11 ? (hash(x, y, z) < 0.5 ? '#8d5a3b' : '#7d4f33') : (y + x) % 7 === 0 ? '#5a4a30' : '#6b5a3a';
          if (z > 0 && Math.abs(x) <= 1 && y <= 6) c = '#3d2b1f'; // door
          if (y > 14 && y % 9 < 3 && Math.abs(x) <= 1 && z > 0) c = '#f4f1ea'; // windows
          set(v, x, y, z, c);
        }
    }
    for (let x = -13; x <= 13; x++) for (let z = -13; z <= 13; z++) if (Math.max(Math.abs(x), Math.abs(z), (Math.abs(x) + Math.abs(z)) / 1.414) <= 13) set(v, x, 11, z, '#7a5a3a');
    for (let k = 0; k < 7; k++) box(v, -6 + Math.floor(k / 2), 40 + k, -7 + k, 5 - Math.floor(k / 2), 40 + k, 7 - k, '#4a3a2a'); // cap
    box(v, -1, 42, 7, 0, 44, 9, '#3d2b1f'); // axle
    millGeo = buildMesh(v, S).geometry.translate(0, 0, 0);

    const s = createVoxels();
    for (let arm = 0; arm < 4; arm++) {
      const dir = [[1, 0], [0, 1], [-1, 0], [0, -1]][arm];
      for (let t = 0; t <= 36; t++) set(s, dir[0] * t, dir[1] * t, 0, '#6b4423');
      for (let t = 8; t <= 36; t++)
        for (let w = 1; w <= 6; w++) {
          if (t % 4 !== 0 && w !== 6 && t !== 8 && t !== 36) continue; // lattice frame
          const side = arm % 2 ? -w : w;
          set(s, dir[0] * t + (dir[1] ? side : 0), dir[1] * t + (dir[0] ? side : 0), 0, '#f4f1ea');
        }
    }
    sailGeo = buildMesh(s, 0.25, swap({ [M.PLASTER]: M.FABRIC, [M.STONE]: M.FABRIC })).geometry;
  }
  const g = new THREE.Group();
  g.add(shadow(new THREE.Mesh(millGeo, material)));
  const sails = shadow(new THREE.Mesh(sailGeo, material));
  sails.position.set(0, 10.9, 2.5);
  g.add(sails);
  const speed = 0.6 + Math.random() * 0.4;
  return {
    object: g,
    colliders: [{ x: 0, z: 0, r: 2.7, top: 11 }, { x0: -9, z0: 2, x1: 9, z1: 3, top: 20, air: true }],
    update: (dt) => (sails.rotation.z += dt * speed),
  };
}

// ---- Greece: Parthenon ---------------------------------------------------------------------------

export function parthenon() {
  const v = createVoxels(), S = 0.25;
  const MARBLE = (x, y, z) => (hash(x, y, z) < 0.5 ? '#ece4d4' : '#e2d8c3');
  box(v, -42, 0, -20, 41, 1, 19, '#d9cfba');
  box(v, -40, 2, -18, 39, 3, 17, '#e0d6c2');
  box(v, -38, 4, -16, 37, 5, 15, MARBLE);
  const cols = [];
  for (let i = 0; i < 8; i++) for (const z of [-13, 13]) cols.push([-35 + i * 10, z]);
  for (const z of [-7.8, -2.6, 2.6, 7.8]) for (const x of [-35, 35]) cols.push([x, Math.round(z)]);
  for (const [x, z] of cols) {
    const broken = hash(x, 0, z) < 0.15;
    const h = broken ? 14 + Math.floor(hash(x, 1, z) * 10) : 33;
    cylinder(v, x, z, 2.2, 6, h, (cx, y, cz) => (Math.round(Math.atan2(cz, cx) * 3) % 2 ? '#f0e9da' : '#ddd3bd'));
    if (!broken) box(v, x - 3, 34, z - 3, x + 2, 35, z + 2, MARBLE);
  }
  // Entablature (missing on one corner: it's a ruin!)
  for (let x = -38; x <= 37; x++)
    for (let z = -16; z <= 15; z++) {
      const edge = x < -32 || x > 31 || z < -10 || z > 9;
      if (!edge || (x > 18 && z < -8)) continue;
      for (let y = 36; y <= 41; y++) set(v, x, y, z, y === 38 && (x & 3) === 0 ? '#c9bea6' : MARBLE(x, y, z));
    }
  // Triangular pediment on the front, half of it on the back
  for (let k = 0; k < 8; k++)
    for (let x = -38 + k * 4.5; x <= 37 - k * 4.5; x++) {
      box(v, Math.round(x), 42 + k, 11, Math.round(x), 42 + k, 15, MARBLE);
      if (x < 0) box(v, Math.round(x), 42 + k, -16, Math.round(x), 42 + k, -12, MARBLE);
    }
  // Inner walls (cella), broken at different heights
  for (let x = -24; x <= 23; x++)
    for (const z of [-8, 7]) {
      const h = 10 + Math.floor(hash(x >> 2, 0, z) * 14);
      box(v, x, 6, z, x, h, z, '#ddd2bc');
    }
  const b = 6 * S; // height of the steps
  return {
    object: shadow(buildMesh(v, S, swap({ [M.PLASTER]: M.MARBLE, [M.STONE]: M.MARBLE }))),
    colliders: [
      { x0: -10.5, z0: -5, x1: 10.5, z1: 5, top: b / 3 }, { x0: -10, z0: -4.5, x1: 10, z1: 4.5, top: (b * 2) / 3 }, { x0: -9.5, z0: -4, x1: 9.5, z1: 4, top: b },
      ...cols.map(([x, z]) => ({ x: x * S, z: z * S, r: 0.6, top: 9 })),
      { x0: -6, z0: -2.1, x1: 6, z1: -1.9, top: 4 }, { x0: -6, z0: 1.7, x1: 6, z1: 1.9, top: 4 },
      { x0: -10.5, z0: -5, x1: 10.5, z1: 5, top: 13, air: true },
    ],
  };
}

// ---- United Kingdom: Big Ben, a red bus and a phone box -----------------------------------------

export function bigBen() {
  const v = createVoxels(), S = 0.25;
  const STONE = (x, y, z) => ((x + z) % 3 === 0 ? '#b39b63' : hash(x, y, z) < 0.5 ? '#c9b37e' : '#c2ab74');
  box(v, -8, 0, -8, 7, 79, 7, STONE);
  for (let y = 6; y < 78; y += 10) for (const x of [-4, 2]) for (const [dx, dz] of [[0, 8], [0, -9], [8, 0], [-9, 0]]) box(v, dx ? x * 0 + dx : x, y, dz ? dz : x, dx ? dx : x + 1, y + 4, dz ? dz : x + 1, '#5b6b7c');
  box(v, -9, 80, -9, 8, 99, 8, STONE);
  // Clock faces on the four sides
  for (let a = -8; a <= 8; a++)
    for (let b = -8; b <= 8; b++) {
      const d = Math.hypot(a, b);
      if (d > 7.5) continue;
      const k = Math.atan2(b, a) / (Math.PI / 6);
      const tick = d > 5.3 && d < 6.6 && Math.abs(k - Math.round(k)) < 0.18; // the 12 hour marks
      let c = d > 6.6 ? '#d4af37' : tick ? '#222222' : '#f3efe3';
      if ((a === 0 && b >= 0 && b <= 4) || (b === 0 && a >= 0 && a <= 6)) c = '#1a1a1a'; // hands: 3 o'clock
      set(v, a, 90 + b, 9, c);
      set(v, -a, 90 + b, -10, c);
      set(v, 9, 90 + b, -a, c);
      set(v, -10, 90 + b, a, c);
    }
  for (let y = 100; y <= 111; y++)
    for (let x = -8; x <= 7; x++)
      for (let z = -8; z <= 7; z++) {
        const edge = x === -8 || x === 7 || z === -8 || z === 7;
        const opening = y > 102 && y < 109 && ((Math.abs(x + 0.5) < 5 && (z === -8 || z === 7)) || (Math.abs(z + 0.5) < 5 && (x === -8 || x === 7)));
        if (edge && !opening) set(v, x, y, z, STONE(x, y, z));
      }
  for (let k = 0; k < 24; k++) box(v, -9 + Math.floor(k / 3), 112 + k, -9 + Math.floor(k / 3), 8 - Math.floor(k / 3), 112 + k, 8 - Math.floor(k / 3), k % 6 === 0 ? '#d4af37' : '#4f5d63');
  box(v, -1, 136, -1, 0, 142, 0, '#d4af37');
  for (const [x, z] of [[-9, -9], [8, -9], [-9, 8], [8, 8]]) box(v, x, 112, z, x, 118, z, '#d4af37');

  // Red double-decker bus
  const bus = createVoxels(), RED = '#c8102e';
  box(bus, -5, 2, -18, 4, 17, 17, RED);
  for (const [y0, y1] of [[5, 7], [12, 14]])
    for (let z = -16; z <= 15; z++) if ((z + 16) % 5 !== 0) for (const x of [-6, 5]) box(bus, x, y0, z, x, y1, z, '#2b3a4a');
  box(bus, -6, 9, -18, 5, 9, 17, '#f2e6c8');
  box(bus, -4, 5, 18, 3, 7, 18, '#2b3a4a');
  box(bus, -4, 12, 18, 3, 14, 18, '#2b3a4a');
  box(bus, -3, 15, 18, 2, 16, 18, '#1a1a1a');
  for (const z of [-12, 11]) for (const x of [-6, 5]) box(bus, x, 0, z - 2, x, 3, z + 2, '#1a1a1a');
  const busMesh = shadow(buildMesh(bus, S, swap({ [M.BRICK]: M.PAINT })));
  busMesh.position.set(8, 0, 4);
  busMesh.rotation.y = 0.15;

  // Red phone box
  const pb = createVoxels();
  box(pb, -2, 0, -2, 1, 10, 1, RED);
  for (const [x, z] of [[-3, 0], [2, 0]]) box(pb, x, 4, z - 1, x, 8, z, '#bfe3f2');
  box(pb, -1, 4, -3, 0, 8, -3, '#bfe3f2');
  box(pb, -1, 4, 2, 0, 8, 2, '#bfe3f2');
  box(pb, -2, 11, -2, 1, 11, 1, RED);
  box(pb, -1, 12, -1, 0, 12, 0, RED);
  const phone = shadow(buildMesh(pb, S, swap({ [M.BRICK]: M.PAINT })));
  phone.position.set(-5, 0, 5);

  const g = new THREE.Group();
  g.add(shadow(buildMesh(v, S)), busMesh, phone);
  return {
    object: g,
    colliders: [
      { x0: -2.3, z0: -2.3, x1: 2.3, z1: 2.3, top: 36 },
      ...[[8, 4], [7.63, 1.53], [8.37, 6.47], [8.66, 8.35], [7.34, -0.35]].map(([x, z]) => ({ x, z, r: 1.4, top: 4.5 })), // bus
      { x: -5, z: 5, r: 0.6, top: 3 },
    ],
  };
}
