// Atlas controller: smooth third person movement, collisions, jumping, driving vehicles, camera.
import * as THREE from 'three';
import { WATER_LEVEL } from './world.js';
import { resolve } from './physics.js';
import { settings } from './settings.js';

const WALK = 4.5, RUN = 9, JUMP = 10, GRAVITY = 28, RADIUS = 0.4;
const COYOTE = 0.12; // you can still jump a moment after leaving an edge
const BUFFER = 0.15; // a jump pressed just before landing still counts
const MIN_ORBIT = 0.08;
const damp = (k, dt) => 1 - Math.exp(-k * dt);

export function createPlayer({ atlas, camera, world, spawn, dom, sounds, dynamicColliders }) {
  const pos = spawn.clone();
  const vel = new THREE.Vector2();
  let velY = 0, onGround = true, coyote = 0, jumpBuffer = 0, airTime = 0;
  // pitch > 0: camera above Atlas looking down. pitch < 0: camera stays low and tilts up (to see tall monuments).
  let yaw = 0, pitch = 0.3, distance = 9, lastMouse = -10, time = 0;
  let vehicle = null;
  const camTarget = pos.clone().add(new THREE.Vector3(0, 1.6, 0));
  const camPos = new THREE.Vector3();
  let snapCamera = true;
  const keys = new Set();

  addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Space' && !e.repeat) jumpBuffer = BUFFER;
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  dom.addEventListener('mousemove', (e) => {
    // Pointer lock, or drag with the mouse where pointer lock is not allowed.
    if (document.pointerLockElement !== dom && !e.buttons) return;
    const s = 0.0025 * settings.sensitivity;
    yaw -= e.movementX * s;
    pitch = THREE.MathUtils.clamp(pitch + e.movementY * s * (settings.invertY ? -1 : 1), -1.1, 1.3);
    lastMouse = time;
  });
  dom.addEventListener('wheel', (e) => {
    distance = THREE.MathUtils.clamp(distance * (e.deltaY > 0 ? 1.15 : 0.87), 3, 35);
  });

  const key = (...codes) => codes.some((c) => keys.has(c));
  const ground = (x, z) => Math.max(world.surfaceAt(x, z), world.platformAt(x, z));
  const walkable = (x, z) => {
    const g = ground(x, z);
    return g > WATER_LEVEL && g - pos.y <= 1.0;
  };

  function walk(dt, enabled) {
    const input = new THREE.Vector2(
      enabled ? key('KeyD', 'ArrowRight') - key('KeyA', 'ArrowLeft') : 0,
      enabled ? key('KeyS', 'ArrowDown') - key('KeyW', 'ArrowUp') : 0,
    );
    const running = enabled && key('ShiftLeft', 'ShiftRight');
    const target = input.lengthSq() ? input.normalize().rotateAround(new THREE.Vector2(), -yaw).multiplyScalar(running ? RUN : WALK) : input;
    vel.lerp(target, damp((input.lengthSq() ? 10 : 12) * (onGround ? 1 : 0.35), dt));

    const prev = pos.clone();
    const nx = pos.x + vel.x * dt, nz = pos.z + vel.y * dt;
    if (walkable(nx, nz)) (pos.x = nx), (pos.z = nz);
    else if (walkable(nx, pos.z)) (pos.x = nx), (vel.y = 0);
    else if (walkable(pos.x, nz)) (pos.z = nz), (vel.x = 0);
    else vel.set(0, 0);

    const top = Math.max(resolve(pos, RADIUS, world.collidersNear(pos.x, pos.z)), resolve(pos, RADIUS, dynamicColliders()));
    if (!walkable(pos.x, pos.z)) pos.x = prev.x, pos.z = prev.z; // never get pushed into the sea
    const floor = Math.max(ground(pos.x, pos.z), top);

    coyote = onGround ? COYOTE : coyote - dt;
    jumpBuffer -= dt;
    if (enabled && jumpBuffer > 0 && coyote > 0) {
      velY = JUMP;
      onGround = false;
      coyote = jumpBuffer = 0;
      sounds.jump();
    }
    velY -= GRAVITY * dt;
    pos.y += velY * dt;
    // Stick to the ground when walking down slopes, land when falling.
    if (pos.y <= floor || (onGround && velY <= 0 && pos.y - floor < 0.6)) {
      if (!onGround && airTime > 0.25) {
        atlas.land(Math.min(1, -velY / 18));
        sounds.land();
      }
      pos.y = floor;
      velY = 0;
      onGround = true;
      airTime = 0;
    } else {
      onGround = false;
      airTime += dt;
    }

    const speed = vel.length();
    if (speed > 0.3) {
      const want = Math.atan2(vel.x, vel.y), r = atlas.group.rotation;
      r.y += Math.atan2(Math.sin(want - r.y), Math.cos(want - r.y)) * damp(12, dt);
    }
    atlas.group.position.copy(pos);
    atlas.animate(dt, { speed: speed / WALK, airborne: airTime > 0.08 });
  }

  function drive(dt, enabled, t) {
    const input = {
      forward: enabled ? key('KeyW', 'ArrowUp') - key('KeyS', 'ArrowDown') : 0,
      turn: enabled ? key('KeyA', 'ArrowLeft') - key('KeyD', 'ArrowRight') : 0,
      up: enabled && key('Space'),
      down: enabled && key('ShiftLeft', 'ShiftRight'),
    };
    vehicle.update(dt, input, world, t);
    atlas.group.position.copy(vehicle.group.localToWorld(vehicle.seat.clone()));
    atlas.group.rotation.y = vehicle.heading;
    atlas.animate(dt, { sitting: true });
    pos.copy(vehicle.pos);
    // Camera slowly swings behind the vehicle unless you are looking around with the mouse.
    if (time - lastMouse > 1.5) yaw += Math.atan2(Math.sin(vehicle.heading + Math.PI - yaw), Math.cos(vehicle.heading + Math.PI - yaw)) * damp(1.5, dt);
  }

  function updateCamera(dt) {
    const target = vehicle ? vehicle.pos.clone().add(new THREE.Vector3(0, 2.2, 0)) : pos.clone().add(new THREE.Vector3(0, 1.6, 0));
    const dist = vehicle ? vehicle.camDistance * (distance / 9) : distance;
    camTarget.lerp(target, snapCamera ? 1 : damp(vehicle ? 8 : 14, dt));
    const orbit = Math.max(pitch, MIN_ORBIT);
    const want = new THREE.Vector3(
      camTarget.x + Math.sin(yaw) * Math.cos(orbit) * dist,
      camTarget.y + Math.sin(orbit) * dist,
      camTarget.z + Math.cos(yaw) * Math.cos(orbit) * dist,
    );
    want.y = Math.max(want.y, world.surfaceAt(want.x, want.z) + 0.6, WATER_LEVEL + 0.6);
    camPos.lerp(want, snapCamera ? 1 : damp(20, dt));
    snapCamera = false;
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    if (pitch < MIN_ORBIT) camera.rotateX(MIN_ORBIT - pitch); // look up
  }

  atlas.onStep = () => sounds.step(world.groundType(pos.x, pos.z, pos.y));

  return {
    position: pos,
    get vehicle() { return vehicle; },
    get facing() { return vehicle ? vehicle.heading : atlas.group.rotation.y; },
    get onGround() { return onGround; },
    update(dt, enabled, t) {
      time += dt;
      if (vehicle) drive(dt, enabled, t);
      else walk(dt, enabled);
      updateCamera(dt);
    },
    enter(v) {
      vehicle = v;
      vel.set(0, 0);
      sounds.enter();
    },
    // Returns false when there is no dry land close enough to get out.
    exit() {
      const p = vehicle.exitPoint(world);
      if (!p) return false;
      vehicle.stop();
      atlas.group.rotation.y = vehicle.heading;
      vehicle = null;
      pos.copy(p);
      velY = 0;
      sounds.enter();
      return true;
    },
    teleport(p, facing = 0) {
      vehicle = null;
      pos.copy(p);
      vel.set(0, 0);
      atlas.group.rotation.y = facing;
      yaw = facing + Math.PI;
      snapCamera = true;
    },
  };
}
