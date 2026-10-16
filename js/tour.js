// City tours: a guide (with the country's flag on a stick) stands near every monument.
// Press E: the camera flies over the city while she tells you about it, then a 5-question test.
// 3 right answers or more = the stamp of the country in the passport.
import * as THREE from 'three';
import { createCharacter } from './models/character.js';
import { GUIDES, COUNTRIES } from './data/facts.js';
import { speak, stopVoice } from './voice.js';
import { portrait } from './portrait.js';

// Height of each monument, to frame it well with the camera.
const HEIGHT = { eiffel: 60, atomium: 28, colosseum: 13, pisa: 18, brandenburg: 16, neuschwanstein: 24, sagrada: 40, windmills: 12, parthenon: 12, bigben: 36 };
// Camera shots, one per slide: 'city' = flight over the whole island, 'near' = around the monument.
// [kind, angle from the monument's front, height]
const SHOTS = [['city', 0.3, 0.9], ['near', 0, 0.35], ['near', 0.9, 0.6], ['city', 2.4, 1.2], ['near', -2.3, 0.45], ['city', -1.4, 0.7], ['near', 0.35, 0.3]];
const LOOK = { hat: 'cap', hatColor: '#f2c230', top: 'tshirt', shirt: '#f2c230', pants: '#1c2f5e' };
const SKINS = ['#f1c27d', '#e0ac80', '#f5d0b0', '#c68642'];
const HAIR = ['#3b2a1a', '#c9a15b', '#1a1a1a', '#8d5524'];
const PASS = 3;

const $ = (id) => document.getElementById(id);
const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);

