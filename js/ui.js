// Menus and HUD: welcome screen, full screen pause/settings/help menu, map, fact card, banner.
import { settings, updateSetting } from './settings.js';
import { sounds } from './audio.js';
import { flagOf, flagImg } from './flags.js';
import { createMapView } from './mapview.js';
import { COUNTRIES } from './data/facts.js';

const $ = (id) => document.getElementById(id);
for (const id of Object.keys(COUNTRIES)) flagImg(id); // decode early for the maps

const QUALITY_NOTES = {
  low: 'Low: no shadows, still sea, shorter view distance – for slow computers.',
  medium: 'Medium: soft shadows and waves, medium view distance.',
  high: 'High: sharp shadows, waves and long view distance – needs a graphics card.',
};

export function createUI({ onResume, onQuit, onOpenMap, onOpenPassport, onOpenWardrobe }) {
  let mode = 'title'; // 'title' (from the welcome screen) or 'pause'

  // Little click/hover sounds on every button.
  for (const b of document.querySelectorAll('button')) {
    b.addEventListener('click', () => sounds.click());
    b.addEventListener('mouseenter', () => sounds.hover());
  }

  // ---- Settings controls ----
  const fmt = (el) => {
    const v = Number(el.value), unit = el.dataset.unit;
    return unit === '%' ? `${Math.round(v * 100)}%` : unit === 'x' ? `${v.toFixed(1)}x` : `${v}${unit}`;
  };
  for (const el of document.querySelectorAll('[data-setting]')) {
    const key = el.dataset.setting;
    if (el.type === 'checkbox') {
      el.checked = settings[key];
      el.onchange = () => updateSetting(key, el.checked);
    } else {
      el.value = settings[key];
      el.nextElementSibling.textContent = fmt(el);
      el.oninput = () => {
        updateSetting(key, Number(el.value));
        el.nextElementSibling.textContent = fmt(el);
      };
    }
  }
  const showQuality = () => {
    for (const b of document.querySelectorAll('[data-quality]')) b.classList.toggle('active', b.dataset.quality === settings.quality);
    $('quality-note').textContent = QUALITY_NOTES[settings.quality];
  };
  for (const b of document.querySelectorAll('[data-quality]')) b.onclick = () => (updateSetting('quality', b.dataset.quality), showQuality());
  showQuality();
  for (const t of document.querySelectorAll('[data-tab]'))
    t.onclick = () => {
      for (const x of document.querySelectorAll('[data-tab]')) x.classList.toggle('active', x === t);
      for (const p of document.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== t.dataset.tab;
    };

  // ---- Full screen menu ----
  function openMenu(m, section = null) {
    mode = m;
    $('menu').hidden = false;
    $('menu-title').textContent = m === 'pause' ? 'Paused' : 'Europa Voxel';
    $('menu-kicker').textContent = m === 'pause' ? 'Game paused' : 'Main menu';
    for (const b of document.querySelectorAll('#menu [data-action]')) {
      const a = b.dataset.action;
      b.hidden = m === 'pause' ? a === 'back' : a !== 'back';
    }
    showSection(section);
  }
  function showSection(section) {
    $('sec-settings').hidden = section !== 'settings';
    $('sec-help').hidden = section !== 'help';
    for (const b of document.querySelectorAll('#menu [data-open]')) b.classList.toggle('primary', b.dataset.open === section);
  }
  const closeMenu = () => ($('menu').hidden = true);

  for (const b of document.querySelectorAll('[data-open]'))
    b.onclick = () => ($('menu').hidden ? openMenu('title', b.dataset.open) : showSection(b.dataset.open));
  for (const b of document.querySelectorAll('[data-action]'))
    b.onclick = () => {
      const a = b.dataset.action;
      if (a === 'resume') onResume();
      if (a === 'back') closeMenu();
      if (a === 'quit') onQuit();
      if (a === 'map') onOpenMap();
      if (a === 'passport') onOpenPassport();
      if (a === 'wardrobe') onOpenWardrobe();
    };

  // ---- Map (M): the same illustrated map as the travel menu ----
  let mapView = null, mapFrame = 0;
  function drawMap(world, player, stamps) {
    mapView ??= createMapView($('map-canvas'), world);
    const loop = (now) => {
      mapView.render({ t: now / 1000, player: { x: player.position.x, z: player.position.z, facing: player.facing }, stamps: stamps() });
      mapFrame = requestAnimationFrame(loop);
    };
    mapFrame = requestAnimationFrame(loop);
  }

  // ---- HUD helpers ----
  let bannerTimer = null;
  return {
    openMenu,
    closeMenu,
    get menuOpen() { return !$('menu').hidden; },
    get menuMode() { return mode; },
    backInMenu() {
      if (!$('sec-settings').hidden || !$('sec-help').hidden) showSection(null);
      else if (mode === 'title') closeMenu();
    },
    showMap(world, player, stamps) {
      $('map').hidden = false;
      drawMap(world, player, stamps);
    },
    hideMap: () => {
      $('map').hidden = true;
      cancelAnimationFrame(mapFrame);
    },
    get mapOpen() { return !$('map').hidden; },
    setPlace(id, label) {
      $('place-flag').src = id ? flagOf(id) : '';
      $('place-name').textContent = label;
    },
    banner(id) {
      $('banner-flag').src = flagOf(id);
      $('banner-name').textContent = `${COUNTRIES[id].name}!`;
      const b = $('banner');
      b.hidden = false;
      b.style.animation = 'none';
      void b.offsetWidth; // restart the animation
      b.style.animation = '';
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => (b.hidden = true), 3500);
    },
    prompt(lines) {
      const p = $('prompt');
      p.hidden = lines.length === 0;
      const html = lines.map((l) => `<div>${l}</div>`).join('');
      if (p.innerHTML !== html) p.innerHTML = html;
    },
    fps(value) {
      $('fps').hidden = !settings.showFps;
      if (settings.showFps) $('fps').textContent = `${value} FPS`;
    },
  };
}
