import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createWorld } from './world.js';
import { eiffelTower, EIFFEL_COLLIDERS } from './models/france.js';
import { atomium, colosseum, pisa, brandenburgGate, neuschwanstein, sagradaFamilia, windmill, parthenon, bigBen } from './models/monuments.js';
import { createCharacter } from './models/character.js';
import { EGG_BUILDERS, EGGS } from './models/eggs.js';
import { createBoat, createPlane } from './vehicles.js';
import { createPlayer } from './player.js';
import { createNPCs } from './npc.js';
import { createTravel } from './travel.js';
import { createPassport } from './passport.js';
import { createTours } from './tour.js';
import { createDialog } from './dialog.js';
import { portrait } from './portrait.js';
import { createMinimap } from './minimap.js';
import { createWardrobe, loadLook } from './wardrobe.js';
import { flagOf } from './flags.js';
import { createUI } from './ui.js';
import { initAudio, setVolumes, sounds, setEngine, updateAmbience } from './audio.js';
import { settings, hasSavedSettings, updateSetting, onSettingsChange, QUALITY } from './settings.js';
import { COUNTRIES, PEOPLE } from './data/facts.js';

// ---- Renderer -------------------------------------------------------------------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// PCs without a real graphics driver draw with the CPU: start them on "Low".
const gl = renderer.getContext();
const gpuName = gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
if (!hasSavedSettings && /SwiftShader|Basic Render|llvmpipe|Software/i.test(gpuName)) updateSetting('quality', 'low');

const HORIZON = '#cdeeff';
const scene = new THREE.Scene();
scene.background = new THREE.Color(HORIZON);
scene.fog = new THREE.Fog(HORIZON, 90, 300);
scene.add(new THREE.HemisphereLight('#ffffff', '#6a8f5a', 1.5));
const sun = new THREE.DirectionalLight('#fff1d6', 2.2);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 400 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

// Sky: gradient dome + low poly clouds.
const skyGeo = new THREE.SphereGeometry(900, 24, 12);
const skyCols = [], top = new THREE.Color('#4fa8f0'), hor = new THREE.Color(HORIZON);
for (let i = 0; i < skyGeo.attributes.position.count; i++) {
  const c = hor.clone().lerp(top, Math.pow(Math.max(0, skyGeo.attributes.position.getY(i) / 900), 0.6));
  skyCols.push(c.r, c.g, c.b);
}
skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyCols, 3));
const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
scene.add(sky);
const puffs = [];
for (let i = 0; i < 40; i++) {
  const x = -400 + ((i * 197) % 1400), z = -600 + ((i * 331) % 1300), y = 70 + (i % 5) * 9;
  for (let k = 0; k < 4; k++) {
    const g = new THREE.IcosahedronGeometry(5 + ((i + k) % 3) * 2, 0);
    g.deleteAttribute('uv');
    puffs.push(g.scale(1.4, 0.7, 1).translate(x + k * 6 - 9, y + (k % 2) * 2, z + (k % 3) * 3));
  }
}
const clouds = new THREE.Mesh(mergeGeometries(puffs), new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, emissive: '#555555' }));
scene.add(clouds);

const camera = new THREE.PerspectiveCamera(settings.fov, 1, 0.1, 2000);

// ---- World ------------------------------------------------------------------------
const world = createWorld();
scene.add(world.group);

// ---- Monuments: one builder per site (data/facts.js has their texts in the same order) ----
const MONUMENTS = {
  france: [() => ({ object: eiffelTower(), colliders: EIFFEL_COLLIDERS })],
  belgium: [atomium],
  netherlands: [windmill],
  uk: [bigBen],
  germany: [brandenburgGate, neuschwanstein],
  spain: [sagradaFamilia],
  italy: [colosseum, pisa],
  greece: [parthenon],
};
// Monuments face the island's port (rotations of 90° only, so boxes stay boxes).
const FACING = { south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 };
const animated = [];

function place(isl, site, m, rot) {
  m.object.position.set(site.x - isl.center.x, site.y, site.z - isl.center.z);
  m.object.rotation.y += rot;
  isl.group.add(m.object); // hidden together with its island when far away
  const c = Math.round(Math.cos(rot)), s = Math.round(Math.sin(rot));
  const tx = (x, z) => [site.x + x * c + z * s, site.z - x * s + z * c];
  for (const col of m.colliders) {
    if (col.r !== undefined) {
      const [x, z] = tx(col.x, col.z);
      isl.colliders.push({ ...col, x, z, top: col.top + site.y });
    } else {
      const [ax, az] = tx(col.x0, col.z0), [bx, bz] = tx(col.x1, col.z1);
      isl.colliders.push({ ...col, x0: Math.min(ax, bx), x1: Math.max(ax, bx), z0: Math.min(az, bz), z1: Math.max(az, bz), top: col.top + site.y });
    }
  }
  if (m.update) animated.push(m.update);
  return m;
}

