// The archipelago: one low poly island per country, placed roughly like on a map of Europe.
// Each island has: terrain, trees, a plaza for its monument, a pier with a boat spot, a runway, a flag.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createVoxels, set, buildMesh } from './voxel.js';
import { FLAGS } from './flags.js';
import { platformAt } from './physics.js';

export const WATER_LEVEL = 0.75;
export const PIER_TOP = WATER_LEVEL + 0.9;
export const waveAt = (x, z, t) => Math.sin(x * 0.15 + t) * 0.18 + Math.cos(z * 0.2 + t * 0.8) * 0.18;

const CELL = 2; // size of a terrain facet: bigger = more "low poly"
const DIRS = { south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0] };

// x = east, z = south. Zones are flat areas (local coordinates): plaza = monument, runway = airport.
// access: 'plane' = airport only, 'boat' = harbour only, 'both'. port = side of the harbour (and where monuments face).
export const ISLANDS = [
  {
    id: 'france', egg: [22, -42], center: [0, 0], shape: 'hex', R: 56, height: 12, seed: 0, port: 'south', access: 'both',
    grass: ['#5fae45', '#86c95a'], trees: ['oak', 'poplar'], density: 0.13, extras: ['lavender', 'hedges'],
    plaza: { x: 0, z: -14, r: 17, h: 5 }, lawn: { x0: -10, x1: 10, z0: -14, z1: 42, h: 5 },
    runway: { x0: -42, x1: -34, z0: -22, z1: 22, h: 3 }, flag: [6, 40],
  },
  {
    id: 'belgium', egg: [-18, 22], center: [170, -260], shape: 'round', R: 44, height: 8, seed: 1, port: 'south', access: 'plane',
    grass: ['#62b04a', '#7fc25a'], trees: ['oak', 'poplar'], density: 0.1, extras: [],
    plaza: { x: -4, z: -6, r: 15, h: 4 }, runway: { x0: 20, x1: 28, z0: -18, z1: 18, h: 3 },
  },
  {
    id: 'netherlands', egg: [20, 18], center: [260, -500], shape: 'round', R: 46, height: 4, seed: 2, port: 'south', access: 'boat',
    grass: ['#6cbf50', '#8fd162'], trees: ['oak'], density: 0.04, extras: ['tulips'],
    plaza: { x: -8, z: 0, r: 12, h: 2.5 }, runway: { x0: 16, x1: 24, z0: -20, z1: 20, h: 2 },
    spots: [[-12, -32], [-38, 4], [6, 32], [-2, -18]], // more windmills
  },
  {
    id: 'uk', egg: [-10, -22], center: [-300, -440], shape: 'ellipse', a: 0.7, b: 1.15, rot: 0.2, R: 50, height: 13, seed: 3, port: 'south', access: 'boat',
    grass: ['#4f9e45', '#6bb55a'], trees: ['oak'], density: 0.09, extras: ['rocks'],
    plaza: { x: 0, z: 0, r: 13, h: 5 }, runway: { x0: -24, x1: -16, z0: -20, z1: 20, h: 3 },
  },
  {
    id: 'germany', egg: [-20, 20], center: [520, -280], shape: 'round', R: 52, height: 15, seed: 4, port: 'west', access: 'plane',
    grass: ['#4c9a40', '#66ad4e'], trees: ['pine', 'pine', 'oak'], density: 0.22, extras: [],
    plaza: { x: 0, z: 8, r: 14, h: 6 }, runway: { x0: 22, x1: 30, z0: -22, z1: 18, h: 4 },
    site2: { x: -18, z: -24, r: 11, h: 13 }, // castle on a hill
  },
  {
    id: 'spain', egg: [28, -4], center: [-300, 340], shape: 'square', R: 50, height: 10, seed: 5, port: 'north', access: 'boat',
    grass: ['#a9b65a', '#c7c26f'], trees: ['olive', 'palm'], density: 0.08, extras: ['rocks'],
    plaza: { x: -4, z: 0, r: 15, h: 4 }, runway: { x0: 22, x1: 30, z0: -20, z1: 20, h: 3 },
  },
  {
    id: 'italy', egg: [-16, 52], center: [440, 330], shape: 'ellipse', a: 0.6, b: 1.25, rot: -0.3, R: 54, height: 14, seed: 6, port: 'west', access: 'plane',
    grass: ['#7fae4a', '#9cc05c'], trees: ['cypress', 'umbrella', 'olive'], density: 0.1, extras: [],
    plaza: { x: 0, z: -12, r: 19, h: 5 }, runway: { x0: -4, x1: 4, z0: 16, z1: 50, h: 3 },
    site2: { x: 14, z: -42, r: 8, h: 5 }, // Pisa
  },
  {
    id: 'greece', egg: [28, 8], center: [880, 560], shape: 'round', R: 42, height: 12, seed: 7, port: 'west', access: 'boat',
    grass: ['#a3b45e', '#bfc274'], trees: ['olive', 'cypress'], density: 0.07, extras: ['rocks'],
    plaza: { x: 0, z: -4, r: 14, h: 7 }, runway: { x0: 21, x1: 29, z0: -18, z1: 18, h: 3 },
  },
];

