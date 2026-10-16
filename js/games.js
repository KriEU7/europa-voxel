// Things to do on the islands:
// - missions: somebody on every island lost something (data/facts.js – MISSIONS);
// - penalty kicks against a goalkeeper in the football countries;
// - the tulip hunt in the Netherlands: collect 10 golden tulips in 60 seconds.
// Rewards (⭐ missions, 🏅 medals) are saved in the passport.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { part } from './world.js';
import { textured } from './textures.js';
import { freeSpot } from './kiosks.js';
import { createCharacter } from './models/character.js';
import { MISSIONS, COUNTRIES } from './data/facts.js';

const FOOTBALL = ['italy', 'spain', 'uk', 'germany'];
const GOALS_TO_WIN = 3, TULIPS = 10, TULIP_TIME = 60;
const box = (w, h, d, x, y, z, c) => part(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z), c);

// A floating emoji that always faces the camera.
function emojiSprite(icon, size = 1.3) {
  const c = Object.assign(document.createElement('canvas'), { width: 128, height: 128 }), g = c.getContext('2d');
  g.font = '100px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(icon, 64, 72);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
}

function goalModel() {
  const g = [];
  for (const x of [-2.5, 2.5]) g.push(part(new THREE.CylinderGeometry(0.12, 0.12, 2.3, 6).translate(x, 1.15, 0), '#ffffff'));
  g.push(part(new THREE.CylinderGeometry(0.12, 0.12, 5.2, 6).rotateZ(Math.PI / 2).translate(0, 2.3, 0), '#ffffff'));
  for (const x of [-2.5, 2.5]) g.push(box(0.08, 0.08, 1.5, x, 0, -0.75, '#ffffff'));
  const net = [box(5, 2.3, 0.05, 0, 0, -1.5, '#ffffff'), box(0.05, 2.3, 1.5, -2.5, 0, -0.75, '#ffffff'), box(0.05, 2.3, 1.5, 2.5, 0, -0.75, '#ffffff'), box(5, 0.05, 1.5, 0, 2.28, -0.75, '#ffffff')];
  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(mergeGeometries(g), textured()),
    new THREE.Mesh(mergeGeometries(net), textured({ transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })),
  );
  group.children[0].castShadow = true;
  return group;
}

