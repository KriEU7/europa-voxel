// Illustrated map of the archipelago, drawn on a canvas.
// Used by the travel menu (pilot / captain) and by the map (M).
import { COUNTRIES } from './data/facts.js';
import { flagImg } from './flags.js';

export const ICONS = { france: '🗼', belgium: '⚛️', netherlands: '🌷', uk: '🕰️', germany: '🏰', spain: '⛪', italy: '🏟️', greece: '🏛️' };
const B = { x0: -460, x1: 1020, z0: -640, z1: 720 }; // world area shown
const FONT = "'Segoe UI', system-ui, sans-serif";

export function createMapView(canvas, world) {
  let base = null, W = 0, H = 0, k = 1, ox = 0, oz = 0, dpr = 1;
  const sx = (x) => ox + (x - B.x0) * k;
  const sz = (z) => oz + (z - B.z0) * k;
  const centre = (isl) => ({ x: sx(isl.center.x), y: sz(isl.center.z) });

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === W && h === H && base) return;
    W = w;
    H = h;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    k = Math.min((W - 60) / (B.x1 - B.x0), (H - 60) / (B.z1 - B.z0));
    ox = (W - (B.x1 - B.x0) * k) / 2;
    oz = (H - (B.z1 - B.z0) * k) / 2;
    base = drawBase();
  }

  // Sea, islands, grid and compass: drawn once per size.
  function drawBase() {
    const c = Object.assign(document.createElement('canvas'), { width: W * dpr, height: H * dpr });
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const sea = g.createLinearGradient(0, 0, 0, H);
    sea.addColorStop(0, '#6fd0f4');
    sea.addColorStop(1, '#2786c4');
    g.fillStyle = sea;
    g.fillRect(0, 0, W, H);

    // Little waves
    g.strokeStyle = 'rgba(255,255,255,0.28)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 160; i++) {
      const x = (i * 97) % W, y = (i * 61 + (i % 7) * 37) % H;
      g.beginPath();
      g.arc(x, y, 5, Math.PI * 1.15, Math.PI * 1.85);
      g.arc(x + 9, y, 5, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    }
    // Grid of meridians and parallels
    g.strokeStyle = 'rgba(255,255,255,0.13)';
    g.setLineDash([6, 8]);
    for (let x = -400; x <= 1000; x += 200) (g.beginPath(), g.moveTo(sx(x), 0), g.lineTo(sx(x), H), g.stroke());
    for (let z = -600; z <= 700; z += 200) (g.beginPath(), g.moveTo(0, sz(z)), g.lineTo(W, sz(z)), g.stroke());
    g.setLineDash([]);

    // Islands, pixel by pixel (a "voxel" map!)
    const step = 3, px = step * k + 0.6;
    const cells = [];
    for (const isl of world.islands) {
      const r = isl.radius;
      for (let x = isl.center.x - r; x < isl.center.x + r; x += step)
        for (let z = isl.center.z - r; z < isl.center.z + r; z += step) {
          const y = world.surfaceAt(x, z);
          if (y > -2.4) cells.push([x, z, y]);
        }
    }
    g.fillStyle = 'rgba(10, 40, 90, 0.25)'; // shadow
    for (const [x, z, y] of cells) if (y > 0.75) g.fillRect(sx(x) + 4, sz(z) + 6, px, px);
    for (const [x, z, y] of cells) {
      g.fillStyle = y < 0.2 ? 'rgba(170, 235, 250, 0.55)' : y < 0.75 ? '#a9e6f4' : y < 1.5 ? '#f3e1a4' : y > 9 ? '#4f9a3f' : y > 5 ? '#62b24a' : '#7cc95a';
      g.fillRect(sx(x), sz(z), px, px);
    }

    // Compass rose
    const cx = 70, cy = H - 80;
    g.save();
    g.translate(cx, cy);
    g.fillStyle = 'rgba(255,250,240,0.9)';
    g.beginPath();
    g.arc(0, 0, 34, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 4; i++) {
      g.rotate(Math.PI / 2);
      g.fillStyle = i % 2 ? '#1c2f5e' : '#f2c230';
      g.beginPath();
      g.moveTo(0, -30);
      g.lineTo(7, 0);
      g.lineTo(-7, 0);
      g.closePath();
      g.fill();
    }
    g.fillStyle = '#1c2f5e';
    g.font = `800 13px ${FONT}`;
    g.textAlign = 'center';
    g.fillText('N', 0, -38);
    g.restore();
    return c;
  }

  function pill(g, x, y, text, { flag, bg = 'rgba(255,250,240,0.95)', color = '#1c2f5e', scale = 1 } = {}) {
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    g.font = `800 14px ${FONT}`;
    const tw = g.measureText(text).width, w = tw + (flag ? 40 : 18), h = 26;
    g.fillStyle = 'rgba(10,30,70,0.3)';
    roundRect(g, -w / 2 + 2, -h / 2 + 3, w, h, 13);
    g.fill();
    g.fillStyle = bg;
    roundRect(g, -w / 2, -h / 2, w, h, 13);
    g.fill();
    if (flag) g.drawImage(flagImg(flag), -w / 2 + 8, -7, 21, 14);
    g.fillStyle = color;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(text, -w / 2 + (flag ? 34 : 9), 1);
    g.restore();
  }

  // Path drawn on the map between two islands: an arc for planes, the real route for boats.
  function routePoints(from, to, kind) {
    if (kind === 'boat') return [{ x: from.boatSpot.x, z: from.boatSpot.z }, ...world.boatRoute(from, to)].map((p) => ({ x: sx(p.x), y: sz(p.z) }));
    const a = centre(from), b = centre(to), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const cxp = mx - (dy / len) * len * 0.18, cyp = my + (dx / len) * len * 0.18;
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * cxp + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * cyp + t * t * b.y });
    }
    return pts;
  }

  function pointAlong(pts, f) {
    const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
    let d = lens.reduce((a, b) => a + b, 0) * f;
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i]) return { x: pts[i].x + ((pts[i + 1].x - pts[i].x) * d) / lens[i], y: pts[i].y + ((pts[i + 1].y - pts[i].y) * d) / lens[i] };
      d -= lens[i];
    }
    return pts.at(-1);
  }

  // state: { t, from, hover, selected, kind, player: { x, z, facing }, stamps: Set }
  function render(state) {
    resize();
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.drawImage(base, 0, 0, W, H);
    const t = state.t ?? 0;
    const dest = state.selected ?? state.hover;

    // Route preview with a little plane / boat travelling on it
    if (state.from && dest && dest !== state.from) {
      const pts = routePoints(state.from, dest, state.kind);
      g.lineCap = g.lineJoin = 'round';
      g.strokeStyle = 'rgba(28,47,94,0.55)';
      g.lineWidth = 7;
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.stroke();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 3;
      g.setLineDash([10, 9]);
      g.lineDashOffset = -t * 30;
      g.stroke();
      g.setLineDash([]);
      const v = pointAlong(pts, (t * 0.22) % 1);
      g.fillStyle = '#f2c230';
      g.beginPath();
      g.arc(v.x, v.y, 15, 0, Math.PI * 2);
      g.fill();
      g.font = `18px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(state.kind === 'boat' ? '⛵' : '✈️', v.x, v.y + 1);
    }

    for (const isl of world.islands) {
      const c = centre(isl), id = isl.cfg.id;
      const focus = isl === dest, here = isl === state.from;
      g.globalAlpha = state.reachable && !here && !state.reachable(isl) ? 0.45 : 1; // can't go there with this vehicle
      // Glow under the hovered / selected island
      if (focus || here) {
        g.fillStyle = here ? 'rgba(242,194,48,0.35)' : 'rgba(255,255,255,0.35)';
        g.beginPath();
        g.arc(c.x, c.y, isl.cfg.R * k * 1.25 + 6 + Math.sin(t * 4) * 3, 0, Math.PI * 2);
        g.fill();
      }
      // Monument badge
      const r = focus ? 22 : 18;
      g.fillStyle = 'rgba(10,30,70,0.3)';
      g.beginPath();
      g.arc(c.x + 2, c.y + 3, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fffaf0';
      g.beginPath();
      g.arc(c.x, c.y, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = focus ? '#f2c230' : '#1c2f5e';
      g.lineWidth = 3;
      g.stroke();
      g.font = `${focus ? 24 : 20}px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(ICONS[id], c.x, c.y + 1);
      // Name label with flag (and a tick if the stamp is in the passport)
      const label = `${COUNTRIES[id].name}${state.stamps?.has(id) ? ' ✓' : ''}  ${isl.planeSpot ? '✈' : ''}${isl.boatSpot ? '⚓' : ''}`;
      pill(g, c.x, c.y - isl.cfg.R * k - 22, label, { flag: id, scale: focus ? 1.12 : 1, bg: here ? '#f2c230' : undefined });
      if (here) pill(g, c.x, c.y + isl.cfg.R * k + 20, 'You are here', { bg: '#1c2f5e', color: '#ffffff' });
      g.globalAlpha = 1;
    }

    // Player arrow (map M)
    if (state.player) {
      const x = sx(state.player.x), y = sz(state.player.z);
      g.fillStyle = 'rgba(242,194,48,0.35)';
      g.beginPath();
      g.arc(x, y, 16 + Math.sin(t * 4) * 4, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.translate(x, y);
      g.rotate(-state.player.facing);
      g.fillStyle = '#f2c230';
      g.strokeStyle = '#1c2f5e';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, 14);
      g.lineTo(10, -9);
      g.lineTo(0, -4);
      g.lineTo(-10, -9);
      g.closePath();
      g.stroke();
      g.fill();
      g.restore();
      pill(g, x, y - 30, 'You', { bg: '#1c2f5e', color: '#ffffff' });
    }
  }

  return {
    render,
    // Island under a mouse position (client coordinates), or null.
    islandAt(clientX, clientY) {
      const r = canvas.getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top;
      return world.islands.find((isl) => {
        const c = centre(isl);
        return Math.hypot(x - c.x, y - c.y) < Math.max(isl.cfg.R * k * 1.2, 28) || Math.abs(x - c.x) < 60 && Math.abs(y - (c.y - isl.cfg.R * k - 22)) < 14;
      }) ?? null;
    },
  };
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
