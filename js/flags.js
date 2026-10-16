// Each flag is a function (u, v) -> colour. u goes left -> right, v top -> bottom, both 0..1.
const third = (t, a, b, c) => (t < 1 / 3 ? a : t < 2 / 3 ? b : c);

export const FLAGS = {
  france: (u) => third(u, '#0055a4', '#ffffff', '#ef4135'),
  italy: (u) => third(u, '#009246', '#ffffff', '#ce2b37'),
  belgium: (u) => third(u, '#1a1a1a', '#fdda24', '#ef3340'),
  germany: (u, v) => third(v, '#1a1a1a', '#dd0000', '#ffce00'),
  netherlands: (u, v) => third(v, '#ae1c28', '#ffffff', '#21468b'),
  spain: (u, v) => (v < 0.25 || v >= 0.75 ? '#aa151b' : '#f1bf00'),
  greece: (u, v) => {
    if (u < 0.37 && v < 5 / 9) return Math.abs(u - 0.185) < 0.045 || Math.abs(v - 0.278) < 0.07 ? '#ffffff' : '#0d5eaf';
    return Math.floor(v * 9) % 2 === 0 ? '#0d5eaf' : '#ffffff';
  },
  uk: (u, v) => {
    const X = (u - 0.5) * 4, Y = (v - 0.5) * 2; // flag is twice as wide as tall
    if (Math.abs(X) < 0.2 || Math.abs(Y) < 0.2) return '#c8102e';
    if (Math.abs(X) < 0.34 || Math.abs(Y) < 0.34) return '#ffffff';
    const diag = Math.min(Math.abs(Y - X / 2), Math.abs(Y + X / 2)) / 1.118;
    if (diag < 0.09) return '#c8102e';
    if (diag < 0.2) return '#ffffff';
    return '#012169';
  },
};

// Cached flag pictures: data URL (for <img>) and Image (for drawing on canvases).
const urls = {}, imgs = {};
export const flagOf = (id) => (urls[id] ??= flagImage(id));
export const flagImg = (id) => (imgs[id] ??= Object.assign(new Image(), { src: flagOf(id) }));

// Small picture of the flag for the HUD and the map.
export function flagImage(id, w = 36, h = 24) {
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d');
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) {
      ctx.fillStyle = FLAGS[id]((x + 0.5) / w, (y + 0.5) / h);
      ctx.fillRect(x, y, 1, 1);
    }
  return canvas.toDataURL();
}