const rand = (x, z, seed = 0) => {
  const h = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
  return h - Math.floor(h);
};
const noise = (x, z) => Math.sin(x * 0.11) * Math.cos(z * 0.09) + 0.5 * Math.sin(x * 0.23 + z * 0.19);
const C = (hex) => new THREE.Color(hex);
const SAND = C('#e9d79b'), GRAVEL = C('#d8c9a3'), LAWN = C('#7ccf52'), DIRT = C('#9a7550');
const ASPHALT = C('#5b5f63'), PAINT = C('#f2f2f2');

const rectDist = (r, x, z) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));
const inRect = (r, x, z) => r && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

// ---- Low poly props ------------------------------------------------------------

function part(geo, color) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  if (geo.attributes.uv) geo.deleteAttribute('uv');
  geo.computeVertexNormals();
  const c = C(color), n = geo.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const ico = (r, y, color, sx = 1, sy = 1, sz = 1) => part(new THREE.IcosahedronGeometry(r, 0).scale(sx, sy, sz).translate(0, y, 0), color);
const cyl = (r0, r1, h, color, sides = 5) => part(new THREE.CylinderGeometry(r0, r1, h, sides).translate(0, h / 2, 0), color);
const cone = (r, h, y, color, sides = 6) => part(new THREE.ConeGeometry(r, h, sides).translate(0, y + h / 2, 0), color);

const TREES = {
  oak: (r) => [cyl(0.25, 0.35, 2.2, '#6b4423'), ico(1.7, 3.2, r < 0.5 ? '#3f8f3a' : '#4fa040')],
  poplar: () => [cyl(0.2, 0.25, 1.2, '#6b4423'), cone(1.0, 5, 1.1, '#2f6b2e')],
  pine: (r) => [cyl(0.2, 0.3, 1.5, '#5a3a20'), cone(1.8, 3, 1.2, '#2a5a32'), cone(1.4, 2.6, 2.8, r < 0.5 ? '#2f6638' : '#28552e'), cone(0.9, 2, 4.3, '#2f6638')],
  cypress: () => [cyl(0.15, 0.2, 0.8, '#5a3a20'), cone(0.7, 6, 0.6, '#2c5e2a', 7)],
  umbrella: () => [part(new THREE.CylinderGeometry(0.15, 0.25, 4, 5).translate(0, 2, 0).rotateZ(0.12), '#6b4423'), ico(2.2, 4.3, '#4a7d3a', 1, 0.45, 1)],
  olive: (r) => [
    part(new THREE.CylinderGeometry(0.2, 0.35, 1.6, 5).translate(0, 0.8, 0).rotateZ(r - 0.5), '#7a6a55'),
    part(new THREE.IcosahedronGeometry(1.0, 0).translate(0.5, 1.9, 0), '#8a9a5b'),
    part(new THREE.IcosahedronGeometry(0.9, 0).translate(-0.6, 2.1, 0.3), '#7d8e50'),
  ],
  palm: () => {
    const g = [];
    for (let i = 0; i < 5; i++) g.push(part(new THREE.CylinderGeometry(0.2, 0.26, 1, 6).translate(i * 0.12, i + 0.5, 0), i % 2 ? '#8a6a45' : '#9c7a52'));
    for (let i = 0; i < 6; i++)
      g.push(part(new THREE.ConeGeometry(0.35, 2.6, 4).rotateZ(-Math.PI / 2 + 0.35).translate(1.3, 5, 0).rotateY((i / 6) * Math.PI * 2), '#4caf50'));
    return g;
  },
};

