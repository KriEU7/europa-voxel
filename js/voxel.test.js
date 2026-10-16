// Run with: npm test
import assert from 'node:assert';
import { createVoxels, set, box, buildGeometry, FACES } from './voxel.js';

// Every face must wind counter-clockwise around its normal, or it renders invisible.
for (const { n, c } of FACES) {
  const [a, b, d] = c;
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
  const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  assert.ok(cross[0] * n[0] + cross[1] * n[1] + cross[2] * n[2] > 0, `bad winding for ${n}`);
}

const one = createVoxels();
set(one, 0, 0, 0, '#ff0000');
assert.equal(buildGeometry(one).index.count, 6 * 6, 'single cube = 6 faces');
assert.ok(buildGeometry(one).attributes.color.getZ(0) < 0.01, 'a red cube stays red (no blue)');

const two = createVoxels();
box(two, 0, 0, 0, 1, 0, 0, '#ff0000');
assert.equal(buildGeometry(two).index.count, 10 * 6, 'touching faces are culled');

// Ambient occlusion: a cube standing on a floor is darker where it touches the floor.
const floor = createVoxels();
box(floor, -1, 0, -1, 1, 0, 1, '#ffffff');
set(floor, 0, 1, 0, '#ffffff');
const g = buildGeometry(floor), P = g.attributes.position, C = g.attributes.color;
let low = 1, high = 0;
for (let i = 0; i < P.count; i++) {
  if (P.getX(i) !== 1 || P.getZ(i) < 0 || P.getZ(i) > 1) continue; // +x side of the top cube
  if (P.getY(i) === 1) low = Math.min(low, C.getX(i));
  if (P.getY(i) === 2) high = Math.max(high, C.getX(i));
}
assert.ok(low < high * 0.9, 'corner touching the floor is darker');

console.log('voxel tests ok');
