// Wardrobe: change how Atlas looks, from the face to the shoes.
// 3D preview on the left (drag to turn), options on the right. The look is saved in the browser.
import * as THREE from 'three';
import { createCharacter, ATLAS_LOOK } from './models/character.js';

const KEY = 'europa-voxel-look';
const $ = (id) => document.getElementById(id);

export function loadLook() {
  try {
    return { ...ATLAS_LOOK, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { ...ATLAS_LOOK };
  }
}

const SKINS = ['#f5d0b0', '#f1c27d', '#e0ac80', '#c68642', '#a0663a', '#8d5524', '#5c3a21'];
const HAIRS = ['#1a1a1a', '#3b2a1a', '#6b3a1a', '#a0522d', '#c97b3c', '#e8c170', '#9e9e9e', '#f4f4f4', '#e74c3c', '#3d8fd6', '#ec407a'];
const CLOTH = [
  '#3d8fd6', '#1c2f5e', '#1f3264', '#4fc3f7', '#2e7d32', '#7fae4a', '#f2c230', '#ff7f00', '#e74c3c', '#c0392b',
  '#ec407a', '#7b1fa2', '#6d4c41', '#c8b08a', '#f4f4f4', '#9e9e9e', '#222222',
];
const SHOES = ['#6b4423', '#3a2414', '#222222', '#f4f4f4', '#e74c3c', '#3d8fd6', '#2e7d32', '#f2c230'];

// One row per option. `when` hides rows that make no sense (no hat = no hat colour).
const TABS = {
  look: [
    { key: 'skin', label: 'Skin', colors: SKINS },
    { key: 'hairStyle', label: 'Hairstyle', choices: { messy: 'Messy', short: 'Short', long: 'Long', bun: 'Bun', bald: 'Bald' } },
    { key: 'hair', label: 'Hair colour', colors: HAIRS },
    { label: 'Face', toggles: { beard: 'Beard', moustache: 'Moustache', glasses: 'Glasses' } },
  ],
  clothes: [
    { key: 'hat', label: 'Hat', choices: { scout: 'Scout hat', cap: 'Cap', beret: 'Beret', bowler: 'Bowler', sunhat: 'Sun hat', chef: 'Chef', crown: 'Crown', busby: 'Royal Guard', none: 'No hat' } },
    { key: 'hatColor', label: 'Hat colour', colors: CLOTH, when: (o) => !['none', 'crown', 'busby'].includes(o.hat) },
    { key: 'top', label: 'Top', choices: { scout: 'Scout shirt', tshirt: 'T-shirt', striped: 'Stripes', apron: 'Apron', dress: 'Dress' } },
    { key: 'shirt', label: 'Top colour', colors: CLOTH },
    { key: 'stripe', label: 'Stripes colour', colors: CLOTH, when: (o) => o.top === 'striped' },
    { key: 'bottom', label: 'Bottom', choices: { shorts: 'Shorts', long: 'Trousers', skirt: 'Skirt' }, when: (o) => o.top !== 'dress' },
    { key: 'pants', label: 'Bottom colour', colors: CLOTH, when: (o) => o.top !== 'dress' },
    { key: 'socks', label: 'Socks', colors: CLOTH, when: (o) => o.bottom !== 'long' },
    { key: 'shoes', label: 'Shoes', colors: SHOES },
  ],
  extras: [
    { key: 'scarf', label: 'Scarf', colors: [false, '#f2c230', '#e74c3c', '#2e7d32', '#3d8fd6', '#f4f4f4', '#7b1fa2'] },
    { label: 'Things', toggles: { backpack: 'Backpack', watch: 'Watch', camera: 'Camera', baguette: 'Baguette' } },
    { key: 'suspenders', label: 'Suspenders', colors: [false, '#6d4c41', '#222222', '#e74c3c', '#2e7d32'] },
  ],
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function createWardrobe({ sounds, onDone }) {
  let look = loadLook(), tab = 'look', open = false, onClose = null;

  // ---- 3D preview ----
  const canvas = $('wardrobe-canvas');
  let renderer = null, scene, camera, ch = null, frame = 0, spin = 0.4, drag = null, last = 0;
  function setup() {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#8899aa', 2.2));
    const sun = new THREE.DirectionalLight('#fff1d6', 1.8);
    sun.position.set(2, 4, 3);
    scene.add(sun);
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.25, 10), new THREE.MeshLambertMaterial({ color: '#f2c230', flatShading: true }));
    podium.position.y = -0.13;
    scene.add(podium);
    camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  }
  function rebuild() {
    if (ch) {
      scene.remove(ch.group);
      ch.group.traverse((o) => o.geometry?.dispose());
    }
    ch = createCharacter(look);
    ch.group.rotation.y = spin;
    scene.add(ch.group);
  }
  function loop(now) {
    const dt = Math.min((now - last) / 1000 || 0, 0.05);
    last = now;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.set(0, 1.4, w / h < 0.7 ? 8.5 : 6.8);
      camera.lookAt(0, 1.08, 0);
      camera.updateProjectionMatrix();
    }
    if (!drag) spin += dt * 0.5;
    ch.group.rotation.y = spin;
    ch.animate(dt, {});
    renderer.render(scene, camera);
    frame = requestAnimationFrame(loop);
  }
  canvas.onpointerdown = (e) => ((drag = e.clientX), canvas.setPointerCapture(e.pointerId));
  canvas.onpointermove = (e) => drag !== null && ((spin += (e.clientX - drag) * 0.012), (drag = e.clientX));
  canvas.onpointerup = () => (drag = null);

  // ---- Options ----
  const button = (text, active, onclick, cls = '') => {
    const b = Object.assign(document.createElement('button'), { textContent: text, className: `${cls}${active ? ' active' : ''}` });
    b.onclick = () => (sounds.click(), onclick());
    return b;
  };
  function change(key, value) {
    look = { ...look, [key]: value };
    rebuild();
    render();
  }
  function render() {
    for (const b of document.querySelectorAll('[data-wtab]')) b.classList.toggle('active', b.dataset.wtab === tab);
    $('wardrobe-options').replaceChildren(
      ...TABS[tab].filter((row) => !row.when || row.when(look)).map((row) => {
        let items;
        if (row.colors)
          items = row.colors.map((c) => {
            const b = button('', look[row.key] === c || (!c && !look[row.key]), () => change(row.key, c), c ? 'swatch' : 'swatch none');
            if (c) b.style.background = c;
            b.title = c ? c : 'None';
            return b;
          });
        else if (row.choices) items = Object.entries(row.choices).map(([v, text]) => button(text, look[row.key] === v, () => change(row.key, v), 'chip'));
        else items = Object.entries(row.toggles).map(([k, text]) => button(text, !!look[k], () => change(k, !look[k]), 'chip'));
        const div = Object.assign(document.createElement('div'), { className: 'wd-row' });
        div.append(Object.assign(document.createElement('label'), { textContent: row.label }), Object.assign(document.createElement('div'), { className: 'wd-items' }));
        div.lastChild.append(...items);
        return div;
      }),
    );
  }
  for (const b of document.querySelectorAll('[data-wtab]')) b.onclick = () => ((tab = b.dataset.wtab), render());
  $('wd-random').onclick = () => {
    const next = { ...look };
    for (const row of Object.values(TABS).flat()) {
      if (row.colors) next[row.key] = pick(row.colors);
      else if (row.choices) next[row.key] = pick(Object.keys(row.choices));
      else for (const k of Object.keys(row.toggles)) next[k] = Math.random() < 0.3;
    }
    look = next;
    rebuild();
    render();
  };
  $('wd-reset').onclick = () => ((look = { ...ATLAS_LOOK }), rebuild(), render());
  $('wd-done').onclick = () => close();

  function close() {
    if (!open) return;
    open = false;
    $('wardrobe').hidden = true;
    cancelAnimationFrame(frame);
    try { localStorage.setItem(KEY, JSON.stringify(look)); } catch { /* private mode: not saved */ }
    onDone(look);
    onClose?.();
  }

  return {
    get look() { return look; },
    get isOpen() { return open; },
    open(then) {
      onClose = then;
      open = true;
      if (!renderer) setup();
      rebuild();
      render();
      $('wardrobe').hidden = false;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    },
    close,
  };
}
