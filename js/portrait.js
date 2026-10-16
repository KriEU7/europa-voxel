// Portrait photos of the characters (passport, chat, tours), rendered once with a small renderer.
import * as THREE from 'three';
import { createCharacter } from './models/character.js';

let renderer = null, scene = null, camera = null;
const cache = new Map();

export function portrait(look, key = JSON.stringify(look)) {
  if (cache.has(key)) return cache.get(key);
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(300, 368, false);
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#8899aa', 2.4));
    const light = new THREE.DirectionalLight('#ffffff', 1.6);
    light.position.set(1, 2, 3);
    scene.add(light);
    camera = new THREE.PerspectiveCamera(30, 300 / 368, 0.1, 50);
    camera.position.set(0.5, 1.65, 3.8);
    camera.lookAt(0, 1.5, 0);
  }
  const ch = createCharacter(look);
  ch.group.rotation.y = 0.35;
  ch.animate(0.016, {});
  scene.add(ch.group);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL();
  scene.remove(ch.group);
  ch.group.traverse((o) => o.geometry?.dispose());
  cache.set(key, url);
  return url;
}
