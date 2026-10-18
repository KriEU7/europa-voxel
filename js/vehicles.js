// Boat and plane: voxel models + arcade driving.
// Input: { forward: -1..1 (W/S), turn: -1..1 (A = +1), up, down } – booleans for up/down.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createVoxels, set, box, buildGeometry, material } from './voxel.js';
import { M, classify } from './textures.js';

// Wood stays wood, everything else is painted (the balloon envelope is cloth).
const painted = (hex) => (classify(hex) === M.WOOD ? M.WOOD : M.PAINT);
const cloth = (hex) => (classify(hex) === M.WOOD ? M.WOOD : M.FABRIC);
import { WATER_LEVEL, waveAt, part } from './world.js';
import { hitTest } from './physics.js';

const lerp = (a, b, k) => a + (b - a) * k;

// ---- Models (geometry built once, shared by every boat / plane) ------------------

let boatGeo, planeGeo, propGeo;

function buildBoat() {
  const v = createVoxels();
  const halfW = (z) => (z < 19 ? 6 : Math.max(1, Math.round(6 - (z - 19) * 0.55)));
  for (let z = 0; z < 30; z++) {
    const w = halfW(z);
    for (let y = 0; y <= 4; y++) {
      const ww = y === 0 ? w - 2 : y === 1 ? w - 1 : w;
      for (let x = -ww; x < ww; x++) {
        const wall = x === -ww || x === ww - 1 || z === 0 || z >= 28;
        if (y >= 3 && !wall) continue; // open deck
        const c = y <= 1 ? '#b03a2e' : y === 2 ? '#f4f4f4' : y === 3 ? '#2a6fb0' : '#8d6240';
        set(v, x, y, z, c);
      }
    }
    for (let x = -w + 1; x < w - 1; x++) set(v, x, 2, z, z % 2 ? '#a0714a' : '#8d6240'); // wooden deck
  }
  // Cabin with windows
  for (let y = 3; y <= 7; y++)
    for (let z = 13; z <= 19; z++)
      for (let x = -4; x <= 3; x++) {
        const wall = x === -4 || x === 3 || z === 13 || z === 19;
        if (!wall) continue;
        const window = y >= 5 && y <= 6 && ((z > 14 && z < 18) || (x > -3 && x < 2));
        set(v, x, y, z, window ? '#7fc8f0' : '#f4f4f4');
      }
  box(v, -5, 8, 12, 4, 8, 20, '#2a6fb0'); // roof
  box(v, -2, 3, 3, 1, 4, 5, '#6b4423'); // seat
  box(v, -1, 1, -2, 0, 6, -1, '#333333'); // outboard motor
  box(v, -1, 5, -3, 0, 6, -3, '#555555');
  box(v, -1, 9, 16, -1, 13, 16, '#d9d9d9'); // little mast
  box(v, 0, 11, 16, 2, 12, 16, '#f2c230');
  const g = buildGeometry(v, 0.2, painted);
  g.translate(0, 0.1, -3);
  return g;
}

function buildPlane() {
  const v = createVoxels();
  const RED = '#e74c3c', WHITE = '#f4f4f4', YELLOW = '#f2c230';
  for (let z = 0; z <= 38; z++) {
    // Fuselage section shrinks towards the tail
    const t = z < 12 ? z / 12 : 1;
    const hw = Math.round(1 + 2 * t), y0 = Math.round(7 - 3 * t), y1 = 8 + (z > 32 ? -1 : 0);
    for (let y = y0; y <= y1; y++)
      for (let x = -hw; x < hw; x++) {
        if (z >= 17 && z <= 23 && y >= 7 && x > -hw && x < hw - 1) continue; // open cockpit
        set(v, x, y, z, y === 6 ? WHITE : z >= 34 ? YELLOW : RED);
      }
  }
  box(v, -2, 9, 24, 1, 9, 24, '#7fc8f0'); // windscreen
  box(v, -2, 4, 18, 1, 5, 20, '#6b4423'); // seat
  box(v, -2, 4, 39, 1, 7, 39, '#555555'); // engine front
  // Wings, with red tips
  for (let x = -25; x < 25; x++) box(v, x, 5, 22, x, 5, 29, Math.abs(x + 0.5) > 21 ? RED : YELLOW);
  // Tail
  box(v, -9, 7, 1, 8, 7, 5, YELLOW);
  for (let y = 9; y <= 15; y++) box(v, -1, y, 0, 0, y, Math.max(1, 6 - (y - 9)), y % 3 === 0 ? WHITE : RED);
  // Landing gear
  for (const x of [-6, 5]) {
    box(v, x, 2, 26, x, 4, 26, '#888888');
    box(v, x - 1, 0, 25, x + 1, 2, 27, '#222222');
  }
  box(v, -1, 1, 2, 0, 3, 2, '#222222');
  const g = buildGeometry(v, 0.18, painted);
  g.translate(0, 0, -3.6);

  const p = createVoxels();
  box(p, -1, -12, 0, 0, 11, 0, '#3a3a3a');
  box(p, -2, -2, 0, 1, 1, 1, '#c9c9c9');
  propGeo = buildGeometry(p, 0.12, painted).translate(0, 0, 0);
  return g;
}

