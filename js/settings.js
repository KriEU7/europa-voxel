// Player settings, saved in the browser (localStorage). Missing storage = defaults, still works.
const KEY = 'europa-voxel-settings';

export const QUALITY = {
  low: { shadows: 0, pixelRatio: 0.75, view: 260, waves: false },
  medium: { shadows: 1024, pixelRatio: 1, view: 380, waves: true },
  high: { shadows: 2048, pixelRatio: 1.5, view: 520, waves: true },
};

const DEFAULTS = {
  quality: 'high', fov: 65, showFps: false,
  master: 0.8, music: 0.5, sfx: 0.8, ambience: 0.6, voice: 1, voices: true,
  sensitivity: 1, invertY: false,
};

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export const settings = load();
export const hasSavedSettings = (() => {
  try { return localStorage.getItem(KEY) !== null; } catch { return false; }
})();

const listeners = [];
export const onSettingsChange = (fn) => listeners.push(fn);

export function updateSetting(key, value) {
  settings[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode: not saved */ }
  for (const fn of listeners) fn(key, value);
}