function voxelFlag(id) {
  const vox = createVoxels(), W = 20, H = 13;
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) set(vox, x, y, 0, FLAGS[id]((x + 0.5) / W, 1 - (y + 0.5) / H));
  const flag = buildMesh(vox, 0.14);
  flag.position.set(0.15, 5.2, 0);
  const pole = new THREE.Mesh(cyl(0.08, 0.1, 7.2, '#d9d9d9', 6), new THREE.MeshLambertMaterial({ vertexColors: true }));
  const g = new THREE.Group();
  g.add(flag, pole);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

// ---- One island ------------------------------------------------------------------

function makeIsland(cfg) {
  const [ox, oz] = cfg.center;
  const SIZE = Math.ceil((cfg.R * 1.3) / CELL) * CELL;
  const N = (2 * SIZE) / CELL;
  const nx = cfg.seed * 97.3, nz = cfg.seed * 41.9;
  const zones = [
    { dist: (x, z) => Math.max(0, Math.hypot(x - cfg.plaza.x, z - cfg.plaza.z) - cfg.plaza.r), h: cfg.plaza.h },
  ];
  const hasRunway = cfg.access !== 'boat', hasPier = cfg.access !== 'plane';
  if (hasRunway) zones.push({ dist: (x, z) => rectDist(cfg.runway, x, z), h: cfg.runway.h });
  if (cfg.lawn) zones.push({ dist: (x, z) => rectDist(cfg.lawn, x, z), h: cfg.lawn.h });
  const s2 = cfg.site2;
  if (s2) zones.push({ dist: (x, z) => Math.max(0, Math.hypot(x - s2.x, z - s2.z) - s2.r), h: s2.h });
  // Easter egg: a small flat lawn at the natural height of that place.
  const [ex, ez] = cfg.egg;
  const eggH = Math.max(2, heightAt(ex, ez));
  zones.push({ dist: (x, z) => Math.max(0, Math.hypot(x - ex, z - ez) - 6), h: eggH });

  function shapeDist(x, z) {
    if (cfg.shape === 'hex') return Math.max(Math.abs(z), Math.abs(x) * 0.866 + Math.abs(z) * 0.5) / cfg.R;
    if (cfg.shape === 'square') return Math.max(Math.abs(x), Math.abs(z)) / cfg.R;
    if (cfg.shape === 'ellipse') {
      const c = Math.cos(cfg.rot), s = Math.sin(cfg.rot);
      return Math.hypot((x * c - z * s) / (cfg.R * cfg.a), (x * s + z * c) / (cfg.R * cfg.b));
    }
    return Math.hypot(x, z) / cfg.R;
  }

  function heightAt(x, z) {
    const n = noise(x + nx, z + nz);
    // Above the coast the hills follow the island height; below it the sea floor drops quickly.
    const base = 1 - shapeDist(x, z) - n * 0.07;
    const natural = Math.max(-3, base * (base > 0 ? cfg.height : 25) + n * 1.5 * Math.min(1, cfg.height / 8));
    let best = Infinity, h = 0;
    for (const zone of zones) {
      const d = zone.dist(x, z);
      if (d < best) (best = d), (h = zone.h);
    }
    const k = THREE.MathUtils.smoothstep(best, 0, 12);
    return h * (1 - k) + natural * k;
  }

  const zoneAt = (x, z) => {
    if (Math.hypot(x - cfg.plaza.x, z - cfg.plaza.z) < cfg.plaza.r) return 'plaza';
    if (s2 && Math.hypot(x - s2.x, z - s2.z) < s2.r) return 'plaza';
    if (hasRunway && inRect(cfg.runway, x, z)) return 'runway';
    if (inRect(cfg.lawn, x, z)) return Math.abs(x) <= 2 ? 'plaza' : 'lawn';
    return null;
  };

  const grid = new Float32Array((N + 1) * (N + 1));
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) grid[i * (N + 1) + j] = heightAt(-SIZE + i * CELL, -SIZE + j * CELL);

  function surface(x, z) {
    const gx = (x + SIZE) / CELL, gz = (z + SIZE) / CELL;
    const i = Math.floor(gx), j = Math.floor(gz);
    if (i < 0 || j < 0 || i >= N || j >= N) return -3;
    const fx = gx - i, fz = gz - j, g = (a, b) => grid[a * (N + 1) + b];
    const a = g(i, j), b = g(i + 1, j), c = g(i, j + 1), d = g(i + 1, j + 1);
    return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
  }

  // Terrain: one flat colour per triangle.
  const GA = C(cfg.grass[0]), GB = C(cfg.grass[1]), HILL = GA.clone().multiplyScalar(0.85);
  const rw = cfg.runway, rwMid = (rw.x0 + rw.x1) / 2;
  function faceColor(x, z, y, ny) {
    const zone = zoneAt(x, z);
    let c;
    if (zone === 'runway') {
      const edge = x < rw.x0 + 0.8 || x > rw.x1 - 0.8;
      c = edge || (Math.abs(x - rwMid) < 1 && Math.floor(z / 4) % 2 === 0) ? PAINT : ASPHALT;
    } else if (y < 1.4) c = SAND;
    else if (zone === 'plaza') c = GRAVEL;
    else if (zone === 'lawn') c = LAWN;
    else if (ny < 0.8) c = DIRT;
    else if (y > cfg.height * 0.7) c = HILL;
    else c = GA.clone().lerp(GB, (noise(x * 0.7 + nx, z * 0.7) + 1.5) / 3);
    return c.clone().multiplyScalar(0.96 + rand(x, z, 9) * 0.08);
  }
  const pos = [], col = [];
  const v = (i, j) => [-SIZE + i * CELL, grid[i * (N + 1) + j], -SIZE + j * CELL];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), Cv = new THREE.Vector3();
  const tri = (a, b, c) => {
    pos.push(...a, ...b, ...c);
    A.set(...a), B.set(...b), Cv.set(...c);
    const ny = B.sub(A).cross(Cv.sub(A)).normalize().y;
    const color = faceColor((a[0] + b[0] + c[0]) / 3, (a[2] + b[2] + c[2]) / 3, (a[1] + b[1] + c[1]) / 3, ny);
    for (let k = 0; k < 3; k++) col.push(color.r, color.g, color.b);
  };
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const a = v(i, j), b = v(i + 1, j), c = v(i, j + 1), d = v(i + 1, j + 1);
      if (Math.max(a[1], b[1], c[1], d[1]) < -2.9) continue;
      tri(a, c, b);
      tri(c, d, b);
    }
  const terrainGeo = new THREE.BufferGeometry();
  terrainGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  terrainGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  terrain.receiveShadow = true;

  const colliders = [];
  const decor = [];
  const W = (x, z) => [x + ox, z + oz]; // local -> world

  // Pier: march from the plaza towards the coast, then build out into the sea.
  const [dx, dz] = DIRS[cfg.port];
  let pier = null, boatSpot = null, pierInfo = null;
  if (hasPier) {
    let t = 0;
    while (surface(cfg.plaza.x + dx * t, cfg.plaza.z + dz * t) > WATER_LEVEL - 0.2 && t < SIZE) t += 0.5;
    const coast = [cfg.plaza.x + dx * t, cfg.plaza.z + dz * t];
    const pierA = [coast[0] - dx * 4, coast[1] - dz * 4], pierB = [coast[0] + dx * 14, coast[1] + dz * 14];
    const half = 1.6;
    pier = {
      x0: Math.min(pierA[0], pierB[0]) - (dx ? 0 : half), x1: Math.max(pierA[0], pierB[0]) + (dx ? 0 : half),
      z0: Math.min(pierA[1], pierB[1]) - (dz ? 0 : half), z1: Math.max(pierA[1], pierB[1]) + (dz ? 0 : half),
    };
    for (let s = -4; s <= 14; s += 0.8) {
      const px = coast[0] + dx * s, pz = coast[1] + dz * s;
      decor.push(part(new THREE.BoxGeometry(dx ? 0.7 : half * 2, 0.25, dz ? 0.7 : half * 2).translate(px, PIER_TOP - 0.12, pz), Math.round(s / 0.8) % 2 ? '#a0714a' : '#8d6240'));
    }
    for (let s = 0; s <= 14; s += 3.5)
      for (const side of [-1, 1]) {
        const px = coast[0] + dx * s + (dz ? side * half : 0), pz = coast[1] + dz * s + (dx ? side * half : 0);
        decor.push(part(new THREE.CylinderGeometry(0.18, 0.18, 4.4, 5).translate(px, PIER_TOP - 1.6, pz), '#6b4a30'));
      }
    const [px0, pz0] = W(pier.x0, pier.z0), [px1, pz1] = W(pier.x1, pier.z1);
    colliders.push({ x0: px0, z0: pz0, x1: px1, z1: pz1, top: PIER_TOP, platform: true });
    const perp = [dz, dx];
    boatSpot = { x: ox + coast[0] + dx * 11 + perp[0] * 4.2, z: oz + coast[1] + dz * 11 + perp[1] * 4.2, heading: Math.atan2(dx, dz) };
    pierInfo = { x: ox + coast[0], z: oz + coast[1], dx, dz }; // where the pier leaves the coast, and its direction
  }

  const planeSpot = hasRunway ? { x: ox + rwMid, z: oz + rw.z0 + 7, heading: 0, y: rw.h } : null;

  // Trees, keeping clear of plaza, runway, lawn, pier and fields.
  const fields = [];
  if (cfg.extras.includes('lavender')) fields.push({ x0: 18, x1: 38, z0: 6, z1: 30 });
  if (cfg.extras.includes('tulips')) fields.push({ x0: -36, x1: -16, z0: -30, z1: -12 }, { x0: -30, x1: -10, z0: 14, z1: 30 });
  const spots = cfg.spots ?? [];
  const blocked = (x, z) =>
    zones.some((zn) => zn.dist(x, z) < 4) || fields.some((f) => rectDist(f, x, z) < 1.5) || (pier && rectDist(pier, x, z) < 4) ||
    spots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 6);
  for (let x = -SIZE; x <= SIZE; x += 3)
    for (let z = -SIZE; z <= SIZE; z += 3) {
      const jx = x + rand(x, z, 1 + cfg.seed) * 2, jz = z + rand(x, z, 2 + cfg.seed) * 2;
      const y = surface(jx, jz);
      if (y < 1.8 || blocked(jx, jz) || rand(x, z, cfg.seed) > cfg.density) continue;
      const r = rand(x, z, 3), s = 0.8 + rand(x, z, 4) * 0.6;
      const kind = cfg.trees[Math.floor(rand(x, z, 5) * cfg.trees.length)];
      decor.push(mergeGeometries(TREES[kind](r)).scale(s, s, s).rotateY(r * 6).translate(jx, y - 0.2, jz));
      const [wx, wz] = W(jx, jz);
      colliders.push({ x: wx, z: wz, r: 0.35 * s, top: y + 4 });
    }
  if (cfg.extras.includes('rocks'))
    for (let i = 0; i < 30; i++) {
      const a = rand(i, 1, cfg.seed) * Math.PI * 2, d = cfg.R * (0.5 + rand(i, 2, cfg.seed) * 0.45);
      const x = Math.sin(a) * d, z = Math.cos(a) * d, y = surface(x, z), s = 0.6 + rand(i, 3) * 1.2;
      if (y < 0 || blocked(x, z)) continue;
      decor.push(part(new THREE.DodecahedronGeometry(s, 0).translate(x, y + s * 0.3, z), rand(i, 4) < 0.5 ? '#9a9a96' : '#b5b3ab'));
      const [wx, wz] = W(x, z);
      colliders.push({ x: wx, z: wz, r: s * 0.8, top: y + s * 1.2 });
    }
  for (const f of fields)
    for (let z = f.z0 + 1; z <= f.z1; z += cfg.id === 'france' ? 3 : 2)
      for (let x = f.x0; x <= f.x1; x += cfg.id === 'france' ? 1.4 : 0.9) {
        const y = surface(x, z);
        if (y < 1.2) continue;
        if (cfg.id === 'france') decor.push(ico(0.7, 0, rand(x, z) < 0.5 ? '#9a6fd0' : '#8a5cc4', 1, 0.8, 1).translate(x, y + 0.3, z));
        else decor.push(part(new THREE.BoxGeometry(0.45, 0.5, 0.45).translate(x, y + 0.45, z), ['#e53935', '#fdd835', '#ec407a', '#fb8c00'][Math.floor(z / 2) % 4 & 3]));
      }
  if (cfg.extras.includes('hedges'))
    for (let z = 6; z <= 40; z += 2.5)
      for (const x of [cfg.lawn.x0 + 1, cfg.lawn.x1 - 1]) {
        decor.push(part(new THREE.BoxGeometry(1.4, 1.2, 1.4).translate(x, cfg.lawn.h + 0.6, z), '#2f7a32'));
        const [wx, wz] = W(x, z);
        colliders.push({ x0: wx - 0.7, z0: wz - 0.7, x1: wx + 0.7, z1: wz + 0.7, top: cfg.lawn.h + 1.2 });
      }

  const group = new THREE.Group();
  group.position.set(ox, 0, oz);
  const decorMesh = new THREE.Mesh(mergeGeometries(decor), new THREE.MeshLambertMaterial({ vertexColors: true }));
  decorMesh.castShadow = decorMesh.receiveShadow = true;
  group.add(terrain, decorMesh);

  // Flag of the country
  const flag = voxelFlag(cfg.id);
  const [fx, fz] = cfg.flag ?? [cfg.plaza.x + cfg.plaza.r + 2, cfg.plaza.z];
  flag.position.set(fx, surface(fx, fz), fz);
  group.add(flag);
  colliders.push({ x: fx + ox, z: fz + oz, r: 0.2, top: surface(fx, fz) + 7.2 });

  const site = (s) => s && { x: s.x + ox, z: s.z + oz, y: s.h, r: s.r };
  return {
    cfg, group, colliders, boatSpot, planeSpot,
    pier: pierInfo,
    center: new THREE.Vector3(ox, 0, oz),
    radius: SIZE * 1.1,
    plaza: site(cfg.plaza),
    sites: [site(cfg.plaza), site(s2)].filter(Boolean),
    spots: spots.map(([x, z]) => ({ x: x + ox, z: z + oz, y: surface(x, z) })),
    egg: { x: ex + ox, z: ez + oz, y: eggH },
    surface: (x, z) => surface(x - ox, z - oz),
    zone: (x, z) => zoneAt(x - ox, z - oz),
    contains: (x, z) => Math.abs(x - ox) < SIZE && Math.abs(z - oz) < SIZE,
    isLand: (x, z) => shapeDist(x - ox, z - oz) < 1.05,
  };
}