const shots = []; // the welcome screen flies around every monument, one after the other
for (const isl of world.islands) {
  const rot = isl.cfg.id === 'france' ? 0 : FACING[isl.cfg.port];
  MONUMENTS[isl.cfg.id].forEach((build, i) => {
    const m = place(isl, isl.sites[i] ?? isl.plaza, build(), rot);
    shots.push({ isl, name: COUNTRIES[isl.cfg.id].monuments[i].name, object: m.object, rot });
  });
  for (const spot of isl.spots) place(isl, spot, windmill(), Math.round(Math.random() * 4) * (Math.PI / 2));
}
world.group.updateMatrixWorld(true);
for (const s of shots) {
  const b = new THREE.Box3().setFromObject(s.object), size = b.getSize(new THREE.Vector3());
  s.center = b.getCenter(new THREE.Vector3());
  s.base = b.min.y;
  s.size = size;
}

// Easter eggs: a funny scene hidden on every island, turned towards the island centre.
const eggs = world.islands.map((isl) => {
  const e = EGG_BUILDERS[isl.cfg.id](), { x, z, y } = isl.egg;
  const rot = Math.atan2(isl.center.x - x, isl.center.z - z), c = Math.cos(rot), s = Math.sin(rot);
  e.group.position.set(x - isl.center.x, y, z - isl.center.z);
  e.group.rotation.y = rot;
  isl.group.add(e.group);
  for (const col of e.colliders) isl.colliders.push({ ...col, x: x + col.x * c + col.z * s, z: z - col.x * s + col.z * c, top: col.top + y });
  return { id: isl.cfg.id, isl, x, z, ...e };
});

// Islands with a harbour get a boat, islands with an airport get a plane.
const fleet = world.islands.map((isl) => ({ isl, boat: isl.boatSpot && createBoat(isl.boatSpot), plane: isl.planeSpot && createPlane(isl.planeSpot) }));
const vehicles = fleet.flatMap((f) => [f.boat, f.plane]).filter(Boolean);
for (const v of vehicles) {
  scene.add(v.group);
  v.onCrash = () => sounds.crash();
}

// Atlas: the body is rebuilt when the clothes change in the wardrobe.
const atlas = {
  group: new THREE.Group(),
  body: null,
  step: null,
  animate: (dt, state) => atlas.body.animate(dt, state),
  land: (k) => atlas.body.land(k),
  set onStep(fn) { atlas.step = atlas.body.onStep = fn; },
};
let look = loadLook();
function dress(newLook) {
  look = newLook;
  if (atlas.body) {
    atlas.group.remove(atlas.body.group);
    atlas.body.group.traverse((o) => o.geometry?.dispose());
  }
  atlas.body = createCharacter(look);
  if (atlas.step) atlas.body.onStep = atlas.step;
  atlas.group.add(atlas.body.group);
}
dress(look);
atlas.group.rotation.y = Math.PI;
scene.add(atlas.group);

const npcs = createNPCs(world, scene, PEOPLE);

const playerCollider = { x: 0, z: 0, r: 0.4, top: 0 };
const dynamicColliders = () => [
  ...npcs.colliders(),
  ...vehicles.filter((v) => v.kind === 'plane' && v !== player.vehicle && !v.hidden).map((v) => ({ x: v.pos.x, z: v.pos.z, r: 2.4, top: v.pos.y + 2.5 })),
];
const player = createPlayer({ atlas, camera, world, spawn: world.spawn, dom: canvas, sounds, dynamicColliders });
player.teleport(world.spawn, Math.PI);

// Menus that stop the game while they are open (travel map, quiz, passport...).
const overlayHooks = {
  pause: () => {
    playing = false;
    $('egg').hidden = true;
    document.exitPointerLock();
  },
  resume: () => play(),
  portrait: () => portrait(look),
};
const passport = createPassport({ sounds, hooks: overlayHooks, onChange: () => updateStamps() });
const minimap = createMinimap(world);
const travel = createTravel({ world, scene, fleet, player, sounds, hooks: overlayHooks, stamps: () => passport.stamps() });
if (import.meta.env.DEV) window.game = { player, world, camera, renderer, npcs, vehicles, travel, passport };

