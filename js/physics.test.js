// Run with: npm test
import assert from 'node:assert';
import { resolve, platformAt, hitTest } from './physics.js';

const near = (a, b) => Math.abs(a - b) < 1e-6;

// Walking into a tree trunk pushes you to its edge.
let p = { x: 0.5, y: 0, z: 0 };
resolve(p, 0.4, [{ x: 0, z: 0, r: 0.5, top: 5 }]);
assert.ok(near(Math.hypot(p.x, p.z), 0.9), 'pushed out of circle');

// Walking into a wall box from the left stops at its side.
p = { x: -0.2, y: 0, z: 0.5 };
resolve(p, 0.4, [{ x0: 0, z0: 0, x1: 2, z1: 1, top: 3 }]);
assert.ok(near(p.x, -0.4), 'pushed out of box side');

// Centre inside a box: leave by the closest side.
p = { x: 1.9, y: 0, z: 0.5 };
resolve(p, 0.4, [{ x0: 0, z0: 0, x1: 2, z1: 1, top: 3 }]);
assert.ok(near(p.x, 2.4), 'left by the nearest side');

// Above a low hedge you stand on it instead of being pushed.
p = { x: 1, y: 1.3, z: 0.5 };
const ground = resolve(p, 0.4, [{ x0: 0, z0: 0, x1: 2, z1: 1, top: 1.2 }]);
assert.equal(ground, 1.2);
assert.equal(p.x, 1);

// The plane hits a tall tower but flies over a low hedge; walkers ignore "air" colliders.
const tower = { x: 0, z: 0, r: 2, top: 30 };
assert.equal(hitTest({ x: 4, y: 10, z: 0 }, 3, [tower]), tower);
assert.equal(hitTest({ x: 4, y: 40, z: 0 }, 3, [tower]), null);
p = { x: 0.5, y: 0, z: 0 };
resolve(p, 0.4, [{ ...tower, air: true }]);
assert.equal(p.x, 0.5);

assert.equal(platformAt(1, 1, [{ x0: 0, z0: 0, x1: 2, z1: 5, top: 1.4, platform: true }]), 1.4);
assert.equal(platformAt(3, 1, [{ x0: 0, z0: 0, x1: 2, z1: 5, top: 1.4, platform: true }]), -Infinity);

console.log('physics tests ok');
