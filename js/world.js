// The archipelago: one low poly island per country, placed roughly like on a map of Europe.
// Each island has: terrain, trees, a plaza for its monument, a pier with a boat spot, a runway, a flag.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createVoxels, set, buildMesh } from './voxel.js';
import { FLAGS } from './flags.js';
import { platformAt } from './physics.js';
import { M, classify, textured, withMaterial } from './textures.js';

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
const ASPHALT = C('#5b5f63');

const rectDist = (r, x, z) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));
const inRect = (r, x, z) => r && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

// ---- Low poly props ------------------------------------------------------------

// One coloured piece. Painted look: every piece is darker at the bottom and lighter on top;
// smooth = soft rounded shading (tree crowns, bushes) instead of flat facets.
// mat: detail texture (M.WOOD, M.BRICK...), guessed from the colour if not given.
export function part(geo, color, smooth = false, mat = classify(color)) {
  if (geo.attributes.uv) geo.deleteAttribute('uv');
  if (smooth) {
    geo.deleteAttribute('normal');
    geo = mergeVertices(geo);
    geo.computeVertexNormals();
    geo = geo.toNonIndexed();
  } else {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.computeVertexNormals();
  }
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox, h = Math.max(1e-3, max.y - min.y);
  const c = C(color), pos = geo.attributes.position, n = pos.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = (pos.getY(i) - min.y) / h, k = smooth ? 0.66 + 0.42 * t : 0.82 + 0.22 * t;
    col.set([c.r * k, c.g * k, c.b * k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return withMaterial(geo, mat);
}
const ico = (r, y, color, sx = 1, sy = 1, sz = 1, mat) => part(new THREE.IcosahedronGeometry(r, 1).scale(sx, sy, sz).translate(0, y, 0), color, true, mat);
const trunk = (r0, r1, h, color) => part(new THREE.CylinderGeometry(r0, r1, h, 6).translate(0, h / 2, 0), color, false, M.BARK);
const cyl = (r0, r1, h, color, sides = 5) => part(new THREE.CylinderGeometry(r0, r1, h, sides).translate(0, h / 2, 0), color);
const cone = (r, h, y, color, sides = 6) => part(new THREE.ConeGeometry(r, h, sides).translate(0, y + h / 2, 0), color);

const TREES = {
  oak: (r) => [
    trunk(0.25, 0.38, 2.4, '#6b4423'),
    part(new THREE.CylinderGeometry(0.08, 0.14, 1.4, 5).translate(0, 0.7, 0).rotateZ(0.7).translate(0.1, 1.9, 0), '#6b4423', false, M.BARK),
    part(new THREE.CylinderGeometry(0.08, 0.14, 1.3, 5).translate(0, 0.65, 0).rotateX(-0.7).translate(0, 2, 0.1), '#6b4423', false, M.BARK),
    ico(1.5, 3.4, r < 0.5 ? '#3f8f3a' : '#4fa040'), ico(1.1, 3.1, '#468f3c').translate(1, 0, 0.3), ico(1.0, 3.0, '#3b8536').translate(-0.6, 0.1, 0.8), ico(0.9, 4.3, '#58a848').translate(0.2, 0, -0.4),
  ],
  poplar: () => [trunk(0.2, 0.25, 1.2, '#6b4423'), cone(1.0, 5, 1.1, '#2f6b2e')],
  pine: (r) => [trunk(0.2, 0.3, 1.5, '#5a3a20'), cone(1.8, 3, 1.2, '#2a5a32'), cone(1.4, 2.6, 2.8, r < 0.5 ? '#2f6638' : '#28552e'), cone(0.9, 2, 4.3, '#2f6638')],
  cypress: () => [trunk(0.15, 0.2, 0.8, '#5a3a20'), cone(0.7, 6, 0.6, '#2c5e2a', 7)],
  umbrella: () => [part(new THREE.CylinderGeometry(0.15, 0.25, 4, 5).translate(0, 2, 0).rotateZ(0.12), '#6b4423', false, M.BARK), ico(2.2, 4.3, '#4a7d3a', 1, 0.45, 1)],
  olive: (r) => [
    part(new THREE.CylinderGeometry(0.2, 0.35, 1.6, 5).translate(0, 0.8, 0).rotateZ(r - 0.5), '#7a6a55', false, M.BARK),
    part(new THREE.IcosahedronGeometry(1.0, 1).translate(0.5, 1.9, 0), '#8a9a5b', true),
    part(new THREE.IcosahedronGeometry(0.9, 1).translate(-0.6, 2.1, 0.3), '#7d8e50', true),
  ],
  palm: () => {
    const g = [];
    for (let i = 0; i < 5; i++) g.push(part(new THREE.CylinderGeometry(0.2, 0.26, 1, 6).translate(i * 0.12, i + 0.5, 0), i % 2 ? '#8a6a45' : '#9c7a52'));
    for (let i = 0; i < 6; i++)
      g.push(part(new THREE.ConeGeometry(0.35, 2.6, 4).rotateZ(-Math.PI / 2 + 0.35).translate(1.3, 5, 0).rotateY((i / 6) * Math.PI * 2), '#4caf50'));
    return g;
  },
};

// Village houses in the style of each country. front = +z.
// wall: detail texture of the walls. Optional: shutters (colour), flowers (window boxes), balcony,
// gable: 'stepped' (Dutch), beams (German half-timbering), flat (Greek roof with a dome).
const HOUSES = {
  france: { walls: ['#e8dcc4', '#efe6d2'], wall: M.STONE, roof: ['#5d6d7e'], door: '#2f4f6f', frame: '#f4f1ea', shutters: '#7d97ad', flowers: true, chimney: true },
  belgium: { walls: ['#a9573a', '#b4643f'], wall: M.BRICK, roof: ['#4a4a4a'], door: '#3e2723', frame: '#ffffff', chimney: true },
  netherlands: { walls: ['#9c3d2a', '#7a2e22', '#b04a32'], wall: M.BRICK, roof: ['#3b3b3b'], door: '#2e7d32', frame: '#ffffff', gable: 'stepped', tall: true },
  uk: { walls: ['#a24a35', '#f2efe6'], wall: M.BRICK, roof: ['#4a4a4a', '#c9a25a'], door: '#c62828', frame: '#ffffff', chimney: true, flowers: true },
  germany: { walls: ['#efe9dc'], wall: M.PLASTER, roof: ['#8b3a2a'], door: '#4a2e1d', frame: '#ffffff', beams: '#4a2e1d', flowers: true, chimney: true },
  spain: { walls: ['#f4efe3', '#efe0c4'], wall: M.PLASTER, roof: ['#c8643c'], door: '#6d4c41', frame: '#f4efe3', shutters: '#7a4a2a', balcony: true },
  italy: { walls: ['#e3b26a', '#d9895b', '#eccb8f'], wall: M.PLASTER, roof: ['#b85a35'], door: '#5d4037', frame: '#f2e6cf', shutters: '#3f6b3a', balcony: true },
  greece: { walls: ['#ffffff'], wall: M.PLASTER, door: '#1f5fbf', frame: '#ffffff', shutters: '#1f5fbf', flat: true, dome: '#1f5fbf' },
};
// Windows and lamps: their own material, so they can light up at night (sky.js).
export const GLOW = textured();
const WINDOW = '#9fd3f0';
const boxAt = (w, h, d, x, y, z, color, mat) => part(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z), color, false, mat);

// A window on a wall that faces +z, centred at (0, y): frame, glass, cross bars, sill, shutters, flowers.
function windowAt(style, y, rnd, { tall = false } = {}) {
  const ww = 0.8, wh = tall ? 1.7 : 0.95, g = [], glow = [];
  g.push(boxAt(ww + 0.18, wh + 0.18, 0.06, 0, y - wh / 2 - 0.09, 0.02, style.frame, M.PAINT));
  glow.push(boxAt(ww, wh, 0.05, 0, y - wh / 2, 0.06, WINDOW, M.PAINT));
  g.push(boxAt(0.05, wh, 0.04, 0, y - wh / 2, 0.1, style.frame, M.PAINT), boxAt(ww, 0.05, 0.04, 0, y + wh * 0.1, 0.1, style.frame, M.PAINT));
  g.push(boxAt(ww + 0.3, 0.08, 0.22, 0, y - wh / 2 - 0.16, 0.1, '#d8d2c4', M.STONE)); // sill
  if (style.shutters) for (const s of [-1, 1]) g.push(boxAt(ww / 2 + 0.04, wh + 0.1, 0.05, s * (ww * 0.75 + 0.12), y - wh / 2 - 0.05, 0.04, style.shutters, M.WOOD));
  if (style.flowers && !tall && rnd() < 0.6) {
    g.push(boxAt(ww + 0.1, 0.2, 0.22, 0, y - wh / 2 - 0.12, 0.2, '#7a4a2a', M.WOOD));
    for (let i = 0; i < 4; i++) g.push(boxAt(0.18, 0.16, 0.16, -0.3 + i * 0.2, y - wh / 2 + 0.06, 0.2, ['#e53935', '#ec407a', '#e53935', '#fdd835'][i], M.FOLIAGE));
  }
  return { g, glow };
}

function house(style, r) {
  const rnd = (() => { let s = Math.floor(r * 1e6) + 7; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })();
  const w = style.tall ? 4 : 4.8 + r * 1.2, d = 4.6, h = style.tall ? 5.6 : 4.2, F = 1.2; // F = foundation under the ground
  const wallColor = style.walls[Math.floor(r * style.walls.length)];
  const wall = style.wall === M.BRICK && wallColor === '#f2efe6' ? M.PLASTER : style.wall; // white British cottages are plastered
  const g = [boxAt(w, h + F, d, 0, -F, 0, wallColor, wall)], glow = [];
  g.push(boxAt(w + 0.1, 0.35, d + 0.1, 0, -0.2, 0, '#8f8a80', M.STONE)); // base course
  const put = (piece, rotY, x, z) => { // move a front-facing piece onto a wall
    for (const p of piece.g) g.push(p.rotateY(rotY).translate(x, 0, z));
    for (const p of piece.glow) glow.push(p.rotateY(rotY).translate(x, 0, z));
  };
  // Front: door in the middle, windows on both floors (a balcony door upstairs in the south).
  const door = { g: [
    boxAt(1.25, 2.15, 0.06, 0, 0, 0.02, style.frame, M.PAINT), boxAt(1.05, 2, 0.08, 0, 0, 0.05, style.door, M.WOOD),
    boxAt(0.1, 0.1, 0.06, 0.35, 1, 0.12, '#d9b25a', M.METAL), boxAt(1.6, 0.18, 0.5, 0, -0.05, 0.25, '#bdb6a8', M.STONE),
  ], glow: [] };
  const narrow = w < 4.6, side = w / 2 - 1.1; // narrow Dutch houses: door on one side
  put(door, 0, narrow ? -w / 4 : 0, d / 2);
  for (const x of narrow ? [w / 4] : [-side, side]) put(windowAt(style, 1.9, rnd), 0, x, d / 2);
  const up = h - 0.9, balcony = style.balcony && r > 0.35;
  for (const x of narrow ? [-w / 4, w / 4] : balcony ? [-side, side] : [-side, 0, side]) put(windowAt(style, up, rnd), 0, x, d / 2);
  if (balcony) {
    put(windowAt(style, up + 0.35, rnd, { tall: true }), 0, 0, d / 2);
    const iron = '#2b2b2b', by = up - 1.2;
    g.push(boxAt(1.9, 0.12, 0.8, 0, by, d / 2 + 0.4, '#d8d2c4', M.STONE), boxAt(1.9, 0.05, 0.05, 0, by + 0.9, d / 2 + 0.78, iron, M.METAL));
    for (let x = -0.9; x <= 0.91; x += 0.15) g.push(boxAt(0.03, 0.85, 0.03, x, by + 0.08, d / 2 + 0.78, iron, M.METAL));
    for (const x of [-0.8, 0.8]) g.push(boxAt(0.25, 0.25, 0.25, x, by + 0.12, d / 2 + 0.5, '#b5653a', M.BRICK), boxAt(0.35, 0.3, 0.35, x, by + 0.37, d / 2 + 0.5, '#3f8f3a', M.FOLIAGE));
  }
  // Sides: one window per floor.
  for (const s of [-1, 1]) for (const y of [1.9, up]) put(windowAt(style, y, rnd), (s * Math.PI) / 2, (s * w) / 2, 0);

  if (style.beams) { // half-timbering: posts, rails and diagonal braces on the front and the sides
    const beam = (bw, bh, x, y, rot, at, rz = 0) =>
      g.push(part(new THREE.BoxGeometry(bw, bh, 0.08).rotateZ(rz).translate(x, y, 0.06).rotateY(rot).translate(...at), style.beams, false, M.WOOD));
    for (const [rot, at, half] of [[0, [0, 0, d / 2], w / 2], [Math.PI / 2, [w / 2, 0, 0], d / 2], [-Math.PI / 2, [-w / 2, 0, 0], d / 2]]) {
      for (const x of [-half + 0.1, half - 0.1]) beam(0.18, h, x, h / 2, rot, at);
      for (const y of [0.1, h / 2, h - 0.1]) beam(half * 2, 0.16, 0, y, rot, at);
      for (const s of [-1, 1]) beam(0.14, Math.hypot(half * 0.5, h / 2), s * half * 0.72, h * 0.75, rot, at, s * Math.atan2(half * 0.5, h / 2));
    }
  }

  if (style.flat) { // Greek house: flat roof with a low wall around it, sometimes a blue dome
    g.push(boxAt(w + 0.15, 0.4, d + 0.15, 0, h, 0, '#f4f4f4', M.PLASTER), boxAt(w - 0.3, 0.1, d - 0.3, 0, h + 0.3, 0, '#e8e8e8', M.PLASTER));
    if (r < 0.5) g.push(boxAt(2, 0.4, 2, 0, h + 0.3, 0, '#f4f4f4', M.PLASTER), part(new THREE.SphereGeometry(1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, h + 0.7, 0), style.dome, true, M.PAINT));
    return { geo: g, glow, top: h + 1.8, w, d };
  }

  // Pitched roof: wall-coloured gables, two tiled slopes, a ridge, gutters, a chimney.
  const rh = style.tall ? 2.8 : 2, o = 0.4, roof = style.roof[Math.floor(r * 7) % style.roof.length];
  const roofMat = roof === '#c9a25a' ? M.BARK : M.ROOF; // straw thatch looks like bark furrows
  const tri = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rh)]);
  g.push(part(new THREE.ExtrudeGeometry(tri, { depth: d, bevelEnabled: false }).translate(0, h, -d / 2), wallColor, false, wall));
  const slope = Math.atan2(rh, w / 2), L = Math.hypot(w / 2, rh) + o;
  for (const s of [-1, 1]) {
    g.push(part(new THREE.BoxGeometry(L, 0.18, d + o * 2).translate(s * L / 2, 0.12, 0).rotateZ(-s * slope).translate(0, h + rh, 0), roof, false, roofMat));
    g.push(boxAt(0.14, 0.14, d + o * 2, s * (w / 2 + o * 0.9), h - o * Math.tan(slope) - 0.12, 0, '#5a5a5a', M.METAL)); // gutter
  }
  g.push(boxAt(0.3, 0.18, d + o * 2, 0, h + rh + 0.02, 0, roof, roofMat)); // ridge
  if (style.gable === 'stepped') // Dutch stepped gable in front of the roof
    for (let k = 0; k < 4; k++) {
      const sw = w * (1 - k * 0.24);
      g.push(boxAt(sw, 0.75, 0.35, 0, h + k * 0.75, d / 2 - 0.1, wallColor, wall), boxAt(sw + 0.1, 0.1, 0.45, 0, h + k * 0.75 + 0.7, d / 2 - 0.1, '#f2f2f2', M.STONE));
    }
  if (style.chimney) g.push(boxAt(0.6, rh + 0.6, 0.6, w / 4, h + rh * 0.3, -d / 4, '#8d5a44', M.BRICK), boxAt(0.8, 0.15, 0.8, w / 4, h + rh * 1.3 + 0.45, -d / 4, '#6b6b6b', M.STONE));
  return { geo: g, glow, top: h + rh, w, d };
}