function mesh(geo) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// ---- Boat -----------------------------------------------------------------------

// Turn `heading` towards `want` by at most `rate * dt`. Returns how much it turned (for the roll).
function steer(heading, want, rate, dt) {
  const diff = Math.atan2(Math.sin(want - heading), Math.cos(want - heading));
  return THREE.MathUtils.clamp(diff, -rate * dt, rate * dt);
}

const OPEN_SEA = { surfaceAt: () => -3, platformAt: () => -Infinity }; // for placing a boat without moving it

export function createBoat(spot) {
  boatGeo ??= buildBoat();
  const group = new THREE.Group();
  group.add(mesh(boatGeo));
  const pos = new THREE.Vector3(spot.x, WATER_LEVEL, spot.z);
  let heading = spot.heading, speed = 0, roll = 0;
  let route = null; // autopilot: { points, i }
  const dir = () => new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
  const blocked = (world, p) => world.surfaceAt(p.x, p.z) > WATER_LEVEL - 0.5 || world.platformAt(p.x, p.z) > -Infinity;

  const boat = {
    kind: 'boat', group, pos, home: spot,
    seat: new THREE.Vector3(0, 0.95, -2.2),
    camDistance: 13,
    hidden: false,
    arrived: false,
    get speed() { return speed; },
    get heading() { return heading; },
    get auto() { return !!route; },
    // Sail by itself along a list of points (the last one is where it stops).
    sailTo(points) {
      route = { points, i: 0 };
      boat.arrived = false;
    },
    update(dt, input, world, t) {
      let turn = input.turn;
      if (route) {
        const p = route.points[route.i], last = route.i === route.points.length - 1;
        const dist = Math.hypot(p.x - pos.x, p.z - pos.z);
        const d = steer(heading, Math.atan2(p.x - pos.x, p.z - pos.z), 0.9, dt);
        heading += d;
        turn = d / Math.max(dt, 1e-4) / 0.9;
        speed = lerp(speed, last ? Math.min(30, Math.max(2, dist * 1.2)) : 30, 1 - Math.exp(-dt * 0.8));
        if (!last && dist < 10) route.i++;
        if (last && dist < 1.5) (boat.arrived = true), (speed = 0);
        pos.addScaledVector(dir(), speed * dt);
      } else {
        const target = input.forward > 0 ? 24 * input.forward : input.forward < 0 ? -6 : 0;
        speed = lerp(speed, target, 1 - Math.exp(-dt * (Math.abs(target) > Math.abs(speed) ? 0.7 : 1.2)));
        heading += input.turn * dt * 1.1 * Math.min(1, Math.abs(speed) / 6) * Math.sign(speed || 1);
        const next = pos.clone().addScaledVector(dir(), speed * dt);
        const bow = next.clone().addScaledVector(dir(), speed >= 0 ? 3 : -3);
        if (blocked(world, next) || blocked(world, bow)) speed *= -0.3;
        else pos.copy(next);
      }
      pos.y = WATER_LEVEL + waveAt(pos.x, pos.z, t) - 0.05;
      const f = dir().multiplyScalar(2.5);
      const pitch = (waveAt(pos.x - f.x, pos.z - f.z, t) - waveAt(pos.x + f.x, pos.z + f.z, t)) * 0.2 - speed * 0.004;
      roll = lerp(roll, -turn * Math.min(Math.abs(speed), 20) * 0.012 + Math.sin(t * 1.3) * 0.03, 1 - Math.exp(-dt * 3));
      group.position.copy(pos);
      group.rotation.set(pitch, heading, roll, 'YXZ');
    },
    // Nearest dry spot (beach or pier) where Atlas can step off, or null.
    exitPoint(world) {
      for (let r = 3; r <= 9; r += 1.5)
        for (let a = 0; a < 16; a++) {
          const x = pos.x + Math.sin((a / 16) * Math.PI * 2) * r, z = pos.z + Math.cos((a / 16) * Math.PI * 2) * r;
          const ground = Math.max(world.surfaceAt(x, z), world.platformAt(x, z));
          if (ground > WATER_LEVEL + 0.15) return new THREE.Vector3(x, ground, z);
        }
      return null;
    },
    stop() { speed = 0; },
    // Back to its own pier, ready for the next trip.
    sendHome() {
      pos.set(spot.x, WATER_LEVEL, spot.z);
      heading = spot.heading;
      speed = 0;
      route = null;
      boat.arrived = false;
      boat.update(0, { forward: 0, turn: 0 }, OPEN_SEA, 0);
    },
  };
  boat.update(0, { forward: 0, turn: 0 }, OPEN_SEA, 0);
  return boat;
}

