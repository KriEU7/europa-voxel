// Travelling between islands: a pilot at every runway and a captain at every pier.
// Talk to them, choose an island in the menu, and the plane/boat takes you there by itself.
import * as THREE from 'three';
import { createCharacter } from './models/character.js';
import { PIER_TOP } from './world.js';
import { flagOf } from './flags.js';
import { createMapView, ICONS } from './mapview.js';
import { COUNTRIES, CREW } from './data/facts.js';

const PILOT = { hat: 'cap', hatColor: '#1c2f5e', top: 'tshirt', shirt: '#f4f4f4', pants: '#1c2f5e', hair: '#3b2a1a', watch: true };
const CAPTAIN = { hat: 'cap', hatColor: '#ffffff', top: 'striped', shirt: '#1c2f5e', stripe: '#ffffff', pants: '#1c2f5e', hair: '#9e9e9e', beard: true };

const $ = (id) => document.getElementById(id);
const V = (x, z) => new THREE.Vector3(x, 0, z);

export function createTravel({ world, scene, fleet, player, sounds, hooks, stamps = () => new Set() }) {
  // ---- Crew --------------------------------------------------------------------
  const crew = [];
  function addCrew(kind, look, x, y, z, heading, island, vehicle) {
    const ch = createCharacter({ ...look, seed: crew.length + 50 });
    ch.group.position.set(x, y, z);
    ch.group.rotation.y = heading;
    scene.add(ch.group);
    const name = CREW[island.cfg.id][kind === 'plane' ? 'pilot' : 'captain'];
    crew.push({ kind, name, ch, pos: ch.group.position, island, vehicle });
    island.colliders.push({ x, z, r: 0.45, top: y + 2 });
  }
  for (const { isl, boat, plane } of fleet) {
    if (plane) {
      const s = isl.planeSpot;
      addCrew('plane', PILOT, s.x - 6.5, world.surfaceAt(s.x - 6.5, s.z + 1), s.z + 1, Math.PI / 2, isl, plane);
    }
    if (boat) {
      const p = isl.pier, perp = [p.dz, p.dx];
      addCrew('boat', CAPTAIN, p.x + p.dx * 11 + perp[0] * 0.6, PIER_TOP, p.z + p.dz * 11 + perp[1] * 0.6, Math.atan2(perp[0], perp[1]), isl, boat);
    }
  }
  const reachable = (isl, kind) => !!(kind === 'plane' ? isl.planeSpot : isl.boatSpot);

  const boatRoute = world.boatRoute;
  const length = (start, pts) => pts.reduce((sum, p, i) => sum + p.distanceTo(i ? pts[i - 1] : start), 0);

  // ---- Menu: an illustrated map, click an island to choose it ------------------------
  const map = createMapView($('travel-canvas'), world);
  let menuFor = null, hover = null, selected = null, frame = 0;
  const seconds = (from, to, plane) =>
    plane
      ? (Math.hypot(to.planeSpot.x - from.planeSpot.x, to.planeSpot.z - from.planeSpot.z) + 160) / 50
      : length(V(from.boatSpot.x, from.boatSpot.z), boatRoute(from, to)) / 27;

  function draw(now) {
    if (!menuFor) return;
    map.render({ t: now / 1000, from: menuFor.island, hover, selected, kind: menuFor.kind, stamps: stamps(), reachable: (isl) => reachable(isl, menuFor.kind) });
    frame = requestAnimationFrame(draw);
  }
  function select(isl) {
    if (!isl || isl === menuFor.island) return;
    const plane = menuFor.kind === 'plane', c = COUNTRIES[isl.cfg.id], ok = reachable(isl, menuFor.kind);
    selected = ok ? isl : null;
    $('travel-flag').src = flagOf(isl.cfg.id);
    $('travel-name').textContent = c.name;
    $('travel-sights').replaceChildren(...c.monuments.map((m) => Object.assign(document.createElement('li'), { textContent: `${ICONS[isl.cfg.id]}  ${m.name}` })));
    $('travel-time').textContent = !ok
      ? plane ? '⚓ No airport here: you can only go there by boat! Take a boat from France.' : '✈ No harbour here: you can only go there by plane! Take a plane from France.'
      : `${plane ? '✈ Flight' : '⚓ Boat trip'}: about ${Math.round(seconds(menuFor.island, isl, plane))} seconds`;
    $('travel-go').hidden = !ok;
    $('travel-go').textContent = `${plane ? '✈ Fly' : '⚓ Sail'} to ${c.name}!`;
    $('travel-info').hidden = false;
    sounds.click();
  }
  const canvas = $('travel-canvas');
  canvas.onmousemove = (e) => {
    const isl = map.islandAt(e.clientX, e.clientY);
    hover = isl && menuFor && reachable(isl, menuFor.kind) ? isl : null;
    canvas.style.cursor = isl && isl !== menuFor?.island ? 'pointer' : 'default';
  };
  canvas.onmouseleave = () => (hover = null);
  canvas.onclick = (e) => select(map.islandAt(e.clientX, e.clientY));
  $('travel-go').onclick = () => {
    const member = menuFor, dest = selected;
    closeMenu();
    start(member, dest);
  };

  function openMenu(member) {
    menuFor = member;
    hover = selected = null;
    const plane = member.kind === 'plane';
    $('travel-who').textContent = `${plane ? '✈' : '⚓'} ${member.name}`;
    $('travel-title').textContent = plane ? 'Where do you want to fly?' : 'Where do you want to sail?';
    $('travel-self').textContent = plane ? 'Fly it yourself' : 'Sail it yourself';
    $('travel-info').hidden = true;
    $('travel').hidden = false;
    hooks.pause();
    frame = requestAnimationFrame(draw);
  }
  function closeMenu() {
    $('travel').hidden = true;
    menuFor = null;
    cancelAnimationFrame(frame);
  }
  $('travel-cancel').onclick = () => (closeMenu(), hooks.resume());
  $('travel-self').onclick = () => {
    const member = menuFor;
    closeMenu();
    hooks.resume();
    if (member.vehicle.pos.distanceTo(V(member.vehicle.home.x, member.vehicle.home.z).setY(member.vehicle.pos.y)) > 3) member.vehicle.sendHome(world);
    player.enter(member.vehicle);
  };

  // ---- Trips ---------------------------------------------------------------------------
  let trip = null;
  function start(member, dest) {
    const v = member.vehicle, to = fleet.find((f) => f.isl === dest);
    if (!to[member.kind]) return;
    v.sendHome(world); // start from its parking spot, wherever it was left
    const destVehicle = member.kind === 'plane' ? to.plane : to.boat;
    destVehicle.hidden = true; // the one we travel with will take its place
    player.enter(v);
    if (member.kind === 'plane') v.flyTo(dest.planeSpot);
    else v.sailTo(boatRoute(member.island, dest));
    trip = { v, destVehicle, dest, kind: member.kind, ending: false };
    $('trip-text').textContent = `${member.kind === 'plane' ? '✈ Flying' : '⚓ Sailing'} to ${COUNTRIES[dest.cfg.id].name}`;
    $('trip').hidden = false;
    hooks.resume();
  }
  function finish() {
    if (!trip || trip.ending) return;
    trip.ending = true;
    $('fade').classList.add('on');
    setTimeout(() => {
      const { v, destVehicle, dest, kind } = trip;
      v.sendHome(world);
      destVehicle.hidden = false;
      let p;
      if (kind === 'plane') {
        p = V(dest.planeSpot.x - 4.5, dest.planeSpot.z + 3.5);
        p.y = world.surfaceAt(p.x, p.z);
      } else {
        p = V(dest.pier.x + dest.pier.dx * 8, dest.pier.z + dest.pier.dz * 8).setY(PIER_TOP);
      }
      player.teleport(p, Math.atan2(dest.center.x - p.x, dest.center.z - p.z));
      trip = null;
      $('trip').hidden = true;
      $('fade').classList.remove('on');
    }, 600);
  }

  return {
    crew,
    get menuOpen() { return !!menuFor; },
    get travelling() { return !!trip; },
    get destination() { return trip?.dest ?? null; },
    openMenu,
    cancelMenu() {
      closeMenu();
      hooks.resume();
    },
    skip: finish,
    // Back to the main menu in the middle of a trip: put everything back in place.
    abort() {
      if (!trip) return;
      trip.v.sendHome(world);
      trip.destVehicle.hidden = false;
      trip = null;
      $('trip').hidden = true;
    },
    update(dt, focus) {
      if (trip?.v.arrived) finish();
      for (const m of crew) {
        m.ch.group.visible = m.island.group.visible;
        if (Math.hypot(m.pos.x - focus.x, m.pos.z - focus.z) < 60) m.ch.animate(dt, {});
      }
    },
  };
}