// Park bench: wooden slats on cast iron sides.
function bench() {
  const g = [], iron = '#2e3236';
  for (let i = 0; i < 3; i++) g.push(boxAt(2, 0.06, 0.16, 0, 0.48, 0.2 - i * 0.2, '#a0714a', M.WOOD));
  for (let i = 0; i < 2; i++) g.push(boxAt(2, 0.14, 0.05, 0, 0.68 + i * 0.22, -0.3, '#a0714a', M.WOOD));
  for (const x of [-0.85, 0.85]) {
    g.push(boxAt(0.08, 0.48, 0.08, x, 0, 0.22, iron, M.METAL), boxAt(0.08, 1.05, 0.08, x, 0, -0.26, iron, M.METAL));
    g.push(boxAt(0.08, 0.06, 0.6, x, 0.42, -0.02, iron, M.METAL), boxAt(0.08, 0.06, 0.45, x, 0.7, 0.02, iron, M.METAL)); // seat support, armrest
  }
  return mergeGeometries(g);
}
// Old style street lamp: base, fluted pole, lantern with four posts and a little roof.
const lamp = () => {
  const iron = '#2e3236', g = [boxAt(0.45, 0.3, 0.45, 0, 0, 0, iron, M.METAL), cyl(0.09, 0.13, 3.1, iron, 8)];
  g.push(boxAt(0.2, 0.12, 0.2, 0, 3.05, 0, iron, M.METAL), boxAt(0.5, 0.06, 0.5, 0, 3.15, 0, iron, M.METAL));
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) g.push(boxAt(0.05, 0.55, 0.05, x, 3.2, z, iron, M.METAL));
  g.push(part(new THREE.ConeGeometry(0.42, 0.3, 4).rotateY(Math.PI / 4).translate(0, 3.9, 0), iron, false, M.METAL), boxAt(0.08, 0.12, 0.08, 0, 4.05, 0, iron, M.METAL));
  return mergeGeometries(g.map((x) => (x.attributes.aMat ? x : withMaterial(x, M.METAL))));
};
const lampLight = () => boxAt(0.4, 0.5, 0.4, 0, 3.22, 0, '#fff3b0', M.PAINT);
const umbrella = (color) => mergeGeometries([cyl(0.06, 0.06, 2.4, '#eeeeee', 4), cone(1.5, 0.6, 2.2, color, 8), boxAt(1.1, 0.05, 2, 1.3, 0, 0.4, color)]);