// Things you can read about: the monuments of each island.
const monuments = world.islands.flatMap((isl) =>
  COUNTRIES[isl.cfg.id].monuments.map((m, i) => {
    const site = isl.sites[i] ?? isl.plaza;
    const facing = isl.cfg.id === 'france' ? 0 : FACING[isl.cfg.port];
    return {
      ...m, country: isl.cfg.id, x: site.x, z: site.z, y: site.y, siteR: site.r, facing,
      cityX: isl.center.x, cityZ: isl.center.z, cityR: isl.cfg.R, radius: isl.cfg.id === 'france' ? 22 : site.r + 4,
    };
  }),
);
const tours = createTours({
  world, scene, monuments,
  hooks: {
    ...overlayHooks,
    hasStamp: (id) => passport.has(id),
    award: (id) => passport.award(id),
    sound: (right) => (right ? sounds.welcome() : sounds.land()),
  },
});
const dialog = createDialog({
  sounds,
  hooks: overlayHooks,
  onOpen: (n) => (npcs.talk(n, Infinity), passport.metPerson(n.name)),
  onClose: (n) => npcs.talk(n, 0),
});
const wardrobe = createWardrobe({ sounds, onDone: dress });
if (import.meta.env.DEV) Object.assign(window.game, { tours, dialog, wardrobe, eggs });

// ---- Settings ------------------------------------------------------------------------
let quality = QUALITY[settings.quality];
function applySettings() {
  quality = QUALITY[settings.quality];
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality.pixelRatio));
  const shadows = quality.shadows > 0;
  if (shadows) {
    sun.shadow.mapSize.set(quality.shadows, quality.shadows);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }
  if (renderer.shadowMap.enabled !== shadows) {
    renderer.shadowMap.enabled = shadows;
    scene.traverse((o) => o.material && (o.material.needsUpdate = true));
  }
  scene.fog.near = quality.view * 0.35;
  scene.fog.far = quality.view;
  camera.fov = settings.fov;
  camera.updateProjectionMatrix();
  setVolumes(settings);
}
onSettingsChange(applySettings);
applySettings();

// ---- Game state & UI ---------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
let started = false, playing = false;
let interaction = { e: null, f: null };
let currentIsland = null;

const ui = createUI({
  onResume: () => play(),
  onQuit: () => quitToTitle(),
  onOpenMap: () => openMap(),
  onOpenPassport: () => (ui.closeMenu(), passport.openPassport()),
  onOpenWardrobe: () => wardrobe.open(),
});
$('open-wardrobe').onclick = () => wardrobe.open();
$('logo-flags').append(...Object.keys(COUNTRIES).map((id) => Object.assign(document.createElement('img'), { src: flagOf(id), alt: '' })));
$('quit-game').hidden = !window.nativeVoice; // only in the .exe: a browser tab can't close itself
$('quit-game').onclick = () => window.close();

// Easter egg found: a little card at the top of the screen.
let eggTimer = 0;
function showEgg(e) {
  $('egg-kicker').textContent = `🥚 Easter egg found! (${passport.eggs} / ${eggs.length})`;
  $('egg-title').textContent = EGGS[e.id].title;
  $('egg-text').textContent = EGGS[e.id].text;
  $('egg').hidden = false;
  sounds.welcome();
  clearTimeout(eggTimer);
  eggTimer = setTimeout(() => ($('egg').hidden = true), 12000);
}
$('egg').onclick = () => ($('egg').hidden = true);

function updateStamps() {
  $('stamps-n').textContent = passport.count;
  $('play').innerHTML = passport.count ? `▶&nbsp; Continue (${passport.count}/${passport.total})` : '▶&nbsp; Play';
  $('new-game').hidden = passport.count === 0;
}
updateStamps();
$('new-game').onclick = () => {
  if (confirm('Start a new passport? All your stamps will be deleted.')) passport.reset();
};