// Low poly sea that follows the camera, with waves computed in world space.
function createSea() {
  const STEP = 10;
  const geo = new THREE.PlaneGeometry(900, 900, 90, 90).rotateX(-Math.PI / 2);
  const base = geo.attributes.position.array.slice();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: '#2f9bd6', transparent: true, opacity: 0.85, flatShading: true }));
  mesh.position.y = WATER_LEVEL;
  mesh.update = (t, center, animate) => {
    mesh.position.x = Math.round(center.x / STEP) * STEP;
    mesh.position.z = Math.round(center.z / STEP) * STEP;
    const p = geo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) p[i + 1] = animate ? waveAt(base[i] + mesh.position.x, base[i + 2] + mesh.position.z, t) : 0;
    geo.attributes.position.needsUpdate = true;
  };
  return mesh;
}

export function createWorld() {
  const islands = ISLANDS.map(makeIsland);
  const group = new THREE.Group();
  for (const isl of islands) group.add(isl.group);
  const seabed = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#1d6f9a' }));
  seabed.position.y = -3;
  const sea = createSea();
  group.add(seabed, sea);

  const islandNear = (x, z) => islands.find((i) => i.contains(x, z)) ?? null;
  const NONE = [];

  // Boat routes: out of the harbour, around any island in the way, into the other harbour.
  const SHAPE_SIZE = { hex: 1.16, square: 1.42, round: 1 }; // how far the coast can be, in island radii
  const obstacles = islands.map((i) => ({ c: i.center, r: i.cfg.R * (SHAPE_SIZE[i.cfg.shape] ?? Math.max(i.cfg.a, i.cfg.b)) * 1.05 + 12 }));
  const V = (x, z) => new THREE.Vector3(x, 0, z);
  const outOf = (isl) => V(isl.boatSpot.x + Math.sin(isl.boatSpot.heading) * 45, isl.boatSpot.z + Math.cos(isl.boatSpot.heading) * 45);
  function around(p, q, depth = 0) {
    if (depth > 6) return [q];
    const seg = q.clone().sub(p), len2 = seg.lengthSq();
    let hit = null;
    for (const o of obstacles) {
      const t = THREE.MathUtils.clamp(o.c.clone().sub(p).dot(seg) / len2, 0, 1);
      const closest = p.clone().addScaledVector(seg, t);
      if (closest.distanceTo(o.c) < o.r && (!hit || t < hit.t)) hit = { o, t, closest };
    }
    if (!hit) return [q];
    let n = hit.closest.clone().sub(hit.o.c);
    if (n.lengthSq() < 1) n = V(-seg.z, seg.x);
    const w = hit.o.c.clone().addScaledVector(n.normalize(), hit.o.r + 15);
    return [...around(p, w, depth + 1), ...around(w, q, depth + 1)];
  }

  const france = islands[0];
  return {
    boatRoute: (from, to) => [outOf(from), ...around(outOf(from), outOf(to)), V(to.boatSpot.x, to.boatSpot.z)],
    group,
    islands,
    byId: Object.fromEntries(islands.map((i) => [i.cfg.id, i])),
    surfaceAt: (x, z) => islandNear(x, z)?.surface(x, z) ?? -3,
    collidersNear: (x, z) => islandNear(x, z)?.colliders ?? NONE,
    platformAt: (x, z) => platformAt(x, z, islandNear(x, z)?.colliders ?? NONE),
    // The island you are on or flying over (null = open sea).
    islandAt: (x, z) => islands.find((i) => i.isLand(x, z)) ?? null,
    groundType(x, z, y) {
      const isl = islandNear(x, z);
      if (!isl) return 'sand';
      if (y > isl.surface(x, z) + 0.3) return 'wood';
      const zone = isl.zone(x, z);
      if (zone === 'runway') return 'asphalt';
      if (zone === 'plaza') return 'gravel';
      return isl.surface(x, z) < 1.4 ? 'sand' : 'grass';
    },
    update(t, focus, viewDistance, animateSea) {
      sea.update(t, focus, animateSea);
      for (const isl of islands) isl.group.visible = Math.hypot(isl.center.x - focus.x, isl.center.z - focus.z) < viewDistance + isl.radius;
    },
    spawn: new THREE.Vector3(0, france.surface(0, 36), 36),
  };
}
