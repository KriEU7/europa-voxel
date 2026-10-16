// Voxel characters (Atlas and the NPCs) with a jointed rig: hips, knees, shoulders, elbows, neck.
// Parts are built in voxel units (1 = S world units). Feet at y = 0, looking towards +z.
import * as THREE from 'three';
import { createVoxels, set, box, buildGeometry } from '../voxel.js';
import { FLAGS } from '../flags.js';

const S = 0.045;
const material = new THREE.MeshLambertMaterial({ vertexColors: true });

const rand = (seed) => {
  let s = seed * 9301 + 49297;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
};

// ---- Body parts ------------------------------------------------------------------

function shin(o, cx) {
  const v = createVoxels(), x0 = cx - 2, x1 = cx + 1;
  box(v, x0, 0, -2, x1, 0, 2, '#3a2414'); // sole
  box(v, x0, 1, -2, x1, 2, 2, o.shoes);
  set(v, cx - 1, 2, 2, '#e8d8b0'); // laces
  set(v, cx, 2, 2, '#e8d8b0');
  if (o.bottom === 'long') box(v, x0, 3, -2, x1, 7, 1, o.pants);
  else {
    box(v, x0, 3, -2, x1, 6, 1, o.socks);
    if (o.top === 'scout') set(v, cx < 0 ? x0 : x1, 5, 0, '#c0392b'); // scout garter tab
    box(v, x0, 7, -2, x1, 7, 1, o.skin);
  }
  return v;
}

function thigh(o, cx) {
  const v = createVoxels(), x0 = cx - 2, x1 = cx + 1;
  const outer = cx < 0 ? x0 - 1 : x1 + 1;
  if (o.bottom === 'long') box(v, x0, 8, -2, x1, 15, 1, o.pants);
  else if (o.bottom === 'skirt') box(v, x0, 8, -2, x1, 11, 1, o.skin);
  else {
    box(v, x0, 8, -2, x1, 9, 1, o.skin);
    box(v, Math.min(x0, outer), 10, -2, Math.max(x1, outer), 15, 1, o.pants);
    box(v, outer, 12, -1, outer, 13, 0, shade(o.pants, 0.8)); // side pocket
  }
  return v;
}