// ---- Plane ----------------------------------------------------------------------

const TAKEOFF = 18, STALL = 14, MAX = 60, CRUISE = 78;

export function createPlane(spot) {
  planeGeo ??= buildPlane();
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.add(mesh(planeGeo));
  const prop = mesh(propGeo);
  prop.position.set(0, 1.0, 3.55);
  body.add(prop);
  group.add(body);

  const pos = new THREE.Vector3(spot.x, spot.y, spot.z);
  let heading = spot.heading, speed = 0, vy = 0, onGround = true, roll = 0, pitch = 0;
  let crash = 0; // > 0 while doing the "bump and spin" after hitting something
  let route = null; // autopilot: { dest, phase, startY }
  const CRASH = 1.3;
  const dir = () => new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
  const groundAt = (world, x, z) => Math.max(world.surfaceAt(x, z), WATER_LEVEL + 0.2);

  // Bumped into a building or a tree: bounce away, pop up and do a barrel roll.
  function bump(c) {
    const cx = c.r !== undefined ? c.x : THREE.MathUtils.clamp(pos.x, c.x0, c.x1);
    const cz = c.r !== undefined ? c.z : THREE.MathUtils.clamp(pos.z, c.z0, c.z1);
    let dx = pos.x - cx, dz = pos.z - cz, d = Math.hypot(dx, dz);
    if (d < 0.01) (dx = -Math.sin(heading)), (dz = -Math.cos(heading)), (d = 1);
    pos.x += (dx / d) * 4;
    pos.z += (dz / d) * 4;
    if (onGround) {
      speed = 0;
      return;
    }
    heading = Math.atan2(dx, dz); // now pointing away from the obstacle
    speed = Math.max(16, speed * 0.5);
    vy = 9;
    crash = CRASH;
    plane.onCrash?.();
  }

  // Autopilot: take off, cruise high above everything, then land on the destination runway
  // coming from the north (runways point south, +z) and stop on its parking spot.
  function autopilot(dt, world) {
    const d = route.dest;
    let turn = 0, targetY;
    if (route.phase === 'takeoff') {
      speed = Math.min(42, speed + 24 * dt);
      targetY = speed > TAKEOFF ? Math.max(route.startY + 20, groundAt(world, pos.x, pos.z) + 6) : pos.y;
      if (pos.y > route.startY + 16) route.phase = 'cruise';
    } else {
      const final = route.phase === 'final';
      const tx = d.x, tz = final ? d.z : d.z - 160;
      const dist = Math.hypot(tx - pos.x, tz - pos.z);
      const toTarget = new THREE.Vector3(tx - pos.x, 0, tz - pos.z);
      if (!final || dist > 4) turn = steer(heading, Math.atan2(toTarget.x, toTarget.z), final ? 1.2 : 0.7, dt);
      heading += turn;
      if (!final) {
        speed = lerp(speed, 55, 1 - Math.exp(-dt * 0.6));
        targetY = CRUISE;
        if (dist < 25) route.phase = 'final';
      } else {
        speed = THREE.MathUtils.clamp(dist * 0.45, 5, 45);
        targetY = d.y + Math.min(CRUISE - d.y, dist * 0.42);
        if (dist < 1.5 || (dist < 8 && toTarget.dot(dir()) < 0)) (plane.arrived = true), (speed = 0);
      }
      targetY = Math.max(targetY, groundAt(world, pos.x, pos.z) + (dist > 12 ? 3 : 0));
    }
    vy = THREE.MathUtils.clamp((targetY - pos.y) * 1.5, -14, 12);
    pos.addScaledVector(dir(), speed * dt);
    pos.y += vy * dt;
    onGround = pos.y <= groundAt(world, pos.x, pos.z) + 0.05;
    return turn / Math.max(dt, 1e-4);
  }

  const plane = {
    kind: 'plane', group, pos, home: spot,
    seat: new THREE.Vector3(0, 0.9, -0.1),
    camDistance: 20,
    onCrash: null,
    hidden: false,
    arrived: false,
    get speed() { return speed; },
    get heading() { return heading; },
    get onGround() { return onGround; },
    get auto() { return !!route; },
    flyTo(dest) {
      route = { dest, phase: 'takeoff', startY: pos.y };
      plane.arrived = false;
    },
    update(dt, input, world) {
      let turnRate = input.turn;
      if (route) {
        turnRate = autopilot(dt, world);
      } else {
        if (crash > 0) {
          crash -= dt;
          input = { forward: 0, turn: 0, up: true, down: false }; // no control during the spin
        }
        speed = THREE.MathUtils.clamp(speed + input.forward * 16 * dt - (onGround && input.forward <= 0 ? 8 * dt : 0), 0, MAX);
        heading += input.turn * dt * (onGround ? 0.9 * Math.min(1, speed / 8) : 1.0);
        if (onGround) {
          if (speed > TAKEOFF && input.up) (onGround = false), (vy = 6);
        } else {
          const target = speed < STALL ? -7 : input.up ? 10 : input.down ? -12 : 0;
          vy = lerp(vy, target, 1 - Math.exp(-dt * 2.5));
        }
        pos.addScaledVector(dir(), speed * dt);
        pos.y = Math.min(160, pos.y + vy * dt);
        if (crash <= 0 && speed > 2) {
          const hit = hitTest(pos, 3, world.collidersNear(pos.x, pos.z));
          if (hit) bump(hit);
        }
      }
      const ground = groundAt(world, pos.x, pos.z);
      if (pos.y <= ground) {
        pos.y = ground;
        if (!onGround && !route) speed *= 0.8; // landing
        onGround = true;
        vy = 0;
      }
      roll = lerp(roll, onGround ? 0 : -turnRate * 0.6, 1 - Math.exp(-dt * 3));
      pitch = lerp(pitch, onGround ? 0 : -vy * 0.035, 1 - Math.exp(-dt * 3));
      prop.rotation.z += dt * (6 + speed * 1.5);
      group.position.copy(pos);
      group.rotation.set(0, heading, 0);
      body.rotation.set(pitch, 0, roll + (crash > 0 ? (1 - crash / CRASH) * Math.PI * 2 : 0));
    },
    exitPoint(world) {
      if (!onGround || speed > 4) return null;
      const side = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
      for (const p of [pos.clone().addScaledVector(side, 6), pos.clone().addScaledVector(side, -6), pos.clone().addScaledVector(dir(), -7)]) {
        const ground = world.surfaceAt(p.x, p.z);
        if (ground > WATER_LEVEL + 0.15) return p.setY(ground);
      }
      return null;
    },
    stop() { speed = 0; },
    // Back to its own runway, ready for the next trip.
    sendHome(world) {
      pos.set(spot.x, spot.y, spot.z);
      heading = spot.heading;
      speed = vy = roll = pitch = crash = 0;
      onGround = true;
      route = null;
      plane.arrived = false;
      plane.update(0, { forward: 0, turn: 0 }, world);
    },
  };
  plane.update(0, { forward: 0, turn: 0 }, { surfaceAt: () => spot.y }, 0);
  return plane;
}

