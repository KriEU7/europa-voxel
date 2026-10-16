// Realistic surface detail for everything, drawn in code (no image files).
// Every texture is a grey "detail" map that multiplies the vertex colours, so the models keep their
// colours and get grass blades, bricks, roof tiles, wood grain, stone blocks... on top.
// Textures are projected in object space from 3 sides (triplanar), so no geometry needs UVs:
// each vertex only carries a material id (aMat), the terrain carries blend weights (aW).
import * as THREE from 'three';

export const M = {
  NONE: 0, GRASS: 1, SAND: 2, ROCK: 3, DIRT: 4, GRAVEL: 5, ASPHALT: 6, WOOD: 7, BRICK: 8, ROOF: 9,
  PLASTER: 10, STONE: 11, MARBLE: 12, METAL: 13, FABRIC: 14, FOLIAGE: 15, SKIN: 16, BARK: 17, PAINT: 18,
};
const LAYERS = 19, SIZE = 256;
// metres per repeat, and how strong the detail is (0 = flat colour)
const SCALE = [1, 2, 2.5, 4, 3, 2, 3, 1.6, 1.6, 1.6, 3, 2.4, 3, 1.5, 0.3, 1.4, 0.5, 1.2, 1.5];
const STRENGTH = [0, 0.8, 0.5, 0.65, 0.55, 0.65, 0.5, 0.65, 0.65, 0.65, 0.35, 0.6, 0.4, 0.35, 0.35, 0.7, 0.06, 0.65, 0.12];

// ---- Guess the material from a colour (models made of coloured cubes) ------------------
const hsl = {};
export function classify(hex) {
  new THREE.Color(hex).getHSL(hsl);
  const { h, s, l } = hsl, deg = h * 360;
  if (s < 0.15) return l < 0.22 ? M.PAINT : l > 0.88 ? M.PLASTER : M.STONE;
  if (deg >= 70 && deg <= 170) return M.FOLIAGE;
  if (deg >= 15 && deg <= 50 && l < 0.5) return M.WOOD;
  if (deg >= 25 && deg <= 60 && s < 0.6) return M.STONE; // sandstone, beige
  if ((deg < 15 || deg > 340) && s > 0.35 && l < 0.5) return M.BRICK;
  return M.PAINT;
}

// ---- Drawing the textures ---------------------------------------------------------------
// Values 0..1, average about 0.5. Everything wraps around, so the textures tile without seams.
const hash = (x, y, s) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
};
function valueNoise(x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const m = (a) => ((a % period) + period) % period;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(m(xi), m(yi), seed), b = hash(m(xi + 1), m(yi), seed), c = hash(m(xi), m(yi + 1), seed), d = hash(m(xi + 1), m(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// Fractal noise; freq = how many bumps across the texture.
function fbm(px, py, freq, octaves = 4, seed = 0, sx = 1, sy = 1) {
  let sum = 0, amp = 0.5, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const f = freq * 2 ** o;
    sum += valueNoise((px / SIZE) * f * sx, (py / SIZE) * f * sy, f * Math.max(sx, sy), seed + o) * amp;
    norm += amp;
    amp *= 0.5;
  }
  return sum / norm;
}

function layer(paint) {
  const d = new Float32Array(SIZE * SIZE);
  const px = (x, y) => (((y % SIZE) + SIZE) % SIZE) * SIZE + (((x % SIZE) + SIZE) % SIZE);
  const tools = {
    fill: (fn) => { for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) d[y * SIZE + x] = fn(x, y); },
    add: (x, y, v) => { d[px(Math.round(x), Math.round(y))] += v; },
    set: (x, y, v) => { d[px(Math.round(x), Math.round(y))] = v; },
    get: (x, y) => d[px(Math.round(x), Math.round(y))],
    disc(cx, cy, r, fn) { // fn(dx, dy, dist) -> value to add
      for (let y = -Math.ceil(r); y <= r; y++) for (let x = -Math.ceil(r); x <= r; x++) {
        const dd = Math.hypot(x, y);
        if (dd <= r) d[px(Math.round(cx + x), Math.round(cy + y))] += fn(x, y, dd);
      }
    },
    line(x0, y0, x1, y1, v) {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for (let i = 0; i <= n; i++) d[px(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n))] += v;
    },
  };
  paint(tools);
  return d;
}
const R = (s) => { let x = s * 9301 + 49297; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); };

