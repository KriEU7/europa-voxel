// English voice for the guides and the people.
// 1) If public/voices/<name>.mp3 exists (e.g. recorded with an AI voice), it is played.
// 2) Otherwise the computer's own English voice reads the text (Web Speech API).
import { settings } from './settings.js';

const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
synth?.getVoices(); // starts loading the voice list
let current = null;

const english = () => (synth?.getVoices() ?? []).filter((v) => v.lang.startsWith('en'));

export function stopVoice() {
  if (!current) return;
  current.stopped = true;
  current.audio?.pause();
  synth?.cancel();
  if (current.native) window.nativeVoice.stop();
  current = null;
}

// Resolves true when the voice has finished, false if nothing could be played
// (voices turned off or not available): then the caller waits by itself.
export function speak(text, { file, voice = 0, pitch = 1, rate = 0.95 } = {}) {
  stopVoice();
  if (!settings.voices) return Promise.resolve(false);
  const job = (current = { stopped: false });
  const volume = settings.master * settings.voice;
  return new Promise((resolve) => {
    let fellBack = false;
    const tts = (why) => {
      if (fellBack || job.stopped) return;
      fellBack = true;
      if (file) console.warn(`Voice ${file} not played, using the computer voice:`, why); // Ctrl+Shift+I in the .exe
      const list = english();
      if (!list.length && window.nativeVoice) {
        // Electron app: Windows voices through the main process.
        job.native = true;
        return window.nativeVoice
          .speak(text, { voice, rate: Math.round((rate - 1) * 10), volume: Math.round(volume * 100) })
          .then((ok) => resolve(ok && !job.stopped), () => resolve(false));
      }
      if (!list.length) return resolve(false);
      const u = new SpeechSynthesisUtterance(text);
      u.voice = list[voice % list.length];
      u.lang = u.voice.lang;
      Object.assign(u, { pitch, rate, volume });
      u.onend = () => resolve(!job.stopped);
      u.onerror = () => resolve(false);
      synth.speak(u);
    };
    if (!file) return tts();
    const audio = (job.audio = new Audio(file));
    audio.volume = volume;
    audio.onended = () => resolve(true);
    audio.onerror = () => tts(audio.error);
    audio.play().catch(tts);
  });
}