function torso(o) {
  const v = createVoxels();
  const shirt = o.shirt;
  box(v, -6, 16, -3, 5, 17, 2, o.top === 'dress' ? shirt : '#3b2a1a'); // belt
  if (o.top !== 'dress') box(v, -1, 16, 2, 0, 17, 2, '#d9b25a');
  for (let y = 18; y <= 28; y++) {
    const c = o.top === 'striped' && y % 2 === 0 ? o.stripe : shirt;
    box(v, -6, y, -3, 5, y, 2, c);
  }
  if (o.top === 'scout') {
    for (const [x0, x1] of [[-5, -3], [2, 4]]) {
      box(v, x0, 21, 2, x1, 23, 2, shade(shirt, 0.88)); // pockets
      box(v, x0, 24, 2, x1, 24, 2, shade(shirt, 0.75)); // flaps
      set(v, x0 + 1, 24, 3, '#f5f5f5');
    }
    for (const y of [19, 21, 23, 25]) set(v, -1, y, 2, '#f5f5f5'); // buttons
    box(v, 2, 19, 2, 3, 19, 2, '#c0392b'); // badges
    set(v, 4, 19, 2, '#27ae60');
  }
  if (o.top === 'apron') {
    box(v, -4, 16, 3, 3, 26, 3, '#f4f1ea');
    box(v, -2, 22, 3, 1, 23, 3, '#e3ddd0');
  }
  const skirt = o.top === 'dress' ? shirt : o.bottom === 'skirt' ? o.pants : null;
  if (skirt) {
    // Flared skirt hanging over the thighs
    for (let y = 9; y <= 15; y++) {
      const w = 6 + Math.round((15 - y) / 3);
      box(v, -w, y, -3 - (15 - y > 3 ? 1 : 0), w - 1, y, 2 + (15 - y > 3 ? 1 : 0), y === 9 ? shade(skirt, 0.8) : skirt);
    }
  }
  // Collar + neck
  box(v, -4, 28, 2, 3, 28, 3, shade(shirt, 1.15));
  box(v, -2, 29, -2, 1, 29, 1, o.skin);
  if (o.scarf) {
    box(v, -4, 28, -3, 3, 28, -3, o.scarf);
    box(v, -4, 27, 3, 3, 27, 3, o.scarf);
    box(v, -3, 26, 3, 2, 26, 3, o.scarf);
    box(v, -2, 25, 3, 1, 25, 3, o.scarf);
    box(v, -1, 24, 3, 0, 24, 3, o.scarf);
    box(v, -1, 26, 4, 0, 26, 4, '#8b5a2b'); // woggle
  }
  if (o.camera) {
    box(v, -2, 22, 3, 1, 24, 4, '#222222');
    set(v, 0, 23, 5, '#5dade2');
    for (let y = 25; y <= 28; y++) set(v, y % 2 ? -3 : 2, y, 3, '#222222');
  }
  if (o.backpack) {
    const BAG = '#c46a2b', DARK = '#9a4f1e';
    box(v, -5, 17, -7, 4, 27, -4, BAG);
    box(v, -5, 25, -8, 4, 28, -4, DARK); // top flap
    for (const x of [-3, 2]) {
      box(v, x, 19, -8, x, 25, -8, '#5a3a1e'); // straps
      set(v, x, 21, -9, '#d9b25a'); // buckles
    }
    box(v, -6, 18, -7, -6, 22, -5, DARK); // side pockets
    box(v, 5, 18, -7, 5, 22, -5, DARK);
    box(v, 5, 23, -6, 5, 25, -6, '#7a1d2e'); // the passport!
    set(v, 5, 24, -5, '#d9b25a');
    box(v, -6, 29, -7, 5, 31, -4, '#2e7d4f'); // sleeping bag roll
    for (const x of [-4, 3]) box(v, x, 29, -8, x, 31, -8, '#5a3a1e');
    for (const x of [-5, -4, 3, 4]) box(v, x, 29, -3, x, 29, 1, '#5a3a1e'); // shoulder straps
  }
  if (o.suspenders)
    for (const x of [-4, 2]) {
      box(v, x, 18, 2, x + 1, 27, 2, o.suspenders);
      box(v, x, 18, -3, x + 1, 27, -3, o.suspenders);
    }
  return v;
}

function upperArm(o, side) {
  const v = createVoxels(), x0 = side < 0 ? -9 : 6, x1 = x0 + 2;
  const sleeveTop = o.top === 'tshirt' || o.top === 'apron' || o.top === 'dress' ? 25 : 23;
  box(v, x0, 21, -2, x1, 28, 0, o.skin);
  for (let y = sleeveTop; y <= 28; y++) box(v, x0, y, -2, x1, y, 0, o.top === 'striped' && y % 2 === 0 ? o.stripe : o.shirt);
  if (o.top === 'scout') {
    box(v, x0, 23, -2, x1, 23, 0, shade(o.shirt, 1.15)); // rolled sleeve
    const out = side < 0 ? x0 - 1 : x1 + 1;
    box(v, out, 26, -1, out, 27, -1, '#f2c230'); // shoulder badge
    set(v, out, 26, 0, '#c0392b');
  }
  return v;
}

