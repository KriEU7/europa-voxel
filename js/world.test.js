// Run with: npm test
// Every boat trip between two islands must stay on the water.
import assert from 'node:assert';
import { createWorld, WATER_LEVEL } from './world.js';

const world = createWorld();
const harbours = world.islands.filter((i) => i.boatSpot);
assert.ok(harbours.length >= 2 && world.islands.filter((i) => i.planeSpot).length >= 2, 'boats and planes both have somewhere to go');
assert.ok(world.islands.every((i) => i.boatSpot || i.planeSpot), 'every island can be reached');
for (const from of harbours)
  for (const to of harbours) {
    if (from === to) continue;
    let prev = { x: from.boatSpot.x, z: from.boatSpot.z };
    for (const p of world.boatRoute(from, to)) {
      const len = Math.hypot(p.x - prev.x, p.z - prev.z);
      for (let d = 0; d <= len; d += 2) {
        const x = prev.x + ((p.x - prev.x) * d) / len, z = prev.z + ((p.z - prev.z) * d) / len;
        assert.ok(world.surfaceAt(x, z) < WATER_LEVEL - 0.3, `boat ${from.cfg.id} -> ${to.cfg.id} hits land at ${x.toFixed(0)}, ${z.toFixed(0)}`);
      }
      prev = p;
    }
  }
console.log('world tests ok');
