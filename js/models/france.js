import { createVoxels, set, box, buildMesh } from '../voxel.js';

const IRON = '#7a5c3e';
const DECK = '#5e4630';
const LIGHT = '#e8c66a';

// Hollow square ring with diagonal holes: gives the "iron lattice" look.
function lattice(vox, cx, y, cz, t, color) {
  const x0 = Math.round(cx - t), x1 = Math.round(cx + t);
  const z0 = Math.round(cz - t), z1 = Math.round(cz + t);
  for (let x = x0; x <= x1; x++)
    for (let z = z0; z <= z1; z++) {
      const edgeX = x === x0 || x === x1, edgeZ = z === z0 || z === z1;
      if (!edgeX && !edgeZ) continue;
      if (!(edgeX && edgeZ) && (x + y + z) % 3 === 0) continue;
      set(vox, x, y, z, color);
    }
}

// Colliders (world units, relative to the tower centre): the four legs + the upper tower for the plane.
export const EIFFEL_COLLIDERS = [
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ x0: sx * 10.75 - 3, x1: sx * 10.75 + 3, z0: sz * 10.75 - 3, z1: sz * 10.75 + 3, top: 18 }))),
  { x0: -14, z0: -14, x1: 14, z1: 14, top: 16, air: true },
  { x: 0, z: 0, r: 7, top: 36, air: true },
  { x: 0, z: 0, r: 2.5, top: 60, air: true },
];

// Eiffel Tower, ~56 units tall. K = detail: voxels per half unit (higher = smaller cubes).
export function eiffelTower(K = 2) {
  const vox = createVoxels();
  const H = 110 * K;
  const legDist = (y) => (1.5 + 20 * Math.pow(1 - y / H, 2.2)) * K; // legs bend towards the centre
  const legThick = (y) => (1.5 + 4.5 * (1 - y / (52 * K))) * K;

  for (let y = 0; y < 100 * K; y++) {
    const w = legDist(y);
    if (y < 52 * K) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) lattice(vox, sx * w, y, sz * w, legThick(y), IRON);
    } else {
      lattice(vox, 0, y, 0, w + 0.5 * K, IRON);
    }
  }

  // The big arches between the legs, on all four sides.
  const A = 16 * K;
  for (let s = -A; s <= A; s++) {
    const y = Math.round((20 - 12 * (s / A) ** 2) * K);
    const w = Math.round(legDist(y));
    for (let dy = 0; dy < 2 * K; dy++)
      for (const side of [-w, w]) {
        set(vox, s, y + dy, side, IRON);
        set(vox, side, y + dy, s, IRON);
      }
  }

  // First and second floor platforms, with golden lights on the edge.
  for (const [fy, fh] of [[28, 17], [56, 8]]) {
    const y = fy * K, half = fh * K;
    box(vox, -half, y, -half, half, y + K - 1, half, DECK);
    for (let i = -half; i <= half; i += 2) {
      set(vox, i, y + K, -half, LIGHT);
      set(vox, i, y + K, half, LIGHT);
      set(vox, -half, y + K, i, LIGHT);
      set(vox, half, y + K, i, LIGHT);
    }
  }

  // Top: viewing cabin and antenna.
  const T = 100 * K;
  box(vox, -3 * K, T, -3 * K, 3 * K, T + 2 * K - 1, 3 * K, DECK);
  box(vox, -2 * K, T + 2 * K, -2 * K, 2 * K, T + 5 * K - 1, 2 * K, LIGHT);
  box(vox, -2 * K, T + 5 * K, -2 * K, 2 * K, T + 6 * K - 1, 2 * K, DECK);
  box(vox, 0, T + 6 * K, 0, 0, T + 14 * K, 0, '#c9c9c9');

  const mesh = buildMesh(vox, 0.5 / K);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