function forearm(o, side) {
  const v = createVoxels(), x0 = side < 0 ? -9 : 6, x1 = x0 + 2;
  box(v, x0, 15, -2, x1, 20, 0, o.long && o.top !== 'scout' ? o.shirt : o.skin);
  box(v, x0, 13, -2, x1, 14, 0, shade(o.skin, 0.93)); // hand
  if (o.watch && side < 0) box(v, x0, 16, -2, x1, 16, 0, '#4a3020');
  if (o.baguette && side > 0) box(v, x0 + 1, 13, -1, x0 + 1, 14, 9, '#d9a35b');
  if (o.flagStick && side > 0) {
    // Tour guide: a stick with the country's flag, held up high
    box(v, x0 + 1, 12, -1, x0 + 1, 34, -1, '#8b5a2b');
    for (let x = 0; x < 9; x++) for (let y = 0; y < 6; y++) set(v, x0 + 2 + x, 34 - y, -1, FLAGS[o.flagStick]((x + 0.5) / 9, (y + 0.5) / 6));
  }
  return v;
}

function head(o) {
  const v = createVoxels();
  const r = rand(o.seed ?? 1);
  // Rounded head
  for (let x = -5; x <= 4; x++)
    for (let y = 30; y <= 40; y++)
      for (let z = -5; z <= 4; z++) {
        const ex = x === -5 || x === 4, ez = z === -5 || z === 4, ey = y === 30 || y === 40;
        if ((ex && ez) || (ex && ey) || (ez && ey)) continue;
        set(v, x, y, z, o.skin);
      }
  // Face
  for (const [ex, hx] of [[-3, -3], [2, 2]]) {
    box(v, Math.min(ex, ex + (ex < 0 ? 1 : -1)), 34, 4, Math.max(ex, ex + (ex < 0 ? 1 : -1)), 35, 4, '#1c1c1c');
    set(v, hx, 35, 4, '#ffffff');
  }
  box(v, -4, 37, 4, -2, 37, 4, o.brows ?? shade(o.hair, 0.8));
  box(v, 1, 37, 4, 3, 37, 4, o.brows ?? shade(o.hair, 0.8));
  box(v, -1, 33, 5, 0, 33, 5, shade(o.skin, 0.9)); // nose
  set(v, -2, 32, 4, '#a0524a');
  box(v, -1, 31, 4, 0, 31, 4, '#a0524a');
  set(v, 1, 32, 4, '#a0524a');
  set(v, -4, 33, 4, '#f2a28a');
  set(v, 3, 33, 4, '#f2a28a');
  if (o.beard) box(v, -4, 30, 4, 3, 31, 4, o.hair), set(v, -1, 31, 4, '#a0524a');
  if (o.moustache) {
    box(v, -3, 32, 5, 2, 32, 5, o.moustache === true ? o.hair : o.moustache);
    set(v, -4, 31, 5, o.moustache === true ? o.hair : o.moustache); // curly ends
    set(v, 3, 31, 5, o.moustache === true ? o.hair : o.moustache);
  }
  if (o.glasses) {
    const G = o.glasses === true ? '#222222' : o.glasses;
    for (const x0 of [-4, 1]) {
      box(v, x0, 33, 5, x0 + 2, 33, 5, G);
      box(v, x0, 36, 5, x0 + 2, 36, 5, G);
      box(v, x0, 34, 5, x0, 35, 5, G);
      box(v, x0 + 2, 34, 5, x0 + 2, 35, 5, G);
    }
    box(v, -1, 35, 5, 0, 35, 5, G); // bridge
  }
  for (const ex of [-6, 5]) box(v, ex, 33, -1, ex, 35, 0, shade(o.skin, 0.95)); // ears

  hair(v, o, r);
  hat(v, o);
  return v;
}

