// Sky, light and weather: a day goes by (sunset, stars, lamps and windows lit at night) and every
// country has its own weather – showers over the UK, grey Belgium, hot blue sky in Spain and Greece.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLOW } from './world.js';
import { setRain } from './audio.js';

const DAY = 420; // seconds for a day at normal speed (the night goes 2.5x faster)
// rain: how rainy (showers come and go), grey: cloudy sky, sun: deep blue hot sky
const WEATHER = {
  uk: { rain: 1, grey: 0.6, sun: 0 },
  belgium: { rain: 0.5, grey: 0.35, sun: 0 },
  netherlands: { rain: 0, grey: 0.2, sun: 0 },
  germany: { rain: 0, grey: 0.1, sun: 0 },
  spain: { rain: 0, grey: 0, sun: 1 },
  italy: { rain: 0, grey: 0, sun: 0.6 },
  greece: { rain: 0, grey: 0, sun: 1 },
};
const CLEAR = { rain: 0, grey: 0, sun: 0 };
const col = (h) => new THREE.Color(h);
// [top of the sky, horizon]
const DAYSKY = [col('#4fa8f0'), col('#cdeeff')], SUNSET = [col('#4a6aa8'), col('#ffb27a')], NIGHT = [col('#060e22'), col('#17243f')];
const GREY = [col('#8d99a6'), col('#c3cad1')], HOT = [col('#2a86ec'), col('#d6f0ff')];

// Soft round clouds: smooth shading, white on top and a bit lilac underneath.
const TOP = col('#ffffff'), BELOW = col('#c4c9e4');
function puffs(n, spread, y0, size) {
  const g = [];
  for (let i = 0; i < n; i++) {
    const x = -spread + ((i * 197) % (spread * 2)), z = -spread + ((i * 331) % (spread * 2)), y = y0 + (i % 5) * 9;
    for (let k = 0; k < 4; k++) {
      const r = size + ((i + k) % 3) * 2;
      let p = new THREE.IcosahedronGeometry(r, 1);
      p.deleteAttribute('uv');
      p.deleteAttribute('normal');
      p = mergeVertices(p.scale(1.4, 0.7, 1));
      p.computeVertexNormals();
      const pos = p.attributes.position, c = new Float32Array(pos.count * 3);
      for (let v = 0; v < pos.count; v++) TOP.clone().lerp(BELOW, THREE.MathUtils.smoothstep(-pos.getY(v) / (r * 0.7), -0.2, 0.9)).toArray(c, v * 3);
      p.setAttribute('color', new THREE.BufferAttribute(c, 3));
      g.push(p.translate(x + k * 6 - 9, y + (k % 2) * 2, z + (k % 3) * 3));
    }
  }
  return mergeGeometries(g);
}

// The sun (and the moon): a glowing disc drawn far away in the direction of the light.
function glowSprite() {
  const c = Object.assign(document.createElement('canvas'), { width: 256, height: 256 }), g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,240,1)');
  grad.addColorStop(0.24, 'rgba(255,240,200,0.55)');
  grad.addColorStop(1, 'rgba(255,220,160,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
}