function lockPointer() {
  canvas.requestPointerLock()?.catch?.(() => {}); // not allowed in some embedded pages: mouse drag still works
}
function play() {
  initAudio(settings);
  if (!started) {
    started = true;
    $('welcome').classList.add('leaving');
    camera.clearViewOffset();
    $('hud').hidden = false;
    // Browser: go full screen (the Electron app already starts full screen).
    if (!document.fullscreenElement && innerHeight < screen.height - 40) document.documentElement.requestFullscreen?.().catch(() => {});
  }
  ui.closeMenu();
  ui.hideMap();
  playing = true;
  lockPointer();
}
function pause() {
  if (!started || !playing) return;
  playing = false;
  $('egg').hidden = true;
  setEngine(null);
  ui.openMenu('pause');
}
function quitToTitle() {
  started = playing = false;
  ui.closeMenu();
  $('hud').hidden = true;
  $('welcome').classList.remove('leaving');
  setEngine(null);
  travel.abort();
  player.teleport(world.spawn, Math.PI);
  document.exitPointerLock();
}
function openMap() {
  playing = false;
  ui.closeMenu();
  ui.showMap(world, player, () => passport.stamps());
  document.exitPointerLock();
}
$('play').onclick = play;
canvas.onclick = () => started && playing && document.pointerLockElement !== canvas && lockPointer();
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && playing) pause(); // Esc pressed
});

addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyM' && started && !ui.menuOpen && !passport.open && !travel.menuOpen) return ui.mapOpen ? play() : openMap();
  if (e.code === 'KeyP' && started && !ui.menuOpen && !ui.mapOpen && !travel.menuOpen)
    return passport.open ? passport.close() : playing && passport.openPassport();
  if (tours.active) {
    if (e.code === 'Escape') return tours.end();
    if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'Enter') return tours.next();
    if (e.code === 'ArrowLeft') return tours.prev();
    return;
  }
  if (dialog.isOpen) return e.code === 'Escape' && dialog.close();
  if (wardrobe.isOpen) return e.code === 'Escape' && wardrobe.close();
  if (e.code === 'Escape') {
    if (passport.open) return passport.close();
    if (travel.menuOpen) return travel.cancelMenu();
    if (ui.mapOpen) return play();
    if (ui.menuOpen) return ui.backInMenu();
    if (playing) return pause();
  }
  if (!playing) return;
  if (e.code === 'Space' && travel.travelling) return travel.skip();
  if (e.code === 'KeyE' && interaction.e) interaction.e.run();
  if (e.code === 'KeyF' && interaction.f) interaction.f.run();
});

// What can you do right now? (E = talk / read, F = get out when you drive yourself)
let exitCheck = 0, canExit = false;
function findInteractions(dt) {
  const p = player.position;
  interaction = { e: null, f: null };
  if (player.vehicle) {
    if (player.vehicle.auto) return; // the pilot/captain is driving
    exitCheck -= dt;
    if (exitCheck <= 0) (exitCheck = 0.25), (canExit = !!player.vehicle.exitPoint(world));
    if (canExit) interaction.f = { label: `Press <kbd>F</kbd> – Get out`, run: () => player.exit() };
    return;
  }
  let best = 3;
  for (const m of travel.crew) {
    const d = Math.hypot(m.pos.x - p.x, m.pos.z - p.z);
    if (d < best) {
      best = d;
      interaction.e = { label: `Press <kbd>E</kbd> – Talk to ${m.name} (${m.kind === 'plane' ? 'flights' : 'boat trips'})`, run: () => (sounds.talk(), travel.openMenu(m)) };
    }
  }
  for (const g of tours.guides) {
    const d = Math.hypot(g.pos.x - p.x, g.pos.z - p.z);
    if (d < best) {
      best = d;
      interaction.e = { label: `Press <kbd>E</kbd> – Guided tour of the ${g.monument.name} with ${g.name}`, run: () => (passport.readFact(g.monument.id), tours.start(g, camera)) };
    }
  }
  for (const n of npcs.list) {
    const d = Math.hypot(n.pos.x - p.x, n.pos.z - p.z);
    if (n.ch.group.visible && d < best) {
      best = d;
      interaction.e = { label: `Press <kbd>E</kbd> – Talk to ${n.name}`, run: () => dialog.open(n) };
    }
  }
}
// ---- Welcome screen: a slow flight around every monument, one after the other ----------------
const SHOT = 9; // seconds per monument
let shown = -1;
function welcomeCamera(t) {
  t = Math.max(0, t || 0); // the first frame can have no time (or a tiny negative one)
  const i = Math.floor(t / SHOT) % shots.length, k = (t % SHOT) / SHOT, s = shots[i];
  const r = Math.max(s.size.x, s.size.z) * 0.7 + s.size.y * 0.75 + 14;
  const a = s.rot - 0.45 + k * 0.9; // sweep in front of the monument
  camera.position.set(s.center.x + Math.sin(a) * r, s.base + s.size.y * 0.45 + 6 + r * 0.12, s.center.z + Math.cos(a) * r);
  camera.lookAt(s.center.x, s.base + s.size.y * 0.42, s.center.z);
  // The menu covers the left part of the screen: show the monument in the free part.
  const side = innerWidth > 900 ? $('welcome').querySelector('.welcome-side').offsetWidth / 2 : 0;
  if (camera.view?.offsetX !== -side || camera.view.fullWidth !== innerWidth || camera.view.fullHeight !== innerHeight) camera.setViewOffset(innerWidth, innerHeight, -side, 0, innerWidth, innerHeight);
  // Fade to dark between two monuments
  const edge = Math.min(k * SHOT, (1 - k) * SHOT);
  $('welcome-curtain').style.opacity = Math.max(0, 1 - edge / 0.8).toFixed(2);
  if (i !== shown) {
    shown = i;
    $('now-flag').src = flagOf(s.isl.cfg.id);
    $('now-country').textContent = COUNTRIES[s.isl.cfg.id].name;
    $('now-name').textContent = s.name;
    $('now-showing').classList.remove('out');
  }
  $('now-showing').classList.toggle('out', (1 - k) * SHOT < 0.9);
}