// ---- Hot air balloon ------------------------------------------------------------------
// Slow and panoramic: Space = burner (go up), Shift = let air out (go down), W/S and A/D = drift and turn.

let balloonGeo, ropeGeo;
function buildBalloon() {
  const v = createVoxels();
  const STRIPES = ['#e53935', '#fdd835', '#1e88e5', '#ffffff'];
  // Envelope: a big ball, a bit taller than wide, with vertical stripes, open at the bottom.
  for (let x = -11; x <= 11; x++)
    for (let y = -13; y <= 13; y++)
      for (let z = -11; z <= 11; z++) {
        const d = Math.hypot(x / 11, (y > 0 ? y / 13 : y / 12), z / 11);
        if (d > 1 || d < 0.82 || y < -10) continue;
        const a = Math.atan2(z, x) / (Math.PI * 2) + 0.5;
        set(v, x, y + 28, z, STRIPES[Math.floor(a * 12) % 4]);
      }
  for (let x = -4; x <= 3; x++)
    for (let z = -4; z <= 3; z++)
      for (let y = 0; y <= 4; y++) {
        const wall = x === -4 || x === 3 || z === -4 || z === 3;
        if (y === 0 || wall) set(v, x, y, z, (x + y + z) % 2 ? '#9c7a4a' : '#8a6a3e'); // wicker basket
      }
  box(v, -1, 12, -1, 0, 13, 0, '#555555'); // burner
  return buildGeometry(v, 0.3, cloth);
}

