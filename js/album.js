// Camera: press C to take a photo of what you see. Photos (small JPEGs) and their captions
// are saved in the browser and shown in the photo album (from the passport or the pause menu).
const KEY = 'europa-voxel-album';
const MAX = 24; // ponytail: oldest photos are dropped, localStorage is only a few MB
const $ = (id) => document.getElementById(id);

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

export function createAlbum({ sounds, hooks }) {
  let photos = load(), open = false;
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(photos)); } catch { photos.shift(); } // full: forget the oldest
  };

  // Call right after renderer.render(), while the picture is still in the canvas.
  function snap(canvas, caption) {
    const c = Object.assign(document.createElement('canvas'), { width: 480, height: 270 }), g = c.getContext('2d');
    const k = Math.max(480 / canvas.width, 270 / canvas.height), w = canvas.width * k, h = canvas.height * k;
    g.drawImage(canvas, (480 - w) / 2, (270 - h) / 2, w, h);
    photos.push({ src: c.toDataURL('image/jpeg', 0.8), caption, date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) });
    if (photos.length > MAX) photos.shift();
    save();
    sounds.shutter();
    $('flash').classList.remove('on');
    void $('flash').offsetWidth; // restart the animation
    $('flash').classList.add('on');
    hooks.toast(`📷 Photo saved in your album (${photos.length})`);
  }

  function show() {
    open = true;
    $('album-grid').replaceChildren(
      ...photos.map((p, i) => {
        const fig = document.createElement('figure');
        fig.style.setProperty('--tilt', `${((i * 37) % 9) - 4}deg`);
        const img = Object.assign(document.createElement('img'), { src: p.src, alt: p.caption });
        const del = Object.assign(document.createElement('button'), { textContent: '✕', title: 'Delete photo', className: 'album-del' });
        del.onclick = () => (photos.splice(i, 1), save(), show());
        fig.append(img, Object.assign(document.createElement('figcaption'), { textContent: `${p.caption} · ${p.date}` }), del);
        return fig;
      }),
    );
    $('album-empty').hidden = photos.length > 0;
    $('album').hidden = false;
    hooks.pause();
  }
  function close() {
    open = false;
    $('album').hidden = true;
    hooks.resume();
  }
  $('album-close').onclick = close;

  return { snap, open: show, close, get isOpen() { return open; } };
}
