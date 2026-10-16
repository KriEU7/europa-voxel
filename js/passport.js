// City test -> stamp -> passport -> "You explored Europe!".
// Progress is saved in the browser, so closing the game does not lose the stamps.
import { COUNTRIES } from './data/facts.js';
import { flagOf } from './flags.js';
import { ICONS } from './mapview.js';

const KEY = 'europa-voxel-progress';
const INK = {
  france: '#1f4fa3', belgium: '#b8262f', netherlands: '#d9661f', uk: '#7a1f5c',
  germany: '#333333', spain: '#c0392b', italy: '#1f7a3f', greece: '#1f5fa8',
};
const IDS = Object.keys(COUNTRIES);
const $ = (id) => document.getElementById(id);
function build(tag, props, children = []) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
}
const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

export function createPassport({ sounds, hooks, onChange }) {
  const fresh = () => ({ stamps: {}, facts: [], people: [], eggs: [], foods: [], missions: {}, medals: [], playSeconds: 0, finaleSeen: false });
  let data = { ...fresh(), ...load() };
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* private mode: progress not saved */ }
    onChange?.();
  };
  const count = () => Object.keys(data.stamps).length;

  // ---- Passport ------------------------------------------------------------------------
  let passportOpen = false;
  function openPassport(newStamp = null) {
    passportOpen = true;
    $('pp-photo').src = hooks.portrait();
    $('pp-count').textContent = `${count()} / ${IDS.length}`;
    $('pp-eggs').textContent = `🥚 ${data.eggs.length} / ${IDS.length}`;
    $('pp-foods').textContent = `🍽 ${data.foods.length} / ${IDS.length}`;
    $('pp-missions').textContent = `⭐ ${Object.keys(data.missions).length} / ${IDS.length}`;
    $('pp-medals').textContent = `🏅 ${data.medals.length}`;
    $('pp-stamps').replaceChildren(
      ...IDS.map((id, i) => {
        const name = COUNTRIES[id].name;
        if (!data.stamps[id]) return build('div', { className: 'stamp-slot' }, [build('span', {}, ['?']), build('small', {}, [name])]);
        const s = build('div', { className: `stamp${id === newStamp ? ' new' : ''}` }, [
          build('span', { className: 'stamp-icon' }, [ICONS[id]]),
          build('b', {}, [name.replace('The ', '').toUpperCase()]),
          build('img', { src: flagOf(id), alt: '' }),
          build('small', {}, [data.stamps[id]]),
        ]);
        s.style.setProperty('--ink', INK[id]);
        s.style.setProperty('--tilt', `${((i * 37) % 21) - 10}deg`);
        return s;
      }),
    );
    $('passport').hidden = false;
    if (newStamp) setTimeout(() => sounds.stamp(), 350);
    hooks.pause();
  }
  function closePassport() {
    $('passport').hidden = true;
    passportOpen = false;
    if (count() === IDS.length && !data.finaleSeen) return openFinale();
    hooks.resume();
  }
  $('passport-close').onclick = closePassport;

  // ---- Final screen ------------------------------------------------------------------------
  let confettiFrame = 0;
  function openFinale() {
    data.finaleSeen = true;
    save();
    const minutes = Math.max(1, Math.round(data.playSeconds / 60));
    $('finale-stats').replaceChildren(
      build('li', {}, [build('b', {}, [`${IDS.length}/${IDS.length}`]), ' stamps in the passport']),
      build('li', {}, [build('b', {}, [String(data.facts.length)]), ' monuments discovered']),
      build('li', {}, [build('b', {}, [String(data.people.length)]), ' people met']),
      build('li', {}, [build('b', {}, [`${data.eggs.length}/${IDS.length}`]), ' easter eggs found']),
      build('li', {}, [build('b', {}, [`${data.foods.length}/${IDS.length}`]), ' local foods tasted']),
      build('li', {}, [build('b', {}, [`${Object.keys(data.missions).length}/${IDS.length}`]), ' missions completed']),
      build('li', {}, [build('b', {}, [String(data.medals.length)]), ' mini-game medals']),
      build('li', {}, [build('b', {}, [String(minutes)]), ` minute${minutes > 1 ? 's' : ''} of travelling`]),
    );
    $('finale').hidden = false;
    sounds.welcome();
    hooks.pause();
    confetti();
  }
  function closeFinale() {
    $('finale').hidden = true;
    cancelAnimationFrame(confettiFrame);
  }
  $('finale-continue').onclick = () => (closeFinale(), hooks.resume());
  $('finale-passport').onclick = () => (closeFinale(), openPassport());

  function confetti() {
    const c = $('confetti'), g = c.getContext('2d');
    c.width = innerWidth;
    c.height = innerHeight;
    const colors = ['#f2c230', '#3d8fd6', '#ef4135', '#009246', '#ffffff', '#ff7f00'];
    const bits = Array.from({ length: 160 }, () => ({
      x: Math.random() * c.width, y: -Math.random() * c.height, s: 6 + Math.random() * 8,
      v: 1.5 + Math.random() * 2.5, a: Math.random() * 6, w: (Math.random() - 0.5) * 0.2, c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const loop = () => {
      g.clearRect(0, 0, c.width, c.height);
      for (const b of bits) {
        b.y += b.v;
        b.a += b.w;
        b.x += Math.sin(b.a) * 1.2;
        if (b.y > c.height) b.y = -10;
        g.save();
        g.translate(b.x, b.y);
        g.rotate(b.a);
        g.fillStyle = b.c;
        g.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
        g.restore();
      }
      confettiFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  return {
    get count() { return count(); },
    get total() { return IDS.length; },
    stamps: () => new Set(Object.keys(data.stamps)),
    has: (id) => !!data.stamps[id],
    get open() { return passportOpen || !$('finale').hidden; },
    openPassport,
    // Stamp won somewhere else (the city test of a tour).
    award(id) {
      data.stamps[id] = today();
      save();
      openPassport(id);
    },
    // Esc / P: close whatever is open.
    close() {
      if (passportOpen) closePassport();
      else if (!$('finale').hidden) $('finale-continue').onclick();
    },
    // A city tour started: counts as a monument discovered (final screen).
    readFact(monumentId) {
      if (!data.facts.includes(monumentId)) (data.facts.push(monumentId), save());
    },
    // true the first time this easter egg is found
    foundEgg(id) {
      if (data.eggs.includes(id)) return false;
      data.eggs.push(id);
      save();
      return true;
    },
    get eggs() { return data.eggs.length; },
    // true the first time this island's food is tasted
    tasteFood(id) {
      if (data.foods.includes(id)) return false;
      data.foods.push(id);
      save();
      return true;
    },
    get foods() { return data.foods.length; },
    // mission(id) -> 'done' or undefined; mission(id, 'done') saves it
    mission(id, state) {
      if (state) (data.missions[id] = state), save();
      return data.missions[id];
    },
    get missions() { return Object.keys(data.missions).length; },
    hasMedal: (id) => data.medals.includes(id),
    // true the first time this medal is won
    medal(id) {
      if (data.medals.includes(id)) return false;
      data.medals.push(id);
      save();
      return true;
    },
    metPerson(name) {
      if (!data.people.includes(name)) (data.people.push(name), save());
    },
    tick(dt) {
      data.playSeconds += dt;
    },
    saveTime: save,
    reset() {
      data = fresh();
      save();
    },
  };
}