function hair(v, o, r) {
  const H = o.hair, L = shade(H, 1.25);
  const c = () => (r() < 0.2 ? L : H);
  const style = o.hairStyle;
  if (style === 'bald') {
    box(v, -6, 33, -4, -6, 36, 1, H);
    box(v, 5, 33, -4, 5, 36, 1, H);
    box(v, -5, 33, -6, 4, 36, -6, H);
    return;
  }
  // Cap of hair on top, back and sides
  for (let x = -6; x <= 5; x++)
    for (let z = -6; z <= 5; z++) {
      const edge = x === -6 || x === 5 || z === -6 || z === 5;
      if (!edge || (x === -6 && z === -6) || (x === 5 && z === -6)) set(v, x, 41, z, c());
    }
  box(v, -5, 31, -6, 4, 40, -6, H);
  for (let y = 31; y <= 40; y++) for (let x = -5; x <= 4; x++) if (r() < 0.25) set(v, x, y, -6, L);
  for (const sx of [-6, 5]) box(v, sx, 36, -5, sx, 40, 2, H);
  // Fringe with a jagged edge
  const fringe = style === 'messy' ? [37, 39, 38, 40, 39, 38, 40, 39, 37, 38] : [39, 40, 40, 40, 40, 40, 40, 40, 40, 39];
  for (let x = -5; x <= 4; x++) box(v, x, fringe[x + 5], 5, x, 40, 5, c());
  box(v, -5, 39, 4, 4, 40, 4, H);

  if (style === 'long') {
    box(v, -6, 24, -7, 5, 40, -6, H);
    for (const sx of [-7, 6]) box(v, sx, 26, -6, sx, 40, 1, H);
  }
  if (style === 'bun') {
    box(v, -2, 42, -4, 1, 44, -1, H);
    box(v, -1, 45, -3, 0, 45, -2, H);
  }
  if (style === 'messy') {
    // Lots of hair: tufts sticking out everywhere
    for (let i = 0; i < 70; i++) {
      const side = Math.floor(r() * 4);
      const y = 34 + Math.floor(r() * 9);
      const a = Math.floor(r() * 12) - 6;
      const [x, z] = [[-7, a], [6, a], [a, -7], [a, -7]][side];
      if (y < 36 && side < 2 && z > -2) continue; // keep the ears visible
      set(v, x, y, z, c());
      if (r() < 0.45) set(v, x + (side === 0 ? -1 : side === 1 ? 1 : 0), y + 1, z + (side >= 2 ? -1 : 0), c());
    }
    box(v, -5, 29, -7, 4, 31, -7, H); // hair on the neck
    for (let i = 0; i < 14; i++) set(v, Math.floor(r() * 10) - 5, 42, Math.floor(r() * 10) - 5, c());
  }
}

