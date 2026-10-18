// Little life on every island: pigeons that fly away when you get close, seagulls in the sky,
// butterflies on the flowers and fish jumping out of the sea.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { part, WATER_LEVEL } from './world.js';
import { textured } from './textures.js';

const MAT = textured();
const box = (w, h, d, x, y, z, c) => part(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c);
const mesh = (geos) => new THREE.Mesh(mergeGeometries(geos), MAT);
const rnd = (a, b) => a + Math.random() * (b - a);
const turn = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * Math.min(1, k);

// A bird with two wings that flap (front = +z).
function bird(body, wing, scale) {
  const g = new THREE.Group();
  g.add(mesh([box(0.3, 0.3, 0.5, 0, 0.25, 0, body), box(0.24, 0.24, 0.24, 0, 0.47, 0.27, body), box(0.08, 0.06, 0.16, 0, 0.44, 0.45, '#f0a830'), box(0.2, 0.06, 0.25, 0, 0.3, -0.34, wing)]));
  g.userData.wings = [-1, 1].map((side) => {
    const w = new THREE.Mesh(box(0.55, 0.05, 0.32, side * 0.27, 0, 0, wing), MAT);
    w.position.set(side * 0.13, 0.33, 0);
    g.add(w);
    return w;
  });
  g.scale.setScalar(scale);
  return g;
}
const flap = (b, a, fold = 1) => b.userData.wings.forEach((w, i) => ((w.rotation.z = (i ? -1 : 1) * a), (w.scale.x = fold)));

function butterfly(color) {
  const g = new THREE.Group();
  g.add(mesh([box(0.05, 0.05, 0.25, 0, 0, 0, '#333333')]));
  g.userData.wings = [-1, 1].map((side) => {
    const w = new THREE.Mesh(box(0.28, 0.02, 0.3, side * 0.14, 0, 0, color), MAT);
    g.add(w);
    return w;
  });
  return g;
}

const fish = () => mesh([box(0.25, 0.4, 0.8, 0, 0, 0, '#9fb6c8'), box(0.06, 0.4, 0.3, 0, 0, -0.5, '#7d95a8'), box(0.27, 0.12, 0.5, 0, -0.12, 0.05, '#e8eef2')]);

const dolphin = () => mesh([
  box(0.7, 0.7, 2.4, 0, 0, 0, '#6f8fa8'), box(0.6, 0.25, 2, 0, -0.3, 0.1, '#dfe8ee'), box(0.3, 0.25, 0.6, 0, -0.1, 1.45, '#6f8fa8'), // body, belly, nose
  box(0.12, 0.6, 0.5, 0, 0.55, -0.1, '#5f7f98'), box(0.25, 0.3, 0.8, 0, 0.05, -1.5, '#6f8fa8'), box(1.1, 0.1, 0.4, 0, 0.05, -1.9, '#5f7f98'), // fin, tail
  box(0.72, 0.12, 0.12, 0, 0.15, 0.95, '#1a1a1a'), // eyes
]);

