import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createWorld } from './world.js';
import { textureOn } from './textures.js';
import { eiffelTower, EIFFEL_COLLIDERS } from './models/france.js';
import { atomium, colosseum, pisa, brandenburgGate, neuschwanstein, sagradaFamilia, windmill, parthenon, bigBen } from './models/monuments.js';
import { createCharacter } from './models/character.js';
import { EGG_BUILDERS, EGGS } from './models/eggs.js';
import { createSeaCreatures } from './models/seacreatures.js';
import { createLife } from './life.js';
import { createSky } from './sky.js';
import { createKiosks, freeSpot } from './kiosks.js';
import { createAlbum } from './album.js';
import { createGames } from './games.js';
import { createBoat, createPlane, createBalloon } from './vehicles.js';
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
import { initAudio, setVolumes, sounds, setEngine, updateAmbience, setMusic } from './audio.js';
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

const scene = new THREE.Scene();
const sky = createSky(scene);
const sun = sky.sun;

const camera = new THREE.PerspectiveCamera(settings.fov, 1, 0.1, 2000);
// Quality "High" only: a soft glow around the sun, lit windows and lamps.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.5, 1.4));
composer.addPass(new OutputPass());

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

// Sea easter eggs: Nessie & co. come up from the water now and then (found from the boat).
const sea = createSeaCreatures(scene);
const kiosks = createKiosks({ world });
// A hot air balloon on the start island, near the Eiffel Tower.
const balloonSpot = freeSpot(world, world.byId.france, 24, 48, 4);
const balloon = balloonSpot && createBalloon(balloonSpot);
const life = createLife({ world, scene, sounds });
const seaSeen = new Set();

// Islands with a harbour get a boat, islands with an airport get a plane.
const fleet = world.islands.map((isl) => ({ isl, boat: isl.boatSpot && createBoat(isl.boatSpot), plane: isl.planeSpot && createPlane(isl.planeSpot) }));
const vehicles = [...fleet.flatMap((f) => [f.boat, f.plane]), balloon].filter(Boolean);
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
  ...vehicles.filter((v) => v.kind !== 'boat' && v !== player.vehicle && !v.hidden).map((v) => ({ x: v.pos.x, z: v.pos.z, r: v.kind === 'plane' ? 2.4 : 1.4, top: v.pos.y + 2.5 })),
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
  extras: (n) => games.chatExtras(n),
});
const wardrobe = createWardrobe({ sounds, onDone: dress });
let toastTimer = 0;
function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').hidden = true), 2500);
}
const album = createAlbum({ sounds, hooks: { ...overlayHooks, toast } });
let photoRequest = false;
const games = createGames({ world, npcs, passport, sounds, toast, showCard });
// What is in the photo? The monument you are looking at, otherwise where you are.
function photoCaption() {
  const dir = camera.getWorldDirection(new THREE.Vector3()), len = Math.hypot(dir.x, dir.z) || 1;
  let best = null, bestD = 90;
  for (const m of monuments) {
    const dx = m.x - camera.position.x, dz = m.z - camera.position.z, d = Math.hypot(dx, dz);
    if (d < bestD && (dx * dir.x + dz * dir.z) / (d * len) > 0.6) (best = m), (bestD = d);
  }
  if (best) return `${best.name}, ${COUNTRIES[best.country].name}`;
  const c = sea.list.find((c) => c.up > 0.5 && Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < 120);
  if (c) return c.title;
  const isl = world.islandAt(player.position.x, player.position.z);
  return isl ? `${sky.night > 0.6 ? 'A night' : 'A day'} in ${COUNTRIES[isl.cfg.id].name}` : player.vehicle?.kind === 'plane' ? 'Flying over the sea' : 'Sailing on the open sea';
}
document.getElementById('open-album').onclick = () => (passport.close(), album.open());
if (import.meta.env.DEV) Object.assign(window.game, { tours, dialog, wardrobe, eggs, sea, life, sky, kiosks, games, balloon });

// ---- Settings ------------------------------------------------------------------------
let quality = QUALITY[settings.quality];
function applySettings() {
  quality = QUALITY[settings.quality];
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality.pixelRatio));
  composer.setPixelRatio(Math.min(devicePixelRatio, quality.pixelRatio));
  textureOn.value = settings.quality === 'low' ? 0 : 1; // detail textures cost time on slow computers
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
  onOpenAlbum: () => (ui.closeMenu(), album.open()),
});
$('open-wardrobe').onclick = () => wardrobe.open();
$('logo-flags').append(...Object.keys(COUNTRIES).map((id) => Object.assign(document.createElement('img'), { src: flagOf(id), alt: '' })));
$('quit-game').hidden = !window.nativeVoice; // only in the .exe: a browser tab can't close itself
$('quit-game').onclick = () => window.close();