function brickLike(t, w, h, mortar, seed, rough = 0.12, offset = 0.5) {
  const rnd = R(seed), shade = new Map();
  t.fill((x, y) => {
    const row = Math.floor(y / h), bx = Math.floor((x + (row % 2) * w * offset) / w);
    const key = row * 1000 + (((bx % 1000) + 1000) % 1000);
    if (!shade.has(key)) shade.set(key, 0.42 + rnd() * 0.22);
    const lx = (x + (row % 2) * w * offset) % w, ly = y % h;
    const edge = Math.min(lx, w - lx, ly, h - ly);
    if (edge < mortar) return 0.62 + fbm(x, y, 32, 2, seed) * 0.1; // mortar joint
    return shade.get(key) - (edge < mortar + 1.5 ? 0.08 : 0) + (fbm(x, y, 24, 3, seed + 1) - 0.5) * rough * 2;
  });
}

const PAINTERS = {
  [M.NONE]: (t) => t.fill(() => 0.5),
  [M.GRASS]: (t) => {
    t.fill((x, y) => 0.38 + fbm(x, y, 8, 4, 1) * 0.25);
    const rnd = R(2);
    for (let i = 0; i < 5000; i++) { // blades of grass
      const x = rnd() * SIZE, y = rnd() * SIZE, len = 3 + rnd() * 7, a = (rnd() - 0.5) * 0.8, v = (rnd() - 0.4) * 0.35;
      t.line(x, y, x + Math.sin(a) * len, y - Math.cos(a) * len, v / len * 3);
    }
  },
  [M.SAND]: (t) => t.fill((x, y) => 0.42 + fbm(x, y, 64, 2, 3) * 0.2 + Math.sin((y + fbm(x, y, 4, 2, 4) * 60) * 0.15) * 0.05 + hash(x, y, 5) * 0.12),
  [M.ROCK]: (t) => {
    t.fill((x, y) => 0.25 + fbm(x, y, 4, 5, 6) * 0.55);
    const rnd = R(7);
    for (let c = 0; c < 14; c++) { // cracks
      let x = rnd() * SIZE, y = rnd() * SIZE, a = rnd() * 6.28;
      for (let s = 0; s < 60; s++) {
        t.add(x, y, -0.22);
        a += (rnd() - 0.5) * 0.8;
        x += Math.cos(a) * 1.5;
        y += Math.sin(a) * 1.5;
      }
    }
  },
  [M.DIRT]: (t) => {
    t.fill((x, y) => 0.32 + fbm(x, y, 8, 4, 8) * 0.35);
    const rnd = R(9);
    for (let i = 0; i < 260; i++) t.disc(rnd() * SIZE, rnd() * SIZE, 1 + rnd() * 2.5, (dx, dy, d) => (dy < 0 ? 0.12 : -0.08) * (1 - d / 3.5));
  },
  [M.GRAVEL]: (t) => {
    t.fill((x, y) => 0.35 + hash(x, y, 10) * 0.08);
    const rnd = R(11);
    for (let i = 0; i < 900; i++) {
      const r = 2 + rnd() * 3.5, v = (rnd() - 0.5) * 0.2;
      t.disc(rnd() * SIZE, rnd() * SIZE, r, (dx, dy, d) => 0.12 + v - dy * 0.03 - (d / r) * 0.1); // lit from above
    }
  },
  [M.ASPHALT]: (t) => {
    t.fill((x, y) => 0.4 + hash(x, y, 12) * 0.22 + fbm(x, y, 6, 3, 13) * 0.15);
    const rnd = R(14);
    for (let c = 0; c < 4; c++) {
      let x = rnd() * SIZE, y = rnd() * SIZE, a = rnd() * 6.28;
      for (let s = 0; s < 80; s++) (t.add(x, y, -0.18), (a += (rnd() - 0.5) * 0.6), (x += Math.cos(a)), (y += Math.sin(a)));
    }
  },
  [M.WOOD]: (t) => {
    const rnd = R(15), plank = 32, ends = Array.from({ length: SIZE / plank }, () => rnd() * SIZE);
    t.fill((x, y) => {
      const row = Math.floor(y / plank), ly = y % plank, tone = hash(row, 0, 16) * 0.12;
      const grain = Math.sin((y + fbm(x, y, 3, 3, 17 + row, 1, 4) * 40) * 0.9) * 0.06 + fbm(x, y, 2, 4, 18 + row, 1, 8) * 0.2;
      const seam = ly < 1.5 ? -0.25 : ly < 3 ? -0.08 : 0;
      const end = Math.abs(((x - ends[row]) % SIZE + SIZE) % SIZE) < 1.5 ? -0.25 : 0;
      return 0.4 + tone + grain + seam + end;
    });
  },
  [M.BRICK]: (t) => brickLike(t, 64, 24, 2.5, 19),
  [M.ROOF]: (t) => {
    const w = 32, h = 22;
    t.fill((x, y) => {
      const row = Math.floor(y / h), lx = (x + (row % 2) * w / 2) % w, ly = y % h;
      const curve = Math.sin((lx / w) * Math.PI) * 0.12; // round tiles
      const shadow = ly > h - 4 ? -0.25 : 0; // the next row overlaps
      return 0.38 + curve + (ly / h) * 0.12 + shadow + hash(row, Math.floor((x + (row % 2) * w / 2) / w), 20) * 0.1 + (fbm(x, y, 16, 2, 21) - 0.5) * 0.1;
    });
  },
  [M.PLASTER]: (t) => t.fill((x, y) => 0.45 + fbm(x, y, 6, 4, 22) * 0.12 + hash(x, y, 23) * 0.06 - Math.max(0, fbm(x, y, 3, 3, 24) - 0.62) * 0.6),
  [M.STONE]: (t) => brickLike(t, 96, 48, 1.8, 25, 0.25, 0.5),
  [M.MARBLE]: (t) => t.fill((x, y) => {
    const vein = Math.abs(Math.sin(((x + y) / SIZE) * Math.PI * 4 + fbm(x, y, 4, 5, 26) * 9));
    return 0.56 + fbm(x, y, 8, 3, 27) * 0.08 - Math.pow(1 - vein, 12) * 0.35;
  }),
  [M.METAL]: (t) => {
    t.fill((x, y) => 0.45 + fbm(x, y, 2, 4, 28, 1, 30) * 0.18 + hash(0, y, 29) * 0.06);
    for (let y = 16; y < SIZE; y += 64) for (let x = 16; x < SIZE; x += 32) t.disc(x, y, 2, (dx, dy) => (dy < 0 ? 0.25 : -0.15)); // rivets
  },
  [M.FABRIC]: (t) => t.fill((x, y) => 0.5 + ((x % 4 < 2) !== (y % 4 < 2) ? 0.08 : -0.08) + fbm(x, y, 16, 2, 30) * 0.1 - 0.05),
  [M.FOLIAGE]: (t) => {
    t.fill((x, y) => 0.3 + fbm(x, y, 8, 3, 31) * 0.15);
    const rnd = R(32);
    for (let i = 0; i < 1400; i++) { // leaves: lit on top, darker underneath
      const r = 2.5 + rnd() * 4, v = (rnd() - 0.3) * 0.15;
      t.disc(rnd() * SIZE, rnd() * SIZE, r, (dx, dy, d) => 0.1 + v - (dy / r) * 0.12 - (d / r) * 0.06);
    }
  },
  [M.SKIN]: (t) => t.fill((x, y) => 0.5 + (fbm(x, y, 32, 2, 33) - 0.5) * 0.2),
  [M.BARK]: (t) => t.fill((x, y) => {
    const furrow = Math.abs(Math.sin((x / SIZE) * Math.PI * 14 + fbm(x, y, 3, 4, 34, 1, 0.3) * 8));
    return 0.3 + furrow * 0.3 + fbm(x, y, 8, 3, 35, 2, 0.5) * 0.25;
  }),
  [M.PAINT]: (t) => t.fill((x, y) => 0.47 + fbm(x, y, 8, 3, 36) * 0.06),
};