export function createSky(scene) {
  scene.background = new THREE.Color();
  scene.fog = new THREE.Fog('#cdeeff', 90, 300);
  const hemi = new THREE.HemisphereLight('#ffffff', '#6a8f5a', 1.5);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.2);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 400 });
  sun.shadow.bias = -0.0005;
  scene.add(hemi, sun, sun.target);

  // Gradient dome: colours recomputed when the light changes.
  const skyGeo = new THREE.SphereGeometry(900, 24, 12);
  const ys = Array.from({ length: skyGeo.attributes.position.count }, (_, i) => Math.pow(Math.max(0, skyGeo.attributes.position.getY(i) / 900), 0.6));
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(ys.length * 3), 3));
  const dome = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));

  const clouds = new THREE.Mesh(
    (() => { const g = puffs(40, 700, 70, 5); g.translate(300, 0, 50); return g; })(),
    new THREE.MeshLambertMaterial({ color: '#ffffff', vertexColors: true, emissive: '#555555' }),
  );
  // Dark rain clouds right above you when it rains.
  const storm = new THREE.Mesh(puffs(14, 70, 38, 7), new THREE.MeshLambertMaterial({ color: '#6b7480', vertexColors: true, transparent: true, opacity: 0, depthWrite: false }));

  // Stars: points on the upper half of a big sphere.
  const starPos = [];
  for (let i = 0; i < 500; i++) {
    const a = Math.random() * Math.PI * 2, h = 0.08 + Math.random() * 0.92, r = Math.sqrt(1 - h * h);
    starPos.push(Math.cos(a) * r * 850, h * 850, Math.sin(a) * r * 850);
  }
  const starGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));

  // Rain: short lines falling around the camera.
  const DROPS = 1500, BOX = 40;
  const rainPos = new Float32Array(DROPS * 6);
  for (let i = 0; i < DROPS; i++) {
    const x = (Math.random() - 0.5) * BOX * 2, y = Math.random() * BOX, z = (Math.random() - 0.5) * BOX * 2;
    rainPos.set([x, y, z, x + 0.15, y + 0.9, z], i * 6);
  }
  const rainGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#d5dee8', transparent: true, opacity: 0 }));
  rain.frustumCulled = false;
  const disc = glowSprite();
  scene.add(dome, clouds, storm, stars, rain, disc);

  let phase = 0.06; // 0 sunrise, 0.25 noon, 0.5 sunset, 0.75 midnight
  const W = { ...CLEAR };
  const top = new THREE.Color(), hor = new THREE.Color(), tmp = new THREE.Color(), tmp2 = new THREE.Vector3();
  const mix = (pair, k) => (top.lerp(pair[0], k), hor.lerp(pair[1], k));

  return {
    sun,
    night: 0,
    get time() { return phase; },
    set time(p) { phase = p; },
    // dayNight: false = always noon. place: island id (weather), or null at sea.
    update(dt, t, focus, camera, { view, dayNight, weather, place, frozen }) {
      // Time of day
      const h0 = Math.sin(phase * Math.PI * 2);
      if (dayNight && !frozen) phase = (phase + (dt / DAY) * (h0 < -0.1 ? 2.5 : 1)) % 1;
      const p = dayNight ? phase : 0.25, a = p * Math.PI * 2, h = Math.sin(a);
      const light = THREE.MathUtils.smoothstep(h, -0.25, 0.2), dusk = Math.max(0, 1 - Math.abs(h + 0.02) / 0.3);
      this.night = 1 - light;

      // Weather of the island you are on (showers come and go), blended slowly.
      const target = (weather && WEATHER[place]) || CLEAR, k = Math.min(1, dt * 0.4);
      for (const key in W) W[key] += (target[key] - W[key]) * k;
      const shower = THREE.MathUtils.smoothstep(Math.sin(t / 30) + Math.sin(t / 11) * 0.3, -0.3, 0.2);
      const wet = W.rain * shower;

      // Sky colours
      top.copy(NIGHT[0]), hor.copy(NIGHT[1]);
      mix(DAYSKY, light);
      mix(SUNSET, dusk * 0.85);
      mix(HOT, W.sun * light * (1 - dusk));
      mix(GREY, Math.min(1, W.grey + wet * 0.5) * (0.3 + 0.7 * light));
      const c = skyGeo.attributes.color.array;
      for (let i = 0; i < ys.length; i++) tmp.copy(hor).lerp(top, ys[i]), (c[i * 3] = tmp.r), (c[i * 3 + 1] = tmp.g), (c[i * 3 + 2] = tmp.b);
      skyGeo.attributes.color.needsUpdate = true;
      scene.background.copy(hor);
      scene.fog.color.copy(hor);
      scene.fog.far = view * (1 - W.grey * 0.3 - wet * 0.25);
      scene.fog.near = scene.fog.far * 0.35;

      // Sun by day, a bluish moon by night (always from above, so shadows stay sensible).
      const moon = h < 0, dir = moon ? a + Math.PI : a, gloom = 1 - (W.grey + wet) * 0.45;
      sun.color.set(moon ? '#9db4ff' : '#fff1d6').lerp(tmp.set('#ff9a5a'), moon ? 0 : dusk * 0.8);
      sun.intensity = moon ? 0.35 * this.night : (0.2 + 2 * light) * gloom * (1 + W.sun * 0.12);
      sun.target.position.copy(focus);
      sun.position.set(focus.x + Math.cos(dir) * 80, focus.y + 30 + Math.abs(Math.sin(dir)) * 90, focus.z + 40);
      // The glowing disc: big warm sun by day (orange at sunset), small pale moon at night.
      const toSun = tmp2.set(Math.cos(dir) * 80, 30 + Math.abs(Math.sin(dir)) * 90, 40).normalize();
      disc.position.copy(camera.position).addScaledVector(toSun, 700);
      disc.scale.setScalar(moon ? 55 : 150);
      disc.material.color.set(moon ? '#dfe6ff' : '#fff2cc').lerp(tmp.set('#ff9a50'), moon ? 0 : dusk);
      disc.material.opacity = (moon ? this.night : 1) * (1 - Math.min(1, W.grey + wet) * 0.85);
      hemi.intensity = 1.5 * (0.4 + 0.6 * light) * (1 - wet * 0.15);
      hemi.color.set('#ffffff').lerp(tmp.set('#7f93c9'), this.night);

      clouds.material.color.setScalar(0.3 + 0.7 * light).lerp(tmp.set('#9aa3ad'), W.grey * 0.6);
      clouds.material.emissive.setScalar(0.33 * light);
      clouds.position.x = Math.sin(t * 0.02) * 40;
      storm.material.opacity = Math.min(1, wet * 1.4) * 0.92;
      storm.material.color.setScalar(0.42 * (0.4 + 0.6 * light));
      storm.visible = storm.material.opacity > 0.01;
      storm.position.set(camera.position.x, 0, camera.position.z);
      stars.material.opacity = this.night ** 2 * (1 - W.grey);
      stars.visible = stars.material.opacity > 0.01;
      dome.position.copy(camera.position);
      stars.position.copy(camera.position);

      // Windows and street lamps light up when it gets dark.
      GLOW.emissive.setRGB(1, 0.78, 0.4).multiplyScalar(Math.max(this.night, wet * 0.3) * 2.6);

      // Rain
      rain.visible = wet > 0.02;
      rain.material.opacity = Math.min(0.65, wet * 0.8);
      if (rain.visible) {
        rain.position.set(camera.position.x, camera.position.y - BOX / 2, camera.position.z);
        for (let i = 0; i < DROPS; i++) {
          let y = rainPos[i * 6 + 1] - dt * 32;
          if (y < 0) y += BOX;
          rainPos[i * 6 + 1] = y;
          rainPos[i * 6 + 4] = y + 0.9;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
      setRain(wet);
    },
  };
}
