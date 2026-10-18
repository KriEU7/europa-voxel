// Things to do on the islands:
// - missions: somebody on every island lost something (data/facts.js – MISSIONS);
// - the tulip hunt in the Netherlands: collect 10 golden tulips in 60 seconds.
// Rewards (⭐ missions, 🏅 medals) are saved in the passport.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { part } from './world.js';
import { textured } from './textures.js';
import { freeSpot } from './kiosks.js';
import { MISSIONS } from './data/facts.js';

const TULIPS = 10, TULIP_TIME = 60;
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

export function createGames({ world, npcs, passport, sounds, toast, showCard }) {
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
      if (hunt.on) updateHunt(dt, t, player);
    },
  };
}