// ---- Loop ---------------------------------------------------------------------
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const timer = new THREE.Timer();
let frames = 0, fpsTime = 0, saveTimer = 0;
renderer.setAnimationLoop((now) => {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.05);
  const t = timer.getElapsed();

  if (started) {
    // The guided tour moves the camera; otherwise Atlas (in pause the plane/boat stops too).
    if (!tours.update(dt, camera, player.position) && (playing || !player.vehicle)) player.update(dt, playing, t);
    $('hud').hidden = tours.active;
  } else welcomeCamera(t);
  const focus = started ? player.position : camera.position;
  Object.assign(playerCollider, { x: focus.x, z: focus.z, top: focus.y + 2 });
  npcs.update(dt, focus, [playerCollider]);
  for (const update of animated) update(dt);
  for (const e of eggs) if (e.isl.group.visible && Math.hypot(e.x - focus.x, e.z - focus.z) < 70) e.update(dt, t);
  travel.update(dt, focus);
  if (playing) passport.tick(dt);
  if ((saveTimer += dt) > 15) (saveTimer = 0), passport.saveTime();

  if (started) {
    findInteractions(dt);
    for (const e of eggs) if (!player.vehicle && Math.hypot(e.x - focus.x, e.z - focus.z) < 6.5 && passport.foundEgg(e.id)) showEgg(e);
    ui.prompt(playing ? [interaction.e?.label, interaction.f?.label].filter(Boolean) : []);

    // Which island are we on?
    const isl = world.islandAt(focus.x, focus.z);
    if (isl !== currentIsland) {
      currentIsland = isl;
      if (isl) {
        ui.banner(isl.cfg.id);
        sounds.welcome();
      }
      ui.setPlace(isl?.cfg.id, isl ? COUNTRIES[isl.cfg.id].name : player.vehicle?.kind === 'plane' ? 'Flying over the sea' : 'Open sea');
    }

    // Engine sound
    const v = player.vehicle;
    setEngine(v && playing ? v.kind : null, v ? Math.min(1, Math.abs(v.speed) / (v.kind === 'plane' ? 60 : 30)) : 0);
    updateAmbience(dt, !!isl && !v && playing);

    // Round minimap while on the boat or the plane
    $('minimap-box').hidden = !v;
    if (v) {
      const dest = travel.destination;
      minimap.render({ x: v.pos.x, z: v.pos.z, heading: v.heading, kind: v.kind, dest });
      const label = dest ? `${v.kind === 'plane' ? '✈' : '⚓'} to ${COUNTRIES[dest.cfg.id].name}` : v.kind === 'plane' ? '✈ Plane' : '⚓ Boat';
      if ($('minimap-label').textContent !== label) $('minimap-label').textContent = label;
    }
  }

  // Sun and shadows follow the player, sky follows the camera.
  sun.target.position.copy(focus);
  sun.position.set(focus.x + 60, focus.y + 110, focus.z + 40);
  sky.position.copy(camera.position);
  clouds.position.x = Math.sin(t * 0.02) * 40;
  world.update(t, focus, quality.view, quality.waves);
  for (const v of vehicles) v.group.visible = !v.hidden && Math.hypot(v.pos.x - focus.x, v.pos.z - focus.z) < quality.view + 50;

  renderer.render(scene, camera);

  frames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    ui.fps(Math.round(frames / fpsTime));
    frames = fpsTime = 0;
  }
});