// Easter egg found: a little card at the top of the screen.
let eggTimer = 0;
function showCard(icon, kicker, { title, text }) {
  document.querySelector('.egg-icon').textContent = icon;
  $('egg-kicker').textContent = kicker;
  $('egg-title').textContent = title;
  $('egg-text').textContent = text;
  $('egg').hidden = false;
  sounds.welcome();
  clearTimeout(eggTimer);
  eggTimer = setTimeout(() => ($('egg').hidden = true), 12000);
}
function eat(k) {
  sounds.eat();
  const isNew = passport.tasteFood(k.id);
  showCard(k.icon, isNew ? `🍽 New food! Food passport ${passport.foods} / ${kiosks.list.length}` : '🍽 Yum! Again!', { title: `${k.food} · ${COUNTRIES[k.id].name}`, text: k.text });
}
const showEgg = (e) => showCard('🥚', `🥚 Easter egg found! (${passport.eggs} / ${eggs.length})`, EGGS[e.id]);
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
  if (e.code === 'KeyM' && started && !ui.menuOpen && !passport.open && !travel.menuOpen && !album.isOpen) return ui.mapOpen ? play() : openMap();
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
  if (album.isOpen) return e.code === 'Escape' && album.close();
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
  if (e.code === 'KeyC') photoRequest = true;
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
  if (player.seated) {
    interaction.e = { label: `Press <kbd>E</kbd> – Stand up`, run: () => player.stand() };
    return;
  }
  let best = 3;
  for (const b of currentIsland?.benches ?? []) {
    const d = Math.hypot(b.x - p.x, b.z - p.z);
    if (d < 1.8 && d < best) (best = d), (interaction.e = { label: `Press <kbd>E</kbd> – Sit on the bench`, run: () => player.sit(b) });
  }
  for (const m of travel.crew) {
    const d = Math.hypot(m.pos.x - p.x, m.pos.z - p.z);
    if (d < best) {
      best = d;
      interaction.e = { label: `Press <kbd>E</kbd> – Talk to ${m.name} (${m.kind === 'plane' ? 'flights' : 'boat trips'})`, run: () => (sounds.talk(), travel.openMenu(m)) };
    }
  }
  if (balloon && Math.hypot(balloon.pos.x - p.x, balloon.pos.z - p.z) < 3.2) {
    best = Math.hypot(balloon.pos.x - p.x, balloon.pos.z - p.z);
    interaction.e = { label: `Press <kbd>E</kbd> – Fly the hot air balloon 🎈`, run: () => (player.enter(balloon), toast('🎈 Space: burner (up) · Shift: down · W/A/S/D: drift · F: get out on land')) };
  }
  for (const k of kiosks.list) {
    const d = Math.hypot(k.x - p.x, k.z - p.z);
    if (d < best) {
      best = d;
      interaction.e = { label: `Press <kbd>E</kbd> – Taste the ${k.food.toLowerCase()} ${k.icon}`, run: () => eat(k) };
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
  interaction.e ??= games.interaction(player);
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
  composer.setSize(innerWidth, innerHeight);
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
  sea.update(t);
  life.update(dt, t, started ? player : { position: focus, vehicle: true });
  kiosks.update(dt);
  travel.update(dt, focus);
  if (playing) passport.tick(dt), games.update(dt, t, player);
  if ((saveTimer += dt) > 15) (saveTimer = 0), passport.saveTime();

  if (started) {
    findInteractions(dt);
    for (const e of eggs) if (!player.vehicle && Math.hypot(e.x - focus.x, e.z - focus.z) < 6.5 && passport.foundEgg(e.id)) showEgg(e);
    for (const c of sea.list)
      if (player.vehicle && c.up > 0.5 && !seaSeen.has(c.id) && Math.hypot(c.x - focus.x, c.z - focus.z) < 60) seaSeen.add(c.id), showCard(c.icon, '🌊 Sea secret spotted!', c);
    ui.prompt(playing ? [interaction.e?.label, interaction.f?.label].filter(Boolean) : []);

    // Which island are we on?
    const isl = world.islandAt(focus.x, focus.z);
    if (isl !== currentIsland) {
      currentIsland = isl;
      setMusic(isl?.cfg.id);
      if (isl) {
        ui.banner(isl.cfg.id);
        sounds.welcome();
      }
      ui.setPlace(isl?.cfg.id, isl ? COUNTRIES[isl.cfg.id].name : player.vehicle && player.vehicle.kind !== 'boat' ? 'Flying over the sea' : 'Open sea');
    }

    // Engine sound
    const v = player.vehicle;
    setEngine(v && playing ? v.kind : null, !v ? 0 : v.kind === 'balloon' ? +v.burning : Math.min(1, Math.abs(v.speed) / (v.kind === 'plane' ? 60 : 30)));
    updateAmbience(dt, !!isl && !v && playing);

    // Round minimap while on the boat or the plane
    $('minimap-box').hidden = !v;
    if (v) {
      const dest = travel.destination;
      minimap.render({ x: v.pos.x, z: v.pos.z, heading: v.heading, kind: v.kind, dest });
      const label = dest ? `${v.kind === 'plane' ? '✈' : '⚓'} to ${COUNTRIES[dest.cfg.id].name}` : { plane: '✈ Plane', boat: '⚓ Boat', balloon: '🎈 Balloon' }[v.kind];
      if ($('minimap-label').textContent !== label) $('minimap-label').textContent = label;
    }
  }

  // Sun, sky, day and night, weather (the welcome screen stays at noon).
  sky.update(dt, t, focus, camera, {
    view: quality.view, dayNight: settings.dayNight && started, weather: settings.weather,
    place: started ? currentIsland?.cfg.id : null, frozen: !playing,
  });
  world.update(t, focus, quality.view, quality.waves);
  for (const v of vehicles) v.group.visible = !v.hidden && Math.hypot(v.pos.x - focus.x, v.pos.z - focus.z) < quality.view + 50;

  if (settings.quality === 'high') composer.render(dt);
  else renderer.render(scene, camera);
  if (photoRequest) (photoRequest = false), album.snap(canvas, photoCaption());

  frames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    ui.fps(Math.round(frames / fpsTime));
    frames = fpsTime = 0;
  }
});