export function createTours({ world, scene, monuments, hooks }) {
  // ---- The guides ------------------------------------------------------------------
  const guides = [];
  monuments.forEach((m, i) => {
    const info = GUIDES[m.id];
    if (!info) return;
    const f = m.facing, front = [Math.sin(f), Math.cos(f)], side = [Math.cos(f), -Math.sin(f)];
    const x = m.x + front[0] * (m.siteR + 1.5) + side[0] * 3, z = m.z + front[1] * (m.siteR + 1.5) + side[1] * 3;
    const look = { ...LOOK, flagStick: m.country, skin: SKINS[i % 4], hair: HAIR[(i + 1) % 4], hairStyle: i % 2 ? 'bun' : 'long', seed: 90 + i };
    const ch = createCharacter(look);
    ch.group.position.set(x, world.surfaceAt(x, z), z);
    ch.group.rotation.y = f;
    scene.add(ch.group);
    world.islands.find((isl) => isl.contains(x, z))?.colliders.push({ x, z, r: 0.45, top: ch.group.position.y + 2 });
    guides.push({ name: info.guide, monument: m, info, ch, look, pos: ch.group.position, voice: i });
  });

  // ---- The tour ----------------------------------------------------------------------
  let tour = null, token = 0, timer = 0;
  const look = new THREE.Vector3();

  function show(i) {
    const { info, monument } = tour.guide;
    tour.i = i;
    tour.t = 0;
    $('tour-text').textContent = info.slides[i];
    $('tour-count').textContent = `${i + 1} / ${info.slides.length}`;
    $('tour-dots').replaceChildren(...info.slides.map((_, k) => Object.assign(document.createElement('span'), { className: k === i ? 'on' : k < i ? 'done' : '' })));
    $('tour-prev').disabled = i === 0;
    $('tour-next').textContent = i === info.slides.length - 1 ? 'Start the test ▶' : 'Next ▶';
    $('tour-text').classList.remove('appear');
    void $('tour-text').offsetWidth;
    $('tour-text').classList.add('appear');
    // Voice, then go on by itself (a bit later if nobody is talking). The last slide waits for the player.
    const my = ++token, last = i === info.slides.length - 1;
    clearTimeout(timer);
    talking(true);
    const words = info.slides[i].split(' ').length;
    speak(info.slides[i], { file: `voices/${monument.id}-${i + 1}.mp3`, voice: tour.guide.voice, pitch: 1.05 }).then((spoken) => {
      if (my !== token || !tour) return;
      talking(false);
      if (!last) timer = setTimeout(() => my === token && next(), spoken ? 1200 : 2500 + words * 330);
    });
  }
  const talking = (on) => $('tour-photo-box').classList.toggle('talking', on);

  function start(guide, camera) {
    tour = { guide, i: 0, t: 0, test: null };
    look.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10));
    $('tour-kicker').textContent = `City tour · ${COUNTRIES[guide.monument.country].name}`;
    $('tour-name').textContent = guide.info.city;
    $('tour-guide').textContent = guide.name;
    $('tour-photo').src = portrait(guide.look, `guide-${guide.monument.id}`);
    $('tour-sub').hidden = false;
    $('tour-test').hidden = true;
    $('tour').hidden = false;
    hooks.pause();
    show(0);
  }
  function next() {
    if (!tour || tour.test) return;
    if (tour.i < tour.guide.info.slides.length - 1) show(tour.i + 1);
    else startTest();
  }
  function prev() {
    if (tour && !tour.test && tour.i > 0) show(tour.i - 1);
  }
  function end() {
    if (!tour) return;
    token++;
    clearTimeout(timer);
    stopVoice();
    const passed = tour.test?.done && tour.test.score >= PASS;
    const country = tour.guide.monument.country;
    tour = null;
    $('tour').hidden = true;
    // A new stamp: the passport opens with the stamp animation.
    if (passed && !hooks.hasStamp(country)) hooks.award(country);
    else hooks.resume();
  }
  $('tour-next').onclick = next;
  $('tour-prev').onclick = prev;
  $('tour-end').onclick = end;

  // ---- The test: 5 questions about the city ----------------------------------------------
  function startTest() {
    token++;
    clearTimeout(timer);
    stopVoice();
    const g = tour.guide;
    tour.test = { n: 0, score: 0, done: false, questions: g.info.test };
    $('tour-sub').hidden = true;
    $('tour-test').hidden = false;
    $('test-photo').src = $('tour-photo').src;
    $('test-kicker').textContent = `${g.name} · City test`;
    $('test-title').textContent = `How well do you know ${g.info.city}?`;
    question();
  }
  function question() {
    const t = tour.test, item = t.questions[t.n], g = tour.guide;
    $('test-progress').textContent = `Question ${t.n + 1} of ${t.questions.length}`;
    $('test-body').hidden = false;
    $('test-result').hidden = true;
    $('test-retry').hidden = true;
    $('test-next').hidden = true;
    $('test-q').textContent = item.q;
    $('test-feedback').textContent = '';
    $('test-feedback').className = 'quiz-feedback';
    const options = shuffle(item.options.map((text, k) => ({ text, right: k === item.answer })));
    $('test-options').replaceChildren(
      ...options.map((o, k) => {
        const b = document.createElement('button');
        b.className = 'quiz-option';
        b.append(Object.assign(document.createElement('b'), { textContent: 'ABC'[k] }), o.text);
        b.onclick = () => answer(o, b, options);
        return b;
      }),
    );
    speak(item.q, { file: `voices/${g.monument.id}-test${t.n + 1}.mp3`, voice: g.voice, pitch: 1.05 });
  }
  function answer(o, button, options) {
    const t = tour.test, buttons = [...$('test-options').children];
    for (const b of buttons) b.disabled = true;
    buttons[options.findIndex((x) => x.right)].classList.add('right');
    if (o.right) {
      t.score++;
      $('test-feedback').textContent = 'Correct! 🎉';
      $('test-feedback').classList.add('good');
    } else {
      button.classList.add('wrong');
      $('test-feedback').textContent = `Oops! The right answer is "${options.find((x) => x.right).text}".`;
      $('test-feedback').classList.add('bad');
    }
    hooks.sound(o.right);
    $('test-next').textContent = t.n === t.questions.length - 1 ? 'See my score ▶' : 'Next question ▶';
    $('test-next').hidden = false;
  }
  $('test-next').onclick = () => {
    const t = tour.test;
    if (++t.n < t.questions.length) return question();
    // Result
    t.done = true;
    const passed = t.score >= PASS, country = tour.guide.monument.country, g = tour.guide;
    $('test-body').hidden = true;
    $('test-next').hidden = true;
    $('test-result').hidden = false;
    $('test-progress').textContent = '';
    $('test-score').textContent = `${'★'.repeat(t.score)}${'☆'.repeat(t.questions.length - t.score)}  ${t.score} / ${t.questions.length}`;
    $('test-message').textContent = passed
      ? hooks.hasStamp(country)
        ? 'Great job! You already have this stamp in your passport.'
        : `Great job! You won the stamp of ${COUNTRIES[country].name}! 🎉`
      : `You need at least ${PASS} right answers. Listen to the tour again and try once more!`;
    $('test-retry').hidden = passed;
    $('test-close').textContent = passed ? 'Collect my stamp ▶' : 'Close';
    if (hooks.hasStamp(country) && passed) $('test-close').textContent = 'Close';
    speak(passed ? `Great job! You got ${t.score} out of 5!` : `You got ${t.score} out of 5. Try again!`, { voice: g.voice, pitch: 1.05 });
  };
  $('test-retry').onclick = () => {
    tour.test = { n: 0, score: 0, done: false, questions: tour.guide.info.test };
    $('test-close').textContent = 'Close';
    question();
  };
  $('test-close').onclick = end;

  return {
    guides,
    get active() { return !!tour; },
    start, next, prev, end,
    // Moves the camera while a tour is running. Returns false when there is no tour.
    update(dt, camera, focus) {
      for (const g of guides) {
        g.ch.group.visible = Math.hypot(g.pos.x - focus.x, g.pos.z - focus.z) < 300;
        if (g.ch.group.visible && Math.hypot(g.pos.x - focus.x, g.pos.z - focus.z) < 60) g.ch.animate(dt, {});
      }
      if (!tour) return false;
      tour.t += dt;
      const m = tour.guide.monument, H = HEIGHT[m.id] ?? 20;
      const [kind, angle, height] = tour.test ? ['city', 1.2, 0.8] : SHOTS[tour.i % SHOTS.length];
      const a = m.facing + angle + tour.t * (kind === 'city' ? 0.06 : 0.035); // slow flight around
      let want, target;
      if (kind === 'city') {
        // Over the whole island ("the city"), looking at its centre
        const R = m.cityR * 1.5;
        want = new THREE.Vector3(m.cityX + Math.sin(a) * R, 12 + m.cityR * height, m.cityZ + Math.cos(a) * R);
        target = new THREE.Vector3(m.cityX, 2, m.cityZ);
      } else {
        const R = Math.max(m.siteR * 1.7, H * 1.15) + 8;
        want = new THREE.Vector3(m.x + Math.sin(a) * R, m.y + 3 + H * height, m.z + Math.cos(a) * R);
        target = new THREE.Vector3(m.x, m.y + H * 0.45, m.z);
      }
      want.y = Math.max(want.y, world.surfaceAt(want.x, want.z) + 2);
      camera.position.lerp(want, 1 - Math.exp(-dt * 1.1));
      look.lerp(target, 1 - Math.exp(-dt * 1.6));
      camera.lookAt(look);
      return true;
    },
  };
}
