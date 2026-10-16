// Simple 2D collisions seen from above, with a height for each object.
// Collider: circle { x, z, r, top } or box { x0, z0, x1, z1, top }.
// If the feet are above `top - STEP` you stand on it (hedges, piers), otherwise it pushes you away.

export const STEP = 0.6;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Moves `pos` out of the colliders. Returns the highest top you are standing on (or -Infinity).
export function resolve(pos, radius, colliders) {
  let ground = -Infinity;
  for (const c of colliders) {
    if (c.air) continue; // only for the plane
    if (c.r !== undefined) {
      const dx = pos.x - c.x, dz = pos.z - c.z, min = radius + c.r, d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      if (pos.y >= c.top - STEP) { ground = Math.max(ground, c.top); continue; }
      const d = Math.sqrt(d2) || 1e-4;
      pos.x = c.x + (dx / d) * min;
      pos.z = c.z + (dz / d) * min;
    } else {
      const cx = clamp(pos.x, c.x0, c.x1), cz = clamp(pos.z, c.z0, c.z1);
      const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      if (pos.y >= c.top - STEP) { ground = Math.max(ground, c.top); continue; }
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
      } else {
        // Centre inside the box: leave by the closest side.
        const exits = [[c.x0 - radius - pos.x, 0], [c.x1 + radius - pos.x, 0], [0, c.z0 - radius - pos.z], [0, c.z1 + radius - pos.z]];
        const [ex, ez] = exits.reduce((a, b) => (Math.abs(a[0] + a[1]) < Math.abs(b[0] + b[1]) ? a : b));
        pos.x += ex;
        pos.z += ez;
      }
    }
  }
  return ground;
}

// First collider touched by a flying object of the given radius (the plane), or null.
export function hitTest(pos, radius, colliders) {
  for (const c of colliders) {
    if (c.platform || pos.y > c.top) continue;
    const d = c.r !== undefined
      ? Math.hypot(pos.x - c.x, pos.z - c.z) - c.r
      : Math.hypot(pos.x - clamp(pos.x, c.x0, c.x1), pos.z - clamp(pos.z, c.z0, c.z1));
    if (d < radius) return c;
  }
  return null;
}

// Top of the highest platform under a point (used to walk on piers over the water).
export function platformAt(x, z, colliders) {
  let top = -Infinity;
  for (const c of colliders)
    if (c.platform && x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1) top = Math.max(top, c.top);
  return top;
}