function hat(v, o) {
  const C = o.hatColor;
  switch (o.hat) {
    case 'scout': {
      for (let x = -9; x <= 8; x++)
        for (let z = -9; z <= 8; z++) if (Math.abs(x + 0.5) + Math.abs(z + 0.5) < 15) set(v, x, 42, z, C);
      for (let x = -5; x <= 4; x++)
        for (let z = -5; z <= 4; z++) {
          const ring = x === -5 || x === 4 || z === -5 || z === 4;
          set(v, x, 43, z, ring ? '#7a5230' : C);
          set(v, x, 44, z, C);
        }
      // "Montana peak": four pinches on the crown
      for (let x = -4; x <= 3; x++)
        for (let z = -4; z <= 3; z++) {
          const pinch = (x === -1 || x === 0) && (z === -4 || z === 3) || (z === -1 || z === 0) && (x === -4 || x === 3);
          if (!pinch) set(v, x, 45, z, C);
        }
      box(v, -2, 46, -2, 1, 46, 1, C);
      set(v, -1, 47, -1, C);
      set(v, 0, 47, 0, C);
      break;
    }
    case 'beret':
      for (let x = -7; x <= 6; x++) for (let z = -7; z <= 6; z++) if (Math.hypot(x + 0.5, z + 1.5) < 6.8) set(v, x, 42, z, C);
      box(v, -5, 43, -6, 3, 43, 3, C);
      set(v, -1, 44, -1, C);
      break;
    case 'chef':
      box(v, -6, 42, -6, 5, 42, 5, '#e8e4dc');
      box(v, -5, 43, -5, 4, 47, 4, C);
      box(v, -6, 48, -6, 5, 49, 5, C);
      break;
    case 'cap':
      box(v, -6, 42, -6, 5, 43, 5, C);
      box(v, -4, 44, -4, 3, 44, 3, C);
      box(v, -5, 42, 6, 4, 42, 9, shade(C, 0.8)); // visor
      break;
    case 'sunhat':
      for (let x = -10; x <= 9; x++) for (let z = -10; z <= 9; z++) if (Math.hypot(x + 0.5, z + 0.5) < 10) set(v, x, 42, z, C);
      box(v, -5, 43, -5, 4, 45, 4, C);
      box(v, -5, 43, -5, 4, 43, 4, '#c0392b');
      break;
    case 'bowler': // round black British hat
      box(v, -7, 42, -7, 6, 42, 6, C);
      box(v, -5, 43, -5, 4, 46, 4, C);
      box(v, -4, 47, -4, 3, 47, 3, C);
      box(v, -5, 43, -5, 4, 43, 4, shade(C, 0.6));
      break;
    case 'crown':
      for (let x = -5; x <= 4; x++) for (let z = -5; z <= 4; z++) if (x === -5 || x === 4 || z === -5 || z === 4) {
        box(v, x, 42, z, x, 43, z, '#e8b923');
        if ((x + z) % 3 === 0) set(v, x, 44, z, '#e8b923');
      }
      set(v, -1, 43, 5, '#c0392b');
      set(v, 0, 43, -6, '#2e86de');
      break;
    case 'busby': // tall black guard hat
      box(v, -6, 41, -6, 5, 52, 5, '#111111');
      box(v, -6, 33, 5, -6, 41, 5, '#d4af37');
      break;
  }
}

function shade(hex, k) {
  return new THREE.Color(hex).multiplyScalar(k).getHexString().replace(/^/, '#');
}

// ---- Rig ------------------------------------------------------------------------

