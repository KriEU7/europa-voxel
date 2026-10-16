// People walking around each island. They wander near the plaza and talk when you press E.
// Names and sentences are in data/facts.js (`PEOPLE`), clothes are here.
import * as THREE from 'three';
import { createCharacter } from './models/character.js';
import { resolve } from './physics.js';
import { WATER_LEVEL } from './world.js';

const SKINS = ['#f1c27d', '#e0ac80', '#c68642', '#f5d0b0', '#8d5524'];

const LOOKS = {
  france: [
    { hat: 'chef', hatColor: '#ffffff', top: 'apron', shirt: '#f4f1ea', pants: '#333a4a', baguette: true, hair: '#3b2a1a', beard: true },
    { hat: 'beret', hatColor: '#1a1a1a', top: 'striped', shirt: '#1c2f5e', stripe: '#ffffff', pants: '#2b2b2b', hair: '#222222' },
    { hat: 'cap', hatColor: '#e74c3c', top: 'tshirt', shirt: '#f39c12', bottom: 'shorts', pants: '#8d6e63', camera: true, hair: '#c9a15b' },
    { top: 'dress', shirt: '#c0392b', bottom: 'skirt', hairStyle: 'long', hair: '#2b1b10' },
  ],
  belgium: [
    { hat: 'chef', hatColor: '#ffffff', top: 'apron', shirt: '#6d4c41', pants: '#3e2723', hair: '#5d4037' },
    { top: 'tshirt', shirt: '#fdda24', pants: '#1a1a1a', backpack: true, hair: '#c9a15b', hairStyle: 'messy' },
    { hat: 'cap', hatColor: '#ef3340', top: 'tshirt', shirt: '#ffffff', bottom: 'shorts', pants: '#1f3264', hair: '#3b2a1a' },
    { top: 'dress', shirt: '#7b1fa2', bottom: 'skirt', hairStyle: 'bun', hair: '#8d5524' },
  ],
  netherlands: [
    { hat: 'cap', hatColor: '#ff7f00', top: 'tshirt', shirt: '#ff7f00', bottom: 'shorts', pants: '#21468b', hair: '#e8c170' },
    { hat: 'sunhat', hatColor: '#e6c27a', top: 'tshirt', shirt: '#4a7fc1', pants: '#2f5a8a', hair: '#a0522d', beard: true },
    { top: 'dress', shirt: '#fdd835', bottom: 'skirt', hairStyle: 'long', hair: '#f0d58c' },
    { top: 'striped', shirt: '#ae1c28', stripe: '#ffffff', pants: '#21468b', hair: '#5d4037' },
  ],
  uk: [
    { hat: 'busby', top: 'tshirt', shirt: '#c0392b', pants: '#111111', shoes: '#111111', hair: '#3b2a1a', long: true },
    { hat: 'cap', hatColor: '#7a6a55', top: 'tshirt', shirt: '#2e7d32', pants: '#5d4e3a', hair: '#9e9e9e', beard: true },
    { hat: 'sunhat', hatColor: '#f8bbd0', top: 'dress', shirt: '#4fc3f7', bottom: 'skirt', hairStyle: 'bun', hair: '#d7a86e' },
    { top: 'tshirt', shirt: '#012169', bottom: 'shorts', pants: '#c8102e', backpack: true, hair: '#c97b3c', hairStyle: 'messy' },
  ],
  germany: [
    { hat: 'cap', hatColor: '#2e7d32', top: 'tshirt', shirt: '#ffffff', bottom: 'shorts', pants: '#6d4c41', hair: '#e8c170', beard: true },
    { hat: 'chef', hatColor: '#ffffff', top: 'apron', shirt: '#f4f1ea', pants: '#424242', hair: '#5d4037' },
    { top: 'dress', shirt: '#2e7d32', bottom: 'skirt', hairStyle: 'bun', hair: '#e8c170' },
    { top: 'tshirt', shirt: '#dd0000', pants: '#1a1a1a', backpack: true, hair: '#3b2a1a' },
  ],
  spain: [
    { top: 'dress', shirt: '#d32f2f', bottom: 'skirt', hairStyle: 'bun', hair: '#1a1a1a' },
    { hat: 'chef', hatColor: '#ffffff', top: 'apron', shirt: '#ffe082', pants: '#5d4037', hair: '#2b1b10', beard: true },
    { top: 'tshirt', shirt: '#aa151b', bottom: 'shorts', pants: '#1f3264', hair: '#2b1b10', hairStyle: 'messy' },
    { hat: 'sunhat', hatColor: '#f1bf00', top: 'tshirt', shirt: '#ffffff', bottom: 'shorts', pants: '#4fc3f7', camera: true, hair: '#d7a86e' },
  ],
  italy: [
    { hat: 'sunhat', hatColor: '#e6c27a', top: 'striped', shirt: '#1c2f5e', stripe: '#ffffff', pants: '#1a1a1a', hair: '#2b1b10' },
    { hat: 'chef', hatColor: '#ffffff', top: 'apron', shirt: '#f4f1ea', pants: '#424242', hair: '#1a1a1a', beard: true },
    { top: 'dress', shirt: '#009246', bottom: 'skirt', hairStyle: 'long', hair: '#3b2a1a' },
    { hat: 'cap', hatColor: '#1e88e5', top: 'tshirt', shirt: '#1e88e5', bottom: 'shorts', pants: '#ffffff', hair: '#5d4037' },
  ],
  greece: [
    { hat: 'cap', hatColor: '#0d5eaf', top: 'tshirt', shirt: '#ffffff', pants: '#0d5eaf', hair: '#9e9e9e', beard: true },
    { top: 'dress', shirt: '#ffffff', bottom: 'skirt', hairStyle: 'bun', hair: '#1a1a1a' },
    { hat: 'sunhat', hatColor: '#e6c27a', top: 'tshirt', shirt: '#8a9a5b', pants: '#5d4e3a', hair: '#3b2a1a' },
    { top: 'tshirt', shirt: '#0d5eaf', bottom: 'shorts', pants: '#ffffff', camera: true, hair: '#c9a15b', hairStyle: 'messy' },
  ],
};