// Four ropes from the corners of the basket up to the bottom ring of the envelope, plus the
// short bars that hang the burner on them. Same units as buildBalloon() (voxel size 0.3).
function buildRopes() {
  const rope = (a, b, r = 0.045) => {
    const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    return part(
      new THREE.CylinderGeometry(r, r, len, 5)
        .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()))
        .translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2),
      '#5a3a20', false, M.WOOD,
    );
  };
  const BASKET_TOP = 1.5, RING = 5.55, BURNER = new THREE.Vector3(0, 3.9, 0); // ring: inside the lowest envelope layer
  const g = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const a = new THREE.Vector3(sx * 1.05, BASKET_TOP - 0.1, sz * 1.05); // basket corner post
    const b = new THREE.Vector3(0.15 + sx * 1.25, RING, 0.15 + sz * 1.25); // envelope ring
    g.push(rope(a, b));
    g.push(rope(BURNER, a.clone().lerp(b, (BURNER.y - a.y) / (b.y - a.y)), 0.035)); // burner frame
  }
  return mergeGeometries(g);
}

export function createBalloon(spot) {
  balloonGeo ??= buildBalloon();
  ropeGeo ??= buildRopes();
  const group = new THREE.Group();
  const body = mesh(balloonGeo), ropes = mesh(ropeGeo);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1, 6), new THREE.MeshBasicMaterial({ color: '#ffb02e' }));
  flame.position.set(-0.15, 4.3, -0.15);
  group.add(body, ropes, flame); // one group: envelope, ropes and basket always move together
  const pos = new THREE.Vector3(spot.x, spot.y, spot.z);
  const vel = new THREE.Vector2();
  let heading = spot.heading ?? 0, vy = 0, onGround = true;
  const WIND = new THREE.Vector2(0.6, 0.25); // a light breeze always pushes a little

  const balloon = {
    kind: 'balloon', group, pos, home: spot,
    seat: new THREE.Vector3(-0.15, 1.1, -0.15),
    camDistance: 22,
    hidden: false,
    burning: false,
    auto: false,
    get speed() { return vel.length(); },
    get heading() { return heading; },
    update(dt, input, world) {
      balloon.burning = !!input.up;
      const target = input.up ? 3.5 : input.down ? -3 : onGround ? 0 : -0.5; // hot air cools down slowly
      vy = lerp(vy, target, 1 - Math.exp(-dt * 1.2));
      heading += input.turn * dt * 0.6;
      if (!onGround) {
        vel.x += (Math.sin(heading) * input.forward * 2 + WIND.x - vel.x * 0.25) * dt;
        vel.y += (Math.cos(heading) * input.forward * 2 + WIND.y - vel.y * 0.25) * dt;
      } else vel.multiplyScalar(Math.exp(-dt * 4));
      const before = pos.clone();
      pos.x += vel.x * dt;
      pos.z += vel.y * dt;
      pos.y = Math.min(90, pos.y + vy * dt);
      if (hitTest(pos.clone().setY(pos.y + 1), 1.6, world.collidersNear(pos.x, pos.z))) { // bump: bounce back
        pos.x = before.x;
        pos.z = before.z;
        vel.multiplyScalar(-0.5);
      }
      const ground = Math.max(world.surfaceAt(pos.x, pos.z), WATER_LEVEL - 0.3);
      onGround = pos.y <= ground + 0.05;
      if (onGround) (pos.y = ground), (vy = Math.max(vy, 0));
      flame.visible = balloon.burning;
      flame.scale.y = 0.8 + Math.random() * 0.5;
      group.position.copy(pos);
      group.rotation.set(Math.sin(performance.now() / 900) * (onGround ? 0 : 0.03), heading, 0);
    },
    exitPoint(world) {
      if (!onGround) return null;
      const side = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
      for (const p of [pos.clone().addScaledVector(side, 2.5), pos.clone().addScaledVector(side, -2.5)]) {
        const ground = world.surfaceAt(p.x, p.z);
        if (ground > WATER_LEVEL + 0.15) return p.setY(ground);
      }
      return null;
    },
    stop() { vel.set(0, 0); },
  };
  balloon.update(0, { forward: 0, turn: 0 }, { surfaceAt: () => spot.y, collidersNear: () => [] });
  return balloon;
}