export function createCharacter(opts) {
  const o = {
    skin: '#f1c27d', hair: '#6b3a1a', hairStyle: 'short', hat: 'none', hatColor: '#1c2f5e',
    top: 'tshirt', shirt: '#3d8fd6', stripe: '#ffffff', bottom: 'long', pants: '#1f3264',
    socks: '#2b4c8c', shoes: '#5b3a1e', ...opts,
  };
  const group = new THREE.Group();

  // A part = a mesh whose origin is its joint (pivot given in voxel units).
  const part = (vox, px, py, pz, parent) => {
    const g = new THREE.Group();
    const geo = buildGeometry(vox, S).translate(-px * S, -py * S, -pz * S);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    g.add(mesh);
    g.position.set(px * S, py * S, pz * S);
    if (parent.userData.pivot) g.position.sub(parent.userData.pivot);
    g.userData.pivot = new THREE.Vector3(px * S, py * S, pz * S);
    parent.add(g);
    return g;
  };

  const hips = part(torso(o), 0, 16, 0, group);
  const headG = part(head(o), 0, 29, 0, hips);
  const armL = part(upperArm(o, -1), -7.5, 28.5, -0.5, hips), armR = part(upperArm(o, 1), 7.5, 28.5, -0.5, hips);
  const foreL = part(forearm(o, -1), -7.5, 21, -0.5, armL), foreR = part(forearm(o, 1), 7.5, 21, -0.5, armR);
  const legL = part(thigh(o, -3), -3, 16, 0, group), legR = part(thigh(o, 3), 3, 16, 0, group);
  const shinL = part(shin(o, -3), -3, 8, 0, legL), shinR = part(shin(o, 3), 3, 8, 0, legR);

  // Smoothly blended animation state.
  let phase = 0, walk = 0, air = 0, sit = 0, squash = 0, t = 0;
  const lerp = (a, b, k) => a + (b - a) * k;
  let onStep = null;

  // speed: 0 still, 1 walk, ~1.8 run. airborne: in the air. sitting: in a vehicle.
  function animate(dt, { speed = 0, airborne = false, sitting = false, lookYaw = 0 } = {}) {
    t += dt;
    const k = 1 - Math.exp(-dt * 10);
    walk = lerp(walk, sitting ? 0 : speed, k);
    air = lerp(air, airborne && !sitting ? 1 : 0, 1 - Math.exp(-dt * 8));
    sit = lerp(sit, sitting ? 1 : 0, k);
    squash = lerp(squash, 0, 1 - Math.exp(-dt * 12));

    const prev = phase;
    phase += dt * (4 + 7 * Math.min(walk, 2)) * (walk > 0.05 ? 1 : 0);
    if (onStep && walk > 0.3 && air < 0.5 && Math.floor(prev / Math.PI) !== Math.floor(phase / Math.PI)) onStep();

    const w = Math.min(Math.sqrt(Math.max(walk, 0)), 1.4) * (1 - air);
    const amp = 0.45 + 0.2 * Math.min(Math.max(walk - 1, 0), 1);
    const s = Math.sin(phase), c = Math.cos(phase);

    legL.rotation.x = lerp(-s * amp * w + air * -0.5, -1.45, sit);
    legR.rotation.x = lerp(s * amp * w + air * 0.3, -1.45, sit);
    shinL.rotation.x = lerp(Math.max(0, c) * 1.0 * w + 0.05 + air * 0.7, 1.45, sit);
    shinR.rotation.x = lerp(Math.max(0, -c) * 1.0 * w + 0.05 + air * 0.2, 1.45, sit);

    const breathe = Math.sin(t * 2.2) * 0.04 * (1 - w);
    armL.rotation.x = lerp(s * 0.55 * w + breathe - air * 0.4, -0.7, sit);
    armR.rotation.x = lerp(-s * 0.55 * w + breathe - air * 0.4, -0.7, sit);
    armL.rotation.z = -0.06 - air * 1.0;
    armR.rotation.z = 0.06 + air * 1.0;
    foreL.rotation.x = lerp(-0.25 - Math.max(0, -s) * 0.6 * w, -0.6, sit);
    foreR.rotation.x = lerp(-0.25 - Math.max(0, s) * 0.6 * w, -0.6, sit);

    hips.rotation.x = 0.07 * w;
    hips.rotation.y = s * 0.08 * w;
    headG.rotation.y = lerp(-s * 0.06 * w, 0, air) + lookYaw;
    headG.rotation.x = -0.05 * w + Math.sin(t * 1.3) * 0.02 * (1 - w);
    hips.position.y = hips.userData.pivot.y + (1 - Math.cos(2 * phase)) * 0.035 * w - squash * 0.12 - sit * 0.55;
    // The legs hang from the group, so they must sink with the hips or the thighs end up in the chest.
    legL.position.y = legR.position.y = legL.userData.pivot.y - sit * 0.55;
    hips.scale.y = 1 + Math.sin(t * 2.2) * 0.008 * (1 - w) - squash * 0.06;
  }

  return {
    group,
    animate,
    // The joints, for posing people by hand (easter eggs). Rotate them after animate().
    parts: { hips, head: headG, armL, armR, foreL, foreR, legL, legR, shinL, shinR },
    land: (strength = 1) => (squash = Math.min(1, strength)),
    set onStep(fn) { onStep = fn; },
  };
}

export const ATLAS_LOOK = {
  hairStyle: 'messy', hair: '#6b3a1a', hat: 'scout', hatColor: '#1c2f5e',
  top: 'scout', shirt: '#3d8fd6', bottom: 'shorts', pants: '#1f3264', socks: '#2b4c8c',
  shoes: '#6b4423', scarf: '#f2c230', backpack: true, watch: true, seed: 7,
};