const SPEED = 1.6;

export function createNPCs(world, scene, PEOPLE) {
  const npcs = [];
  for (const isl of world.islands) {
    const people = PEOPLE[isl.cfg.id] ?? [];
    people.forEach((info, i) => {
      const look = LOOKS[isl.cfg.id]?.[i % 4] ?? {};
      const full = { hairStyle: 'short', bottom: 'long', skin: SKINS[(i + isl.cfg.seed) % SKINS.length], ...look, seed: i * 13 + isl.cfg.seed };
      const ch = createCharacter(full);
      const a = (i / people.length) * Math.PI * 2 + 0.5;
      const home = new THREE.Vector3(isl.plaza.x + Math.sin(a) * (isl.plaza.r + 3), 0, isl.plaza.z + Math.cos(a) * (isl.plaza.r + 3));
      home.y = world.surfaceAt(home.x, home.z);
      ch.group.position.copy(home);
      scene.add(ch.group);
      npcs.push({ ...info, index: i, look: full, ch, isl, home, pos: home.clone(), heading: a, target: null, wait: Math.random() * 3, talk: 0 });
    });
  }

  const okSpot = (isl, x, z) => {
    const y = world.surfaceAt(x, z);
    return y > WATER_LEVEL + 0.5 && isl.zone(x, z) !== 'runway';
  };

  function update(dt, player, dynamicColliders) {
    for (const n of npcs) {
      n.ch.group.visible = n.isl.group.visible;
      if (Math.hypot(n.pos.x - player.x, n.pos.z - player.z) > 150) continue; // far away: freeze
      let moving = false;
      if (n.talk > 0) {
        n.talk -= dt;
        const want = Math.atan2(player.x - n.pos.x, player.z - n.pos.z);
        n.heading += Math.atan2(Math.sin(want - n.heading), Math.cos(want - n.heading)) * Math.min(1, dt * 6);
      } else if (n.wait > 0) {
        n.wait -= dt;
      } else if (!n.target) {
        const a = Math.random() * Math.PI * 2, d = 4 + Math.random() * 16;
        const x = n.home.x + Math.sin(a) * d, z = n.home.z + Math.cos(a) * d;
        if (okSpot(n.isl, x, z)) n.target = new THREE.Vector3(x, 0, z);
      } else {
        const dx = n.target.x - n.pos.x, dz = n.target.z - n.pos.z, dist = Math.hypot(dx, dz);
        if (dist < 0.5) (n.target = null), (n.wait = 2 + Math.random() * 5);
        else {
          const want = Math.atan2(dx, dz);
          n.heading += Math.atan2(Math.sin(want - n.heading), Math.cos(want - n.heading)) * Math.min(1, dt * 5);
          const nx = n.pos.x + Math.sin(n.heading) * SPEED * dt, nz = n.pos.z + Math.cos(n.heading) * SPEED * dt;
          if (okSpot(n.isl, nx, nz)) {
            const before = n.pos.clone();
            n.pos.x = nx;
            n.pos.z = nz;
            resolve(n.pos, 0.4, world.collidersNear(n.pos.x, n.pos.z));
            resolve(n.pos, 0.4, dynamicColliders.filter((c) => c.owner !== n));
            // Stuck against something: choose another place.
            if (before.distanceTo(n.pos) < SPEED * dt * 0.3) n.target = null;
            moving = true;
          } else n.target = null;
        }
      }
      n.pos.y = world.surfaceAt(n.pos.x, n.pos.z);
      n.ch.group.position.copy(n.pos);
      n.ch.group.rotation.y = n.heading;
      n.ch.animate(dt, { speed: moving ? SPEED / 4.5 : 0 });
    }
  }

  return {
    list: npcs,
    update,
    colliders: () => npcs.filter((n) => n.ch.group.visible).map((n) => ({ x: n.pos.x, z: n.pos.z, r: 0.45, top: n.pos.y + 2, owner: n })),
    // Stop and look at Atlas for some seconds (Infinity while the dialog is open, 0 to let go).
    talk(n, seconds = 6) { n.talk = seconds; n.target = null; },
  };
}