export function createLife({ world, scene, sounds }) {
  const islands = world.islands.map((isl) => {
    const group = new THREE.Group();
    scene.add(group);
    const R = isl.cfg.R, p = isl.plaza;
    const ground = (x, z) => world.surfaceAt(x, z);

    // Pigeons around the plaza.
    const pigeonSpot = () => {
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2, d = p.r + rnd(-1, 5), x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
        if (ground(x, z) > WATER_LEVEL + 0.8) return new THREE.Vector3(x, ground(x, z), z);
      }
      return new THREE.Vector3(p.x, p.y, p.z + p.r);
    };
    const pigeons = Array.from({ length: 7 }, () => {
      const b = bird(Math.random() < 0.7 ? '#8a8f99' : '#5d6168', '#6f747d', 0.9);
      const pos = pigeonSpot();
      b.position.copy(pos);
      b.rotation.y = Math.random() * 6;
      group.add(b);
      return { b, pos, state: 'ground', t: rnd(0, 3), target: null };
    });

    // Seagulls circling high over the island.
    const gulls = Array.from({ length: 3 }, (_, i) => {
      const b = bird('#ffffff', '#d5d8dc', 2);
      group.add(b);
      return { b, a: (i / 3) * Math.PI * 2, r: R * rnd(0.6, 1.1), h: rnd(18, 26), w: rnd(0.12, 0.2) * (i % 2 ? 1 : -1) };
    });

    // Butterflies over the flowers.
    const flowers = isl.flowerSpots;
    const butterflies = flowers.length
      ? Array.from({ length: 6 }, (_, i) => {
          const b = butterfly(['#ffeb3b', '#ffffff', '#ff7043', '#4fc3f7', '#ba68c8'][i % 5]);
          const [x, z] = flowers[Math.floor(Math.random() * flowers.length)];
          group.add(b);
          return { b, home: new THREE.Vector3(x, 0, z), phase: Math.random() * 10 };
        })
      : [];

    // Fish jumping near the coast.
    const fishes = Array.from({ length: 2 }, () => {
      const m = fish();
      m.visible = false;
      group.add(m);
      return { m, wait: rnd(1, 8), t: 0, from: new THREE.Vector3(), dir: 0 };
    });

    return { isl, group, pigeons, gulls, butterflies, fishes, pigeonSpot };
  });

  // Dolphins: a little pod that swims and jumps next to the boat in the open sea.
  const pod = Array.from({ length: 3 }, (_, i) => {
    const m = dolphin();
    m.visible = false;
    scene.add(m);
    return { m, side: i % 2 ? -1 : 1, off: 5 + i * 1.8, ahead: 2 - i * 3, phase: i * 1.3 };
  });
  let podTime = 0, podIn = 0;

  const last = new THREE.Vector3();
  let gullCry = 5;

  function update(dt, t, player) {
    const pp = player.position;
    const raw = Math.hypot(pp.x - last.x, pp.z - last.z) / Math.max(dt, 1e-3);
    const speed = raw > 30 ? 0 : Math.min(raw, 10); // > 30: a teleport, not a run
    last.copy(pp);
    const onFoot = !player.vehicle;

    for (const L of islands) {
      L.group.visible = L.isl.group.visible;
      if (!L.group.visible || Math.hypot(L.isl.center.x - pp.x, L.isl.center.z - pp.z) > 160) continue;
      const near = (v, d) => Math.hypot(v.x - pp.x, v.z - pp.z) < d;

      // Pigeons: peck around, fly off when Atlas comes close (from further away if he runs).
      let scared = false;
      for (const g of L.pigeons) {
        const b = g.b;
        if (g.state === 'ground') {
          g.t -= dt;
          b.children[0].rotation.x = Math.max(0, Math.sin(t * 9 + b.id)) * 0.35; // pecking
          flap(b, 0, 0.4); // wings folded
          if (g.t < 0) (g.t = rnd(1, 4)), (b.rotation.y += rnd(-1.5, 1.5));
          if (onFoot && (near(g.pos, 3) || (speed > 6 && near(g.pos, 7)))) {
            g.state = 'air';
            g.t = rnd(5, 9);
            const away = Math.atan2(g.pos.x - pp.x, g.pos.z - pp.z) + rnd(-0.6, 0.6);
            g.target = g.pos.clone().add(new THREE.Vector3(Math.sin(away) * 14, rnd(8, 13), Math.cos(away) * 14));
            scared = true;
          }
        } else {
          g.t -= dt;
          if (g.state === 'air' && g.t < 0) (g.state = 'down'), (g.target = L.pigeonSpot());
          if (g.state === 'air' && g.pos.distanceTo(g.target) < 2) // circle around while waiting
            g.target.set(g.target.x + rnd(-8, 8), g.target.y, g.target.z + rnd(-8, 8));
          const d = g.target.clone().sub(g.pos), len = d.length();
          if (g.state === 'down' && len < 0.3) {
            g.state = 'ground';
            g.pos.copy(g.target);
          } else g.pos.addScaledVector(d, Math.min(1, (9 * dt) / Math.max(len, 1e-3)));
          b.rotation.y = turn(b.rotation.y, Math.atan2(d.x, d.z), dt * 8);
          b.children[0].rotation.x = 0;
          flap(b, Math.sin(t * 30 + b.id) * 0.9);
        }
        b.position.copy(g.pos);
      }
      if (scared) sounds.flutter();

      for (const g of L.gulls) {
        g.a += g.w * dt;
        const c = L.isl.center;
        g.b.position.set(c.x + Math.sin(g.a) * g.r, g.h + Math.sin(t + g.a) * 1.5, c.z + Math.cos(g.a) * g.r);
        g.b.rotation.set(0, g.a + (g.w > 0 ? Math.PI / 2 : -Math.PI / 2), g.w > 0 ? -0.25 : 0.25);
        flap(g.b, Math.sin(t * 4 + g.a * 10) > 0.6 ? Math.sin(t * 14) * 0.6 : 0.1); // glide, flap now and then
      }

      for (const f of L.butterflies) {
        if (near(f.home, 2) && onFoot) { // shy: fly to another flower
          const [x, z] = L.isl.flowerSpots[Math.floor(Math.random() * L.isl.flowerSpots.length)];
          f.home.set(x, 0, z);
        }
        const tt = t * 0.8 + f.phase, b = f.b;
        const x = f.home.x + Math.sin(tt * 1.3) * 1.5, z = f.home.z + Math.cos(tt * 0.9) * 1.5;
        const dx = x - b.position.x, dz = z - b.position.z;
        b.position.x += dx * Math.min(1, dt * 2);
        b.position.z += dz * Math.min(1, dt * 2);
        b.position.y = world.surfaceAt(b.position.x, b.position.z) + 0.8 + Math.sin(tt * 3) * 0.3;
        if (dx * dx + dz * dz > 1e-4) b.rotation.y = Math.atan2(dx, dz);
        b.userData.wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * Math.sin(t * 22 + f.phase) * 1.1));
      }

      for (const f of L.fishes) {
        if ((f.wait -= dt) > 0) continue;
        if (!f.m.visible) {
          const a = Math.random() * Math.PI * 2, d = L.isl.cfg.R * rnd(1.05, 1.3);
          const x = L.isl.center.x + Math.sin(a) * d, z = L.isl.center.z + Math.cos(a) * d;
          if (world.surfaceAt(x, z) > WATER_LEVEL - 1) { f.wait = 0.5; continue; }
          f.from.set(x, WATER_LEVEL, z);
          f.dir = Math.random() * Math.PI * 2;
          f.t = 0;
          f.m.visible = true;
          if (near(f.from, 30)) sounds.splash();
        }
        f.t += dt / 1.1;
        const k = Math.min(f.t, 1);
        f.m.position.set(f.from.x + Math.sin(f.dir) * k * 4, WATER_LEVEL - 0.3 + Math.sin(k * Math.PI) * 2.6, f.from.z + Math.cos(f.dir) * k * 4);
        f.m.rotation.set(-Math.cos(k * Math.PI) * 1.1, f.dir, 0);
        if (k >= 1) {
          f.m.visible = false;
          f.wait = rnd(3, 10);
          if (near(f.m.position, 30)) sounds.splash();
        }
      }
    }

    // Dolphins join after a few seconds of fast sailing far from the islands, and leave near the coast.
    const v = player.vehicle;
    const sailing = v?.kind === 'boat' && Math.abs(v.speed) > 6 && !world.islands.some((i) => Math.hypot(i.center.x - v.pos.x, i.center.z - v.pos.z) < i.cfg.R * 1.8);
    podTime = sailing ? podTime + dt : 0;
    podIn = THREE.MathUtils.clamp(podIn + (podTime > 4 ? dt : -dt) * 0.5, 0, 1);
    for (const d of pod) {
      d.m.visible = podIn > 0 && !!v?.pos;
      if (!d.m.visible) continue;
      const fx = Math.sin(v.heading), fz = Math.cos(v.heading), off = d.off + (1 - podIn) * 25; // swim in from the side
      const jump = Math.sin(t * 2.4 + d.phase), k = Math.max(0, jump);
      d.m.position.set(v.pos.x + fz * off * d.side + fx * d.ahead, WATER_LEVEL - 0.8 + k * 2.2 - (1 - podIn) * 2, v.pos.z - fx * off * d.side + fz * d.ahead);
      d.m.rotation.set(-Math.cos(t * 2.4 + d.phase) * (jump > 0 ? 0.7 : 0.2), v.heading, 0, 'YXZ');
      if (jump > 0.99 && podIn > 0.9 && Math.random() < 0.05) sounds.splash();
    }

    // A seagull cries now and then when you are near the sea.
    if ((gullCry -= dt) < 0) {
      gullCry = rnd(6, 14);
      if (islands.some((L) => L.group.visible && Math.hypot(L.isl.center.x - pp.x, L.isl.center.z - pp.z) < L.isl.cfg.R * 1.4)) sounds.gull();
    }
  }

  return { update, islands };
}
