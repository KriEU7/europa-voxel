// Voxel helper: a model is a Map (packed x,y,z) -> colour. buildMesh() turns it into ONE mesh,
// emitting only faces that touch air, so thousands of cubes cost a single draw call.
// Coordinates must be integers between -512 and 511.
import * as THREE from 'three';

export const createVoxels = () => new Map();

const pack = (x, y, z) => ((Math.round(x) + 512) << 20) | ((Math.round(y) + 512) << 10) | (Math.round(z) + 512);
const DX = 1 << 20, DY = 1 << 10, DZ = 1;

// color: '#rrggbb' or a function (x, y, z) -> '#rrggbb'
export function set(vox, x, y, z, color) {
  vox.set(pack(x, y, z), typeof color === 'function' ? color(x, y, z) : color);
}

// Filled box, corners inclusive.
export function box(vox, x0, y0, z0, x1, y1, z1, color) {
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++) set(vox, x, y, z, color);
}

// Corners are listed counter-clockwise seen from outside (checked in voxel.test.js).
export const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];
const OFFSETS = FACES.map(({ n }) => n[0] * DX + n[1] * DY + n[2] * DZ);

// Small deterministic brightness change per voxel: makes flat areas look "cubey".
function jitter(x, y, z) {
  const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return 0.985 + (h - Math.floor(h)) * 0.03;
}

// Ambient occlusion: a face corner touched by other voxels gets darker (soft shadows in corners and gaps).
const AO = [1, 0.84, 0.7, 0.58];
const AXES = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const at = (v) => v[0] * DX + v[1] * DY + v[2] * DZ;
const CORNER_AO = FACES.map(({ n, c }) => {
  const [u, w] = AXES.filter((a) => a[0] * n[0] + a[1] * n[1] + a[2] * n[2] === 0);
  return c.map((k) => {
    const su = u.reduce((s, a, i) => s + a * k[i], 0) ? 1 : -1, sw = w.reduce((s, a, i) => s + a * k[i], 0) ? 1 : -1;
    const side1 = at(n) + su * at(u), side2 = at(n) + sw * at(w);
    return [side1, side2, side1 + sw * at(w)];
  });
});

const colors = new Map();
const rgb = (hex) => {
  let c = colors.get(hex);
  if (!c) colors.set(hex, (c = new THREE.Color(hex).toArray()));
  return c;
};

export function buildGeometry(vox, size = 1) {
  // Count visible faces first so the arrays are allocated once.
  let faces = 0;
  for (const key of vox.keys()) for (const o of OFFSETS) if (!vox.has(key + o)) faces++;
  const pos = new Float32Array(faces * 12), nor = new Float32Array(faces * 12), col = new Float32Array(faces * 12);
  const idx = new Uint32Array(faces * 6);
  let f = 0, minY = Infinity, maxY = -Infinity;
  for (const key of vox.keys()) {
    const y = ((key >> 10) & 1023) - 512;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const span = Math.max(1, maxY + 1 - minY);
  for (const [key, color] of vox) {
    const x = (key >> 20) - 512, y = ((key >> 10) & 1023) - 512, z = (key & 1023) - 512;
    const [r, g, b] = rgb(color), j = jitter(x, y, z);
    for (let i = 0; i < 6; i++) {
      if (vox.has(key + OFFSETS[i])) continue;
      const { n, c } = FACES[i], ao = [0, 0, 0, 0];
      for (let k = 0; k < 4; k++) {
        const [s1, s2, corner] = CORNER_AO[i][k], n1 = vox.has(key + s1), n2 = vox.has(key + s2);
        // Painted look: darker at the bottom of the model, lighter at the top, darker in the corners.
        const lift = 0.84 + 0.22 * ((y + c[k][1] - minY) / span);
        ao[k] = AO[n1 && n2 ? 3 : n1 + n2 + vox.has(key + corner)] * lift;
        const p = f * 12 + k * 3;
        pos[p] = (x + c[k][0]) * size;
        pos[p + 1] = (y + c[k][1]) * size;
        pos[p + 2] = (z + c[k][2]) * size;
        nor[p] = n[0];
        nor[p + 1] = n[1];
        nor[p + 2] = n[2];
        col[p] = r * j * ao[k];
        col[p + 1] = g * j * ao[k];
        col[p + 2] = b * j * ao[k];
      }
      const v = f * 4;
      // Split the quad along the diagonal that keeps the shading smooth.
      if (ao[0] + ao[2] >= ao[1] + ao[3]) idx.set([v, v + 1, v + 2, v, v + 2, v + 3], f * 6);
      else idx.set([v + 1, v + 2, v + 3, v + 1, v + 3, v], f * 6);
      f++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return geo;
}

const material = new THREE.MeshLambertMaterial({ vertexColors: true });

export const buildMesh = (vox, size = 1) => new THREE.Mesh(buildGeometry(vox, size), material);
