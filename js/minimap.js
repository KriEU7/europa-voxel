// Round minimap, shown while you are on the boat or the plane. North is always up.
import { drawCreatures } from './models/seacreatures.js';
import { COUNTRIES } from './data/facts.js';
import { flagImg } from './flags.js';

const B = { x0: -480, x1: 1040, z0: -660, z1: 740 }; // world area of the map
const PX = 2; // world units per pixel of the map picture
const SIZE = 220; // size on screen (CSS pixels)
const FONT = "'Segoe UI', system-ui, sans-serif";

export function createMinimap(world) {
  const canvas = document.getElementById('minimap');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = canvas.height = SIZE * dpr;
  let base = null;

  // The whole archipelago as one small picture, drawn the first time it is needed.
  function drawBase() {
    const c = Object.assign(document.createElement('canvas'), { width: (B.x1 - B.x0) / PX, height: (B.z1 - B.z0) / PX });
    const g = c.getContext('2d');
    g.fillStyle = '#2b88c4';
    g.fillRect(0, 0, c.width, c.height);
    for (const isl of world.islands)
      for (let x = isl.center.x - isl.radius; x < isl.center.x + isl.radius; x += 4)
        for (let z = isl.center.z - isl.radius; z < isl.center.z + isl.radius; z += 4) {
          const y = world.surfaceAt(x, z);
          if (y < -2.4) continue;
          g.fillStyle = y < 0.75 ? '#5fb6e0' : y < 1.5 ? '#f3e1a4' : y > 7 ? '#4f9a3f' : '#7cc95a';
          g.fillRect((x - B.x0) / PX, (z - B.z0) / PX, 4 / PX + 0.5, 4 / PX + 0.5);
        }
    return c;
  }

  // x, z, heading of the vehicle; kind 'boat' | 'plane'; dest = island you are travelling to (or null)
  function render({ x, z, heading, kind, dest }) {
    base ??= drawBase();
    const g = canvas.getContext('2d');
    const range = kind === 'plane' ? 420 : 260; // world units from the centre to the edge
    const k = SIZE / 2 / range, c = SIZE / 2;
    const toScreen = (wx, wz) => [c + (wx - x) * k, c + (wz - z) * k];
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, SIZE, SIZE);
    g.save();
    g.beginPath();
    g.arc(c, c, c, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#2b88c4';
    g.fillRect(0, 0, SIZE, SIZE);
    g.drawImage(base, (x - range - B.x0) / PX, (z - range - B.z0) / PX, (2 * range) / PX, (2 * range) / PX, 0, 0, SIZE, SIZE);

    // Islands nearby: flag + name
    g.font = `800 11px ${FONT}`;
    g.textAlign = 'center';
    for (const isl of world.islands) {
      const [sx, sy] = toScreen(isl.center.x, isl.center.z);
      if (Math.hypot(sx - c, sy - c) > c - 10) continue;
      g.drawImage(flagImg(isl.cfg.id), sx - 9, sy - 18, 18, 12);
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(10,22,52,0.85)';
      g.fillStyle = isl === dest ? '#f2c230' : '#ffffff';
      g.strokeText(COUNTRIES[isl.cfg.id].name, sx, sy + 8);
      g.fillText(COUNTRIES[isl.cfg.id].name, sx, sy + 8);
    }

    drawCreatures(g, toScreen, performance.now() / 1000, 0.75);

    // Destination: a marker, or an arrow on the edge when it is far away
    if (dest) {
      const [dx, dy] = toScreen(dest.center.x, dest.center.z);
      const dist = Math.hypot(dx - c, dy - c);
      if (dist > c - 16) {
        const a = Math.atan2(dy - c, dx - c);
        g.save();
        g.translate(c + Math.cos(a) * (c - 14), c + Math.sin(a) * (c - 14));
        g.rotate(a);
        g.fillStyle = '#f2c230';
        g.strokeStyle = '#1c2f5e';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(10, 0);
        g.lineTo(-6, -8);
        g.lineTo(-6, 8);
        g.closePath();
        g.fill();
        g.stroke();
        g.restore();
      } else {
        g.strokeStyle = '#f2c230';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(dx, dy, 14, 0, Math.PI * 2);
        g.stroke();
      }
    }
    g.restore();

    // The vehicle in the middle, pointing where it goes
    g.save();
    g.translate(c, c);
    g.rotate(-heading);
    g.fillStyle = '#f2c230';
    g.strokeStyle = '#1c2f5e';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(0, 12);
    g.lineTo(8, -8);
    g.lineTo(0, -3);
    g.lineTo(-8, -8);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  return { render };
}