let texture = null;
function buildTexture() {
  const data = new Uint8Array(SIZE * SIZE * LAYERS);
  for (let l = 0; l < LAYERS; l++) {
    const d = layer(PAINTERS[l]);
    let mean = 0;
    for (const v of d) mean += v;
    mean /= d.length;
    // Recentre on 0.5 so a texture never makes a model darker or lighter on average.
    for (let i = 0; i < d.length; i++) data[l * SIZE * SIZE + i] = Math.max(0, Math.min(255, Math.round((d[i] - mean + 0.5) * 255)));
  }
  texture = new THREE.DataArrayTexture(data, SIZE, SIZE, LAYERS);
  texture.format = THREE.RedFormat;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

// On "Low" quality the textures are switched off (slow school computers).
export const textureOn = { value: 1 };

const SHARED = `
  uniform sampler2DArray uDetail;
  uniform float uScale[${LAYERS}], uStrength[${LAYERS}], uTexOn;
  varying vec3 vOPos;
  varying vec3 vONor;
  float sampleTri(float m) {
    int i = int(m + 0.5);
    vec3 w = pow(abs(normalize(vONor)), vec3(4.0));
    w /= (w.x + w.y + w.z);
    vec3 p = vOPos / uScale[i];
    float t = 0.0;
    if (w.x > 0.02) t += texture(uDetail, vec3(p.zy, m)).r * w.x;
    if (w.y > 0.02) t += texture(uDetail, vec3(p.xz, m)).r * w.y;
    if (w.z > 0.02) t += texture(uDetail, vec3(p.xy, m)).r * w.z;
    return t / max(0.001, (w.x > 0.02 ? w.x : 0.0) + (w.y > 0.02 ? w.y : 0.0) + (w.z > 0.02 ? w.z : 0.0));
  }
  float detailOf(float m) {
    int i = int(m + 0.5);
    return 1.0 + (sampleTri(m) - 0.5) * 2.0 * uStrength[i];
  }
  // Terrain: seen from above, one sample is enough (cheaper than 3).
  float groundOf(float m) {
    int i = int(m + 0.5);
    return 1.0 + (texture(uDetail, vec3(vOPos.xz / uScale[i], m)).r - 0.5) * 2.0 * uStrength[i];
  }`;

// A Lambert material with the detail textures. terrain: blends grass/sand/rock/gravel/asphalt.
export function textured(params = {}, terrain = false) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, ...params });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = { value: texture ?? buildTexture() };
    shader.uniforms.uScale = { value: SCALE };
    shader.uniforms.uStrength = { value: STRENGTH };
    shader.uniforms.uTexOn = textureOn;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vOPos;
        varying vec3 vONor;
        ${terrain ? 'attribute vec4 aW; varying vec4 vW;' : 'attribute float aMat; flat varying float vMat;'}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vOPos = position;
        vONor = normal;
        ${terrain ? 'vW = aW;' : 'vMat = aMat;'}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        ${SHARED}
        ${terrain ? 'varying vec4 vW;' : 'flat varying float vMat;'}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (uTexOn > 0.5) {
          ${terrain ? `
          float grass = max(0.0, 1.0 - vW.x - vW.y - vW.z - vW.w), d = 0.0;
          if (grass > 0.01) d += groundOf(${M.GRASS}.0) * grass;
          if (vW.x > 0.01) d += groundOf(${M.SAND}.0) * vW.x;
          if (vW.y > 0.01) d += groundOf(${M.ROCK}.0) * vW.y;
          if (vW.z > 0.01) d += groundOf(${M.GRAVEL}.0) * vW.z;
          if (vW.w > 0.01) d += groundOf(${M.ASPHALT}.0) * vW.w;
          // big patches seen from far away (the small details fade with distance)
          float macro = texture(uDetail, vec3(vOPos.xz / 23.0, ${M.DIRT}.0)).r * 0.6 + texture(uDetail, vec3(vOPos.xz / 9.0, ${M.GRASS}.0)).r * 0.4;
          diffuseColor.rgb *= d * (1.0 + (macro - 0.5) * 0.5);` : `
          if (vMat > 0.5) diffuseColor.rgb *= detailOf(vMat);`}
        }`);
  };
  mat.customProgramCacheKey = () => (terrain ? 'textured-terrain' : 'textured');
  return mat;
}

// Material id for every vertex of a geometry (all the same).
export function withMaterial(geo, id) {
  geo.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count).fill(id), 1));
  return geo;
}