export function createGames({ world, npcs, life, passport, sounds, toast, showCard }) {
  const L = (isl) => life.islands.find((l) => l.isl === isl);

  // ---- Missions -------------------------------------------------------------------------
  const missions = [];
  for (const isl of world.islands) {
    const m = MISSIONS[isl.cfg.id], giver = npcs.list.find((n) => n.isl === isl && !n.silent);
    const spot = m && giver && freeSpot(world, isl, isl.plaza.r + 12, isl.cfg.R * 0.9, 1.5);
    if (!spot) continue;
    const s = emojiSprite(m.icon);
    s.position.set(spot.x - isl.center.x, spot.y + 1, spot.z - isl.center.z);
    isl.group.add(s);
    missions.push({ ...m, id: isl.cfg.id, isl, giver, sprite: s, spot, state: passport.mission(isl.cfg.id) === 'done' ? 'done' : 'none' });
  }
  for (const m of missions) m.sprite.visible = false;

  // Extra buttons in the chat with the person who lost something.
  function chatExtras(n) {
    const m = missions.find((x) => x.giver === n);
    if (!m || m.state === 'done') return [];
    if (m.state === 'none') return [{ q: '🙋 Can I help you?', a: m.ask, run: () => ((m.state = 'search'), (m.sprite.visible = true)) }];
    if (m.state === 'found')
      return [{ q: `${m.icon} Here is your ${m.item}!`, a: m.thanks, run: () => {
        m.state = 'done';
        passport.mission(m.id, 'done');
        sounds.welcome();
        toast(`⭐ Mission complete! (${passport.missions} / ${missions.length})`);
      } }];
    return [];
  }

  // ---- Penalty kicks ------------------------------------------------------------------------
  const pitches = [];
  for (const id of FOOTBALL) {
    const isl = world.byId[id], l = L(isl);
    const spot = l?.ball && freeSpot(world, isl, isl.plaza.r + 8, isl.cfg.R * 0.8, 6);
    if (!spot) continue;
    // Turned by 90° steps towards the plaza, so the net colliders stay boxes.
    const h = Math.round(Math.atan2(isl.plaza.x - spot.x, isl.plaza.z - spot.z) / (Math.PI / 2)) * (Math.PI / 2);
    const f = { x: Math.round(Math.sin(h)), z: Math.round(Math.cos(h)) }, r = { x: f.z, z: -f.x }; // forward, right
    const at = (lx, lz) => ({ x: spot.x + r.x * lx + f.x * lz, z: spot.z + r.z * lx + f.z * lz });
    const goal = goalModel();
    goal.position.set(spot.x - isl.center.x, spot.y, spot.z - isl.center.z);
    goal.rotation.y = h;
    isl.group.add(goal);
    for (const lx of [-2.5, 2.5]) isl.colliders.push({ ...at(lx, 0), r: 0.15, top: spot.y + 2.3 });
    const wall = (a, b) => {
      const p = at(...a), q = at(...b);
      isl.colliders.push({ x0: Math.min(p.x, q.x), x1: Math.max(p.x, q.x), z0: Math.min(p.z, q.z), z1: Math.max(p.z, q.z), top: spot.y + 2.3 });
    };
    wall([-2.55, -1.55], [2.55, -1.45]);
    wall([-2.55, -1.5], [-2.45, 0]);
    wall([2.45, -1.5], [2.55, 0]);
    const keeper = createCharacter({ hairStyle: 'short', bottom: 'shorts', top: 'tshirt', shirt: '#ffeb3b', pants: '#222222', skin: '#e0ac80', hat: 'cap', hatColor: '#222222', seed: 3 });
    keeper.group.rotation.y = h;
    isl.group.add(keeper.group);
    const penalty = at(0, 8);
    pitches.push({ id, isl, ball: l.ball, f, r, spot, keeper, kx: 0, penalty, goals: 0, wait: 0, scored: false, told: false });
    l.ball.pos.set(penalty.x, world.surfaceAt(penalty.x, penalty.z) + l.ball.r, penalty.z);
  }

  function updatePitch(p, dt, t, player) {
    const B = p.ball, s = p.spot;
    // The keeper dives from post to post.
    p.kx = Math.sin(t * 1.7) * 1.9 + Math.sin(t * 4.1) * 0.3;
    const kx = s.x + p.r.x * p.kx + p.f.x * 0.4, kz = s.z + p.r.z * p.kx + p.f.z * 0.4;
    p.keeper.group.position.set(kx - p.isl.center.x, s.y, kz - p.isl.center.z);
    p.keeper.animate(dt, { speed: 0.3 });
    const dx = B.pos.x - s.x, dz = B.pos.z - s.z, lx = dx * p.r.x + dz * p.r.z, lz = dx * p.f.x + dz * p.f.z;
    const toGoal = B.vel.x * p.f.x + B.vel.z * p.f.z;
    if (Math.hypot(B.pos.x - kx, B.pos.z - kz) < 0.9 && B.pos.y - s.y < 2 && toGoal < 0) { // saved!
      B.vel.x -= p.f.x * toGoal * 1.6;
      B.vel.z -= p.f.z * toGoal * 1.6;
      sounds.kick();
      toast('🧤 Saved by the goalkeeper!');
      p.wait = 2;
    }
    if (!p.scored && Math.abs(lx) < 2.4 && lz < -0.3 && lz > -1.5 && B.pos.y - s.y < 2.3) {
      p.scored = true;
      p.wait = 2.5;
      sounds.cheer();
      if (!passport.hasMedal(`penalty-${p.id}`)) {
        p.goals++;
        if (p.goals >= GOALS_TO_WIN) {
          passport.medal(`penalty-${p.id}`);
          showCard('🏆', '🏅 Mini-game won!', { title: `Penalty champion of ${COUNTRIES[p.id].name}!`, text: `You scored ${GOALS_TO_WIN} goals. Football is the most popular sport in Europe: in ${COUNTRIES[p.id].name} millions of people watch the big matches every week!` });
        } else toast(`⚽ GOAL! ${p.goals} / ${GOALS_TO_WIN}`);
      } else toast('⚽ GOAL!');
    }
    // Put the ball back on the penalty spot after a shot.
    const far = Math.hypot(B.pos.x - p.penalty.x, B.pos.z - p.penalty.z);
    if (p.wait > 0 && (p.wait -= dt) <= 0) p.reset = true;
    if (far > 16 || (far > 1.5 && Math.hypot(B.vel.x, B.vel.z) < 0.2 && !p.wait)) p.reset = true;
    if (p.reset) {
      p.reset = p.scored = false;
      p.wait = 0;
      B.vel.set(0, 0, 0);
      B.pos.set(p.penalty.x, world.surfaceAt(p.penalty.x, p.penalty.z) + B.r, p.penalty.z);
    }
    const near = Math.hypot(player.position.x - p.penalty.x, player.position.z - p.penalty.z) < 6;
    if (near && !p.told) toast(passport.hasMedal(`penalty-${p.id}`) ? '⚽ Penalty kicks: you are the champion here!' : `⚽ Penalty kicks! Run into the ball and score ${GOALS_TO_WIN} goals`);
    p.told = near;
  }

  // ---- Tulip hunt -------------------------------------------------------------------------
  const nl = world.byId.netherlands, hunt = { tulips: [], time: 0, on: false, sign: null };
  const signSpot = freeSpot(world, nl, nl.plaza.r + 4, nl.plaza.r + 14, 2.5);
  if (signSpot) {
    const post = new THREE.Mesh(mergeGeometries([box(0.15, 1.6, 0.15, 0, 0, 0, '#6b4a30'), box(1.4, 0.9, 0.12, 0, 1.4, 0, '#ffe08a')]), textured());
    post.position.set(signSpot.x - nl.center.x, signSpot.y, signSpot.z - nl.center.z);
    const icon = emojiSprite('🌷', 1);
    icon.position.set(0, 1.85, 0.1);
    post.add(icon);
    nl.group.add(post);
    nl.colliders.push({ x: signSpot.x, z: signSpot.z, r: 0.3, top: signSpot.y + 2.3 });
    hunt.sign = signSpot;
  }
  function startHunt() {
    for (const tl of hunt.tulips) nl.group.remove(tl.s);
    hunt.tulips = [];
    for (let i = 0; i < TULIPS; i++) {
      const p = freeSpot(world, nl, 4, nl.cfg.R * 1.1, 1);
      if (!p) continue;
      const s = emojiSprite('🌷', 1.1);
      s.material.color.set('#ffd84a'); // golden
      s.position.set(p.x - nl.center.x, p.y + 0.8, p.z - nl.center.z);
      nl.group.add(s);
      hunt.tulips.push({ s, x: p.x, z: p.z });
    }
    hunt.time = TULIP_TIME;
    hunt.on = true;
    sounds.whistle();
  }
  function updateHunt(dt, t, player) {
    hunt.time -= dt;
    for (const tl of hunt.tulips) {
      tl.s.position.y += Math.sin(t * 3 + tl.x) * 0.005;
      if (tl.s.visible && Math.hypot(player.position.x - tl.x, player.position.z - tl.z) < 1.6) (tl.s.visible = false), sounds.pickup();
    }
    const left = hunt.tulips.filter((tl) => tl.s.visible).length;
    if (!left) {
      hunt.on = false;
      const isNew = passport.medal('tulips');
      showCard('🌷', '🏅 Mini-game won!', { title: 'Tulip champion!', text: `You found all the golden tulips with ${Math.ceil(hunt.time)} seconds left! The Netherlands grows billions of tulip bulbs every year, and the flowers came from Turkey in the 1500s.${isNew ? '' : ' (You already had this medal!)'}` });
    } else if (hunt.time <= 0) {
      hunt.on = false;
      for (const tl of hunt.tulips) tl.s.visible = false;
      toast(`⏰ Time's up! You found ${TULIPS - left} / ${TULIPS} tulips. Try again!`);
    } else toast(`🌷 Golden tulips: ${TULIPS - left} / ${TULIPS} · ⏱ ${Math.ceil(hunt.time)} s`);
  }

  return {
    chatExtras,
    // What E does near something of ours (null = nothing here).
    interaction(player) {
      const p = player.position;
      if (hunt.sign && !hunt.on && Math.hypot(p.x - hunt.sign.x, p.z - hunt.sign.z) < 2.5)
        return { label: `Press <kbd>E</kbd> – Start the tulip hunt 🌷 (${TULIPS} golden tulips in ${TULIP_TIME} seconds)`, run: startHunt };
      return null;
    },
    update(dt, t, player) {
      for (const m of missions) {
        if (m.state !== 'search') continue;
        m.sprite.position.y = m.spot.y + 1 + Math.sin(t * 3) * 0.2;
        if (Math.hypot(player.position.x - m.spot.x, player.position.z - m.spot.z) < 1.8) {
          m.state = 'found';
          m.sprite.visible = false;
          sounds.pickup();
          toast(`${m.icon} You found the ${m.item}! Bring it back to ${m.giver.name}`);
        }
      }
      for (const p of pitches) if (p.isl.group.visible && !player.vehicle) updatePitch(p, dt, t, player);
      if (hunt.on) updateHunt(dt, t, player);
    },
  };
}
