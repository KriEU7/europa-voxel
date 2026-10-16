// npm run voices -> writes public/voices/SCRIPT.txt: every line the game can say, with its mp3 file name.
// Record each line (for example with an AI voice), save it with that name in public/voices/, and the game uses it.
import { writeFileSync, mkdirSync } from 'node:fs';
import { GUIDES, PEOPLE, QUESTIONS, COUNTRIES } from '../js/data/facts.js';

const out = ['EUROPA VOXEL – VOICE SCRIPT', 'Save every recording as an mp3 in public/voices/ with the file name shown.', ''];

out.push('=== CITY TOURS (one voice per guide) ===', '');
for (const [id, tour] of Object.entries(GUIDES)) {
  out.push(`--- ${tour.guide} – ${tour.city} (${id}) ---`);
  tour.slides.forEach((text, i) => out.push(`${id}-${i + 1}.mp3`, `    ${text}`, ''));
  tour.test.forEach((item, i) => out.push(`${id}-test${i + 1}.mp3   (test question)`, `    ${item.q}`, ''));
}

out.push('=== PEOPLE: greetings ===', '');
for (const [country, people] of Object.entries(PEOPLE)) {
  out.push(`--- ${COUNTRIES[country].name} ---`);
  people.forEach((p, i) => p.silent || out.push(`${country}-npc${i + 1}.mp3   (${p.name})`, `    ${p.says}`, ''));
}

out.push('=== PEOPLE: answers to the questions ===', '');
for (const [country, list] of Object.entries(QUESTIONS)) {
  out.push(`--- ${COUNTRIES[country].name} ---`);
  // Every answer twice: a male (-m) and a female (-f) voice, to match the person you are talking to.
  list.forEach((item, i) => out.push(`${country}-q${i + 1}-m.mp3 / ${country}-q${i + 1}-f.mp3   (Q: ${item.q})`, `    ${item.a}`, ''));
}

mkdirSync('public/voices', { recursive: true });
writeFileSync('public/voices/SCRIPT.txt', out.join('\n'));
console.log(`public/voices/SCRIPT.txt: ${out.filter((l) => l.endsWith('.mp3') || l.includes('.mp3 ')).length} lines to record`);
