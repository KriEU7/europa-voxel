// npm run make-voices -> creates every voice line as mp3 in public/voices/ with Kokoro TTS (free, offline).
// Already existing files are skipped, so you can stop it and start it again.
// Options: --only=eiffel  (just files whose name starts with it)   --force  (redo existing files)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { KokoroTTS } from 'kokoro-js';
import { Mp3Encoder } from '@breezystack/lamejs';
import { GUIDES, PEOPLE, QUESTIONS } from '../js/data/facts.js';

const OUT = 'public/voices';
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const force = args.includes('--force');

// Kokoro English voices: a = American, b = British; f = female, m = male.
const GUIDE_VOICE = {
  'Guide Sophie': 'af_heart', 'Guide Lotte': 'bf_emma', 'Guide Anouk': 'af_bella', 'Guide Charlotte': 'bf_isabella',
  'Guide Jana': 'af_nicole', 'Guide Marta': 'af_sarah', 'Guide Francesca': 'af_aoede', 'Guide Katerina': 'bf_alice',
};
const PEOPLE_VOICE = {
  france: { m: 'am_michael', f: 'af_jessica' },
  belgium: { m: 'bm_lewis', f: 'af_kore' },
  netherlands: { m: 'am_eric', f: 'af_river' },
  uk: { m: 'bm_george', f: 'bf_lily' },
  germany: { m: 'am_onyx', f: 'af_nova' },
  spain: { m: 'am_liam', f: 'af_sky' },
  italy: { m: 'am_adam', f: 'af_heart' },
  greece: { m: 'bm_daniel', f: 'af_bella' },
};

// Every line: file name, text, voice.
const jobs = [];
for (const [id, tour] of Object.entries(GUIDES)) {
  const voice = GUIDE_VOICE[tour.guide] ?? 'af_heart';
  tour.slides.forEach((text, i) => jobs.push({ file: `${id}-${i + 1}`, text, voice }));
  tour.test.forEach((t, i) => jobs.push({ file: `${id}-test${i + 1}`, text: t.q, voice }));
}
for (const [country, people] of Object.entries(PEOPLE))
  people.forEach((p, i) => p.silent || jobs.push({ file: `${country}-npc${i + 1}`, text: p.says, voice: PEOPLE_VOICE[country][p.gender ?? 'm'] }));
for (const [country, list] of Object.entries(QUESTIONS))
  list.forEach((item, i) => {
    for (const g of ['m', 'f']) jobs.push({ file: `${country}-q${i + 1}-${g}`, text: item.a, voice: PEOPLE_VOICE[country][g] });
  });

// Float samples -> mp3 (mono, 64 kbit/s)
function toMp3(samples, rate) {
  const enc = new Mp3Encoder(1, rate, 64);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 32767;
  const parts = [];
  for (let i = 0; i < pcm.length; i += 1152) parts.push(enc.encodeBuffer(pcm.subarray(i, i + 1152)));
  parts.push(enc.flush());
  return Buffer.concat(parts.map((p) => Buffer.from(p.buffer, p.byteOffset, p.length)));
}

mkdirSync(OUT, { recursive: true });
const todo = jobs.filter((j) => (!only || j.file.startsWith(only)) && (force || !existsSync(`${OUT}/${j.file}.mp3`)));
console.log(`${jobs.length} lines in total, ${todo.length} to make.`);
if (todo.length) {
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
  const start = Date.now();
  for (const [n, job] of todo.entries()) {
    // Kokoro reads some symbols oddly: help it a bit.
    const text = job.text.replace(/¡/g, '').replace(/–/g, ',');
    const audio = await tts.generate(text, { voice: job.voice, speed: 0.95 });
    writeFileSync(`${OUT}/${job.file}.mp3`, toMp3(audio.audio, audio.sampling_rate));
    const done = n + 1, eta = ((Date.now() - start) / done) * (todo.length - done) / 60000;
    console.log(`[${done}/${todo.length}] ${job.file}.mp3 (${job.voice})  ~${eta.toFixed(0)} min left`);
  }
}
console.log('All voices done.');