function voxelFlag(id) {
  const vox = createVoxels(), W = 20, H = 13;
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) set(vox, x, y, 0, FLAGS[id]((x + 0.5) / W, 1 - (y + 0.5) / H));
  const flag = buildMesh(vox, 0.14);
  flag.position.set(0.15, 5.2, 0);
  const pole = new THREE.Mesh(cyl(0.08, 0.1, 7.2, '#d9d9d9', 6), textured());
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

  // Terrain: smooth, with painted colour gradients (meadows, warm hills, rocky tops, wet sand, soft paths).
  const GA = C(cfg.grass[0]), GB = C(cfg.grass[1]);
  const HILL = GA.clone().lerp(C('#9a8f4e'), 0.35).multiplyScalar(0.85), ROCK = C('#a19a8c'), MEADOW = C('#c9d45c');
  const WET = C('#cdb57c'), SHALLOW = C('#e3d6a4'), SEABED = C('#1d6f9a');
  const rw = cfg.runway, rwMid = (rw.x0 + rw.x1) / 2;
  const ss = THREE.MathUtils.smoothstep, down = (x, hi, lo) => 1 - ss(x, lo, hi); // down: 1 below lo, 0 above hi
  const w4 = [0, 0, 0, 0]; // detail texture blend of the last vertex: sand, rock, gravel, asphalt (the rest is grass)
  function vertexColor(x, z, y, ny) {
    // Grass: light and dark meadows, a few yellow flowery patches, warmer and darker uphill, rock on high tops.
    const c = GA.clone().lerp(GB, ss(noise(x * 0.6 + nx, z * 0.6 + nz), -0.9, 0.9));
    c.lerp(MEADOW, ss(noise(x * 0.27 + 40, z * 0.31 - nz), 0.75, 1.2) * 0.35);
    const up = y / cfg.height;
    c.lerp(HILL, ss(up, 0.45, 0.85));
    if (cfg.height >= 12) c.lerp(ROCK, ss(up, 0.85, 1.05) * 0.8);
    c.lerp(DIRT, down(ny, 0.9, 0.7)); // steep slopes show the earth
    // Soft zones
    const pd = Math.hypot(x - cfg.plaza.x, z - cfg.plaza.z) - cfg.plaza.r;
    const sd = s2 ? Math.hypot(x - s2.x, z - s2.z) - s2.r : Infinity;
    const gravel = ss(-Math.min(pd, sd), -1.5, 1);
    c.lerp(GRAVEL, gravel);
    const lawn = cfg.lawn ? ss(-rectDist(cfg.lawn, x, z) + (inRect(cfg.lawn, x, z) ? 1 : 0), -1, 0.5) : 0;
    if (cfg.lawn) c.lerp(Math.abs(x) < 2.5 ? GRAVEL : LAWN, lawn);
    const asphalt = hasRunway ? ss(-rectDist(rw, x, z) + (inRect(rw, x, z) ? 1 : 0), -0.8, 0.5) : 0;
    if (hasRunway) c.lerp(ASPHALT, asphalt);
    const sand = down(y, 1.9, 1.25), keep = 1 - sand;
    w4[0] = sand;
    w4[1] = Math.max(cfg.height >= 12 ? ss(up, 0.85, 1.05) * 0.8 : 0, down(ny, 0.9, 0.7)) * keep * (1 - gravel - asphalt);
    w4[2] = Math.max(gravel, Math.abs(x) < 2.5 ? lawn : 0) * keep;
    w4[3] = asphalt * keep;
    // Beach: dry sand, then wet sand at the water line, light sand under the shallow water.
    c.lerp(SAND, down(y, 1.9, 1.25));
    c.lerp(WET, down(y, 1.1, 0.75) * 0.8);
    c.lerp(SHALLOW, down(y, 0.4, -0.6));
    c.lerp(SEABED, down(y, -0.8, -2.6)); // deeper: the same blue as the sea floor
    return c.multiplyScalar(0.97 + rand(x, z, 9) * 0.06);
  }
  const V = N + 1, pos = new Float32Array(V * V * 3), col = new Float32Array(V * V * 3), wts = new Float32Array(V * V * 4), index = [];
  const hAt = (i, j) => grid[Math.min(N, Math.max(0, i)) * V + Math.min(N, Math.max(0, j))];
  for (let i = 0; i <= N; i++)
    for (let j = 0; j <= N; j++) {
      const x = -SIZE + i * CELL, z = -SIZE + j * CELL, y = grid[i * V + j], k = (i * V + j) * 3;
      const gx = hAt(i + 1, j) - hAt(i - 1, j), gz = hAt(i, j + 1) - hAt(i, j - 1);
      const ny = (2 * CELL) / Math.hypot(gx, 2 * CELL, gz);
      pos.set([x, y, z], k);
      vertexColor(x, z, y, ny).toArray(col, k);
      wts.set(w4.map((w) => Math.max(0, w)), (i * V + j) * 4);
    }
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const a = i * V + j, b = (i + 1) * V + j, c = a + 1, d = b + 1;
      if (Math.max(grid[a], grid[b], grid[c], grid[d]) < -2.9) continue;
      index.push(a, c, b, c, d, b);
    }
  const terrainGeo = new THREE.BufferGeometry();
  terrainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  terrainGeo.setAttribute('aW', new THREE.BufferAttribute(wts, 4));
  terrainGeo.setIndex(index);
  terrainGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(terrainGeo, textured({}, true));
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

  // Runway markings: white side lines and a dashed centre line.
  if (hasRunway) {
    for (const x of [rw.x0 + 0.5, rw.x1 - 0.5]) decor.push(withMaterial(boxAt(0.4, 0.04, rw.z1 - rw.z0 - 1, x, rw.h, (rw.z0 + rw.z1) / 2, '#f2f2f2'), M.ASPHALT));
    for (let z = rw.z0 + 3; z < rw.z1 - 2; z += 4) decor.push(withMaterial(boxAt(0.5, 0.04, 2, rwMid, rw.h, z, '#f2f2f2'), M.ASPHALT));
  }

  const planeSpot = hasRunway ? { x: ox + rwMid, z: oz + rw.z0 + 7, heading: 0, y: rw.h } : null;

  // Trees, keeping clear of plaza, runway, lawn, pier and fields.
  const fields = [];
  if (cfg.extras.includes('lavender')) fields.push({ x0: 18, x1: 38, z0: 6, z1: 30 });
  if (cfg.extras.includes('tulips')) fields.push({ x0: -36, x1: -16, z0: -30, z1: -12 }, { x0: -30, x1: -10, z0: 14, z1: 30 });
  const spots = cfg.spots ?? [];
  const houses = []; // { x, z, r } local: keep trees and other things away
  const glow = [];
  const blocked = (x, z, gap = 4) =>
    zones.some((zn) => zn.dist(x, z) < gap) || fields.some((f) => rectDist(f, x, z) < 1.5) || (pier && rectDist(pier, x, z) < 4) ||
    spots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 6) || houses.some((h) => Math.hypot(x - h.x, z - h.z) < h.r);
  const flat = (x, z, r) => {
    const ys = [[-r, -r], [r, -r], [-r, r], [r, r], [0, 0]].map(([a, b]) => surface(x + a, z + b));
    return Math.max(...ys) - Math.min(...ys) < 2.4 ? Math.min(...ys) : null;
  };

  // A little village around the monument: houses facing the plaza (only 90° turns, so the collider stays a box).
  // ponytail: greedy placement, nearest to the plaza first; no streets
  const cand = [];
  for (let x = -SIZE; x <= SIZE; x += 3)
    for (let z = -SIZE; z <= SIZE; z += 3) {
      const jx = x + rand(x, z, 11 + cfg.seed) * 2, jz = z + rand(x, z, 12 + cfg.seed) * 2;
      cand.push([jx, jz, Math.hypot(jx - cfg.plaza.x, jz - cfg.plaza.z) - cfg.plaza.r + rand(x, z, 13) * 12]);
    }
  cand.sort((a, b) => a[2] - b[2]);
  for (const [x, z] of cand) {
    if (houses.length >= 13) break;
    if (hasRunway && x > rw.x0 - 10 && x < rw.x1 + 10) continue; // keep the runway approach clear
    const y = flat(x, z, 3);
    if (y === null || y < 1.6 || y > cfg.height * 0.8 || blocked(x, z, 7)) continue;
    const rot = Math.round(Math.atan2(cfg.plaza.x - x, cfg.plaza.z - z) / (Math.PI / 2)) * (Math.PI / 2);
    const r = rand(x, z, 14), hs = house(HOUSES[cfg.id], r);
    decor.push(mergeGeometries(hs.geo).rotateY(rot).translate(x, y, z));
    glow.push(mergeGeometries(hs.glow).rotateY(rot).translate(x, y, z));
    const [hw, hd] = Math.abs(Math.round(rot / (Math.PI / 2))) % 2 ? [hs.d, hs.w] : [hs.w, hs.d];
    const [wx, wz] = W(x, z);
    colliders.push({ x0: wx - hw / 2, x1: wx + hw / 2, z0: wz - hd / 2, z1: wz + hd / 2, top: y + hs.top, house: true });
    houses.push({ x, z, r: Math.max(hw, hd) / 2 + 3.5 });
  }

  // Benches looking at the monument (you can sit on them) and street lamps around the plaza.
  const benches = [];
  const pa = Math.atan2(dx, dz); // direction of the port
  for (let k = 0; k < 8; k++) {
    const a = pa + Math.PI / 8 + (k * Math.PI) / 4, R = cfg.plaza.r + 2.5;
    const x = cfg.plaza.x + Math.sin(a) * R, z = cfg.plaza.z + Math.cos(a) * R;
    const y = surface(x, z);
    if (y < 1.6 || zones.slice(1).some((zn) => zn.dist(x, z) < 3) || fields.some((f) => rectDist(f, x, z) < 2) || (pier && rectDist(pier, x, z) < 3) || inRect(cfg.lawn, x, z)) continue;
    const [wx, wz] = W(x, z);
    if (k % 2) {
      decor.push(lamp().translate(x, y - 0.1, z));
      glow.push(lampLight().translate(x, y - 0.1, z));
      colliders.push({ x: wx, z: wz, r: 0.2, top: y + 3.8 });
    } else {
      const heading = a + Math.PI;
      decor.push(bench().rotateY(heading).translate(x, y - 0.05, z));
      colliders.push({ x: wx, z: wz, r: 0.6, top: y + 0.6 });
      benches.push({ x: wx + Math.sin(heading) * 0.15, z: wz + Math.cos(heading) * 0.15, y, heading });
    }
    houses.push({ x, z, r: 2 });
  }

  // Beach umbrellas on the sunny islands.
  if (['france', 'spain', 'italy', 'greece'].includes(cfg.id))
    for (let i = 0, n = 0; i < 400 && n < 7; i++) {
      const a = rand(i, 5, cfg.seed) * Math.PI * 2, d = cfg.R * (0.7 + rand(i, 6, cfg.seed) * 0.5);
      const x = Math.sin(a) * d, z = Math.cos(a) * d, y = surface(x, z);
      if (y < WATER_LEVEL + 0.3 || y > 1.35 || blocked(x, z)) continue;
      decor.push(umbrella(['#e53935', '#fdd835', '#1e88e5', '#43a047', '#fb8c00'][n % 5]).rotateY(a).translate(x, y, z));
      const [wx, wz] = W(x, z);
      colliders.push({ x: wx, z: wz, r: 0.15, top: y + 2.6 });
      houses.push({ x, z, r: 3 });
      n++;
    }
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
      decor.push(part(new THREE.DodecahedronGeometry(s, 0).translate(x, y + s * 0.3, z), rand(i, 4) < 0.5 ? '#9a9a96' : '#b5b3ab', false, M.ROCK));
      const [wx, wz] = W(x, z);
      colliders.push({ x: wx, z: wz, r: s * 0.8, top: y + s * 1.2 });
    }
  for (const f of fields)
    for (let z = f.z0 + 1; z <= f.z1; z += cfg.id === 'france' ? 3 : 2)
      for (let x = f.x0; x <= f.x1; x += cfg.id === 'france' ? 1.4 : 0.9) {
        const y = surface(x, z);
        if (y < 1.2) continue;
        if (cfg.id === 'france') decor.push(ico(0.7, 0, rand(x, z) < 0.5 ? '#9a6fd0' : '#8a5cc4', 1, 0.8, 1, M.FOLIAGE).translate(x, y + 0.3, z));
        else decor.push(part(new THREE.BoxGeometry(0.45, 0.5, 0.45).translate(x, y + 0.45, z), ['#e53935', '#fdd835', '#ec407a', '#fb8c00'][Math.floor(z / 2) % 4 & 3]));
      }
  if (cfg.extras.includes('hedges'))
    for (let z = 6; z <= 40; z += 2.5)
      for (const x of [cfg.lawn.x0 + 1, cfg.lawn.x1 - 1]) {
        decor.push(part(new THREE.BoxGeometry(1.4, 1.2, 1.4).translate(x, cfg.lawn.h + 0.6, z), '#2f7a32'));
        const [wx, wz] = W(x, z);
        colliders.push({ x0: wx - 0.7, z0: wz - 0.7, x1: wx + 0.7, z1: wz + 0.7, top: cfg.lawn.h + 1.2 });
      }

  // Small stuff on the grass: tufts, bushes and flowers (walk-through, no colliders).
  const FLOWERS = ['#ffffff', '#fdd835', '#e53935', '#ec407a', '#ab47bc', '#ff8a65'];
  const flowerSpots = [];
  for (let x = -SIZE; x <= SIZE; x += 1.6)
    for (let z = -SIZE; z <= SIZE; z += 1.6) {
      const jx = x + rand(x, z, 21 + cfg.seed) * 1.4, jz = z + rand(x, z, 22 + cfg.seed) * 1.4, r = rand(x, z, 23 + cfg.seed);
      if (r > 0.16) continue;
      const y = surface(jx, jz);
      if (y < 1.7 || blocked(jx, jz, 1) || zoneAt(jx, jz)) continue;
      if (r < 0.08) decor.push(part(new THREE.ConeGeometry(0.3, 0.7, 4).translate(jx, y + 0.25, jz), rand(x, z, 24) < 0.5 ? '#3f8f3a' : '#57a845'));
      else if (r < 0.135) {
        const c = FLOWERS[Math.floor(rand(x, z, 25) * FLOWERS.length)];
        for (let k = 0; k < 5; k++) decor.push(boxAt(0.3, 0.3, 0.3, jx + Math.sin(k * 2.5) * 0.6, y + 0.1 + (k % 2) * 0.12, jz + Math.cos(k * 2.5) * 0.6, c));
        flowerSpots.push(W(jx, jz));
      } else decor.push(ico(0.8, 0, '#3d8a35', 1, 0.7, 1).translate(jx, y + 0.3, jz), ico(0.55, 0, '#4a9a3e', 1, 0.8, 1).translate(jx + 0.6, y + 0.3, jz + 0.3));
    }

  const group = new THREE.Group();
  group.position.set(ox, 0, oz);
  const decorMesh = new THREE.Mesh(mergeGeometries(decor), textured());
  decorMesh.castShadow = decorMesh.receiveShadow = true;
  group.add(terrain, decorMesh, new THREE.Mesh(mergeGeometries(glow), GLOW));

  // Flag of the country
  const flag = voxelFlag(cfg.id);
  const [fx, fz] = cfg.flag ?? [cfg.plaza.x + cfg.plaza.r + 2, cfg.plaza.z];
  flag.position.set(fx, surface(fx, fz), fz);
  group.add(flag);
  colliders.push({ x: fx + ox, z: fz + oz, r: 0.2, top: surface(fx, fz) + 7.2 });

  const site = (s) => s && { x: s.x + ox, z: s.z + oz, y: s.h, r: s.r };
  return {
    cfg, group, colliders, boatSpot, planeSpot, benches, flowerSpots,
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

// Sea that follows the camera, with waves computed in world space. A height map of the islands
// tells the water shader how deep it is: turquoise on the shallows, deep blue far away, foam on the coast.
function createSea(islands, groundAt) {
  const STEP = 10, RES = 1024, ENC = 20; // height map: (h + 4) * ENC in a byte
  const min = new THREE.Vector2(Infinity, Infinity), max = new THREE.Vector2(-Infinity, -Infinity);
  for (const i of islands) {
    min.min(new THREE.Vector2(i.center.x - i.radius, i.center.z - i.radius));
    max.max(new THREE.Vector2(i.center.x + i.radius, i.center.z + i.radius));
  }
  const size = max.clone().sub(min), data = new Uint8Array(RES * RES);
  for (let j = 0; j < RES; j++)
    for (let i = 0; i < RES; i++) {
      const h = groundAt(min.x + ((i + 0.5) / RES) * size.x, min.y + ((j + 0.5) / RES) * size.y);
      data[j * RES + i] = THREE.MathUtils.clamp(Math.round((h + 4) * ENC), 0, 255);
    }
  const heights = new THREE.DataTexture(data, RES, RES, THREE.RedFormat, THREE.UnsignedByteType);
  heights.magFilter = heights.minFilter = THREE.LinearFilter;
  heights.needsUpdate = true;

  const uniforms = {
    uHeights: { value: heights }, uMin: { value: min }, uSize: { value: size }, uTime: { value: 0 },
    uDeep: { value: new THREE.Color('#1667b0') }, uShallow: { value: new THREE.Color('#38d1cf') },
  };
  const material = new THREE.MeshPhongMaterial({ color: '#2f9bd6', transparent: true, opacity: 0.88, flatShading: true, shininess: 140, specular: '#6f93a8' });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vWorld;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWorld;
        uniform sampler2D uHeights;
        uniform vec2 uMin, uSize;
        uniform float uTime;
        uniform vec3 uDeep, uShallow;`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        float ground = texture2D(uHeights, (vWorld.xz - uMin) / uSize).r * 255.0 / ${ENC}.0 - 4.0;
        float depth = ${WATER_LEVEL.toFixed(2)} - ground;
        float shallow = 1.0 - smoothstep(0.0, 4.0, depth);
        // big slow patches of slightly different blue, like a painting
        float patches = sin(vWorld.x * 0.013 + uTime * 0.05) * sin(vWorld.z * 0.017 - uTime * 0.04);
        vec3 col = mix(uDeep * (0.92 + patches * 0.1), uShallow, shallow);
        float wobble = sin(vWorld.x * 0.8 + uTime * 1.6) * 0.18 + sin(vWorld.z * 0.9 - uTime * 1.3) * 0.18;
        float foam = (1.0 - smoothstep(0.05, 0.6, depth + wobble)) * step(-0.4, depth);
        col = mix(col, vec3(0.93, 0.97, 1.0), foam * 0.8);
        vec4 diffuseColor = vec4(col, mix(opacity * mix(1.0, 0.7, shallow), 0.95, foam));`);
  };

  const geo = new THREE.PlaneGeometry(900, 900, 90, 90).rotateX(-Math.PI / 2);
  const base = geo.attributes.position.array.slice();
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = WATER_LEVEL;
  mesh.update = (t, center, animate) => {
    uniforms.uTime.value = t;
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
  const islandNear = (x, z) => islands.find((i) => i.contains(x, z)) ?? null;
  const sea = createSea(islands, (x, z) => islandNear(x, z)?.surface(x, z) ?? -3);
  group.add(seabed, sea);
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
