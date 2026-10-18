// A food stall on every island, with a cook behind the counter. Press E to taste the local food
// (texts in data/facts.js – FOODS). Also exports freeSpot(), to find an empty place near the plaza.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { part } from './world.js';
import { textured } from './textures.js';
import { createCharacter } from './models/character.js';
import { FOODS } from './data/facts.js';

const AWNING = {
  france: ['#1f4fa3', '#ffffff'], belgium: ['#fdda24', '#ef3340'], netherlands: ['#ff7f00', '#ffffff'], uk: ['#c8102e', '#ffffff'],
  germany: ['#dd0000', '#ffce00'], spain: ['#aa151b', '#f1bf00'], italy: ['#009246', '#ffffff'], greece: ['#0d5eaf', '#ffffff'],
};
const box = (w, h, d, x, y, z, c) => part(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z), c);

// An empty, flat place at distance rMin..rMax from the plaza, `clear` metres from any collider.
// y is the real ground height there (the lowest point under a ~1.6 m footprint).
export function freeSpot(world, isl, rMin, rMax, clear, tries = 200) {
  const p = isl.plaza;
  for (let i = 0; i < tries; i++) {
    const a = Math.random() * Math.PI * 2, d = rMin + Math.random() * (rMax - rMin);
    const x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d, y = world.surfaceAt(x, z);
    if (y < 1.8 || isl.zone(x, z) || !isl.isLand(x, z)) continue;
    const ys = [[0, 0], [-1.6, 0], [1.6, 0], [0, -1.6], [0, 1.6], [-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].map(([dx, dz]) => world.surfaceAt(x + dx, z + dz));
    if (Math.max(...ys) - Math.min(...ys) > 0.6) continue;
    const far = isl.colliders.every((c) =>
      c.r !== undefined
        ? Math.hypot(x - c.x, z - c.z) - c.r > clear
        : Math.hypot(Math.max(c.x0 - x, 0, x - c.x1), Math.max(c.z0 - z, 0, z - c.z1)) > clear);
    if (far) return { x, y: Math.min(...ys) - 0.05, z }; // the lowest point: what stands here touches the ground all round
  }
  return null;
}

function sign(text, bg) {
  const c = Object.assign(document.createElement('canvas'), { width: 512, height: 128 }), g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#ffffff';
  g.fillRect(8, 8, 496, 112);
  g.fillStyle = '#222222';
  g.font = 'bold 64px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), new THREE.MeshBasicMaterial({ map: tex }));
}

function stall(id) {
  const [a, b] = AWNING[id], g = [];
  g.push(box(3, 1.1, 1.2, 0, 0, 0.3, '#a0714a'), box(3.2, 0.12, 1.4, 0, 1.1, 0.3, '#c8a27a')); // counter
  for (const x of [-1.45, 1.45]) for (const z of [-1, 0.85]) g.push(box(0.12, 2.6, 0.12, x, 0, z, '#6b4a30'));
  g.push(box(3, 2.4, 0.1, 0, 0, -1.05, '#8d6240')); // back wall
  for (let i = 0; i < 6; i++) g.push(part(new THREE.BoxGeometry(0.52, 0.1, 2.6).rotateX(-0.25).translate(-1.3 + i * 0.52, 2.75, -0.05), i % 2 ? b : a));
  for (let i = 0; i < 5; i++) g.push(box(0.35, 0.25, 0.35, -1 + i * 0.5, 1.22, 0.4, ['#e0a85a', '#c97b3c', '#f2d29b'][i % 3])); // food on the counter
  const m = new THREE.Mesh(mergeGeometries(g), textured());
  m.castShadow = m.receiveShadow = true;
  const group = new THREE.Group();
  const s = sign(`${FOODS[id].icon} ${FOODS[id].food}`, a);
  s.position.set(0, 3.45, 1.32);
  s.rotation.x = -0.1;
  group.add(m, s);
  return group;
}

export function createKiosks({ world }) {
  const list = [];
  for (const isl of world.islands) {
    const id = isl.cfg.id, spot = freeSpot(world, isl, isl.plaza.r + 4, isl.plaza.r + 14, 3.5);
    if (!spot || !FOODS[id]) continue;
    const p = isl.plaza, heading = Math.atan2(p.x - spot.x, p.z - spot.z); // the counter looks at the plaza
    const group = stall(id);
    group.position.set(spot.x - isl.center.x, spot.y, spot.z - isl.center.z);
    group.rotation.y = heading;
    const cook = createCharacter({ hairStyle: 'short', bottom: 'long', hat: 'chef', hatColor: '#ffffff', top: 'apron', shirt: '#f4f1ea', pants: '#3a3a3a', skin: '#e0ac80', seed: 7 + isl.cfg.seed });
    cook.group.position.set(0, 0, -0.45);
    group.add(cook.group);
    isl.group.add(group);
    isl.colliders.push({ x: spot.x, z: spot.z, r: 1.6, top: spot.y + 3 });
    // You buy from the front of the counter.
    list.push({ id, isl, cook, ...FOODS[id], x: spot.x + Math.sin(heading) * 2, z: spot.z + Math.cos(heading) * 2 });
  }
  return {
    list,
    update(dt) {
      for (const k of list) if (k.isl.group.visible) k.cook.animate(dt, {});
    },
  };
}
