// Talking to people, like a chat: the person on the left, the conversation on the right,
// with ready-made questions to tap. Answers come from data/facts.js (QUESTIONS).
import { COUNTRIES, QUESTIONS } from './data/facts.js';
import { flagOf } from './flags.js';
import { speak, stopVoice } from './voice.js';
import { portrait } from './portrait.js';

const $ = (id) => document.getElementById(id);

export function createDialog({ sounds, hooks, onOpen, onClose, extras }) {
  let npc = null, token = 0;

  function bubble(text, from) {
    const b = Object.assign(document.createElement('div'), { className: `msg ${from}`, textContent: text });
    $('dialog-log').append(b);
    $('dialog-log').scrollTop = $('dialog-log').scrollHeight;
    return b;
  }

  // The person "types" for a moment, then answers (and says it aloud).
  function reply(text, file) {
    const my = ++token;
    const typing = bubble('', 'npc typing');
    typing.innerHTML = '<span></span><span></span><span></span>';
    setTimeout(() => {
      if (my !== token || !npc) return;
      typing.remove();
      bubble(text, 'npc');
      sounds.talk();
      $('dialog-person').classList.add('talking');
      speak(text, { file, voice: npc.index + npc.isl.cfg.seed, pitch: 0.85 + (npc.index % 4) * 0.12 }).then(() => {
        if (my === token) $('dialog-person').classList.remove('talking');
      });
    }, 650);
  }

  function chips() {
    const id = npc.isl.cfg.id;
    const left = QUESTIONS[id].map((item, i) => ({ ...item, i })).filter((item) => !npc.asked.has(item.i));
    // Extra buttons from the game (missions): run() changes the state, then the person answers.
    const more = (extras?.(npc.ref) ?? []).map((x) =>
      Object.assign(document.createElement('button'), {
        textContent: x.q, className: 'extra',
        onclick: () => (bubble(x.q, 'me'), x.run(), chips(), reply(x.a)),
      }));
    $('dialog-questions').replaceChildren(
      ...more,
      ...left.map((item) => {
        const b = Object.assign(document.createElement('button'), { textContent: item.q });
        b.onclick = () => {
          npc.asked.add(item.i);
          bubble(item.q, 'me');
          chips();
          reply(item.a, `voices/${id}-q${item.i + 1}-${npc.gender ?? 'm'}.mp3`); // male / female version of the answer
        };
        return b;
      }),
      Object.assign(document.createElement('button'), { textContent: '👋 Goodbye!', className: 'bye', onclick: close }),
    );
  }

  function open(n) {
    npc = { ...n, asked: new Set() };
    npc.ref = n;
    const id = n.isl.cfg.id;
    $('dialog-photo').src = portrait(n.look, `npc-${id}-${n.index}`);
    $('dialog-flag').src = flagOf(id);
    $('dialog-where').textContent = COUNTRIES[id].name;
    $('dialog-name').textContent = n.name;
    $('dialog-log').replaceChildren();
    $('dialog').hidden = false;
    hooks.pause();
    onOpen?.(n);
    document.querySelector('.chat-hint').hidden = !!n.silent;
    if (n.silent) {
      // He doesn't say a word: only "..." and a note. The only thing you can do is leave.
      bubble('...', 'npc');
      bubble(`💂 ${n.says}`, 'note');
      $('dialog-questions').replaceChildren(Object.assign(document.createElement('button'), { textContent: '👋 Goodbye!', className: 'bye', onclick: close }));
      return;
    }
    chips();
    reply(n.says, `voices/${id}-npc${n.index + 1}.mp3`);
  }

  function close() {
    if (!npc) return;
    token++;
    stopVoice();
    $('dialog').hidden = true;
    $('dialog-person').classList.remove('talking');
    const n = npc.ref;
    npc = null;
    onClose?.(n);
    hooks.resume();
  }
  $('dialog-close').onclick = close;

  return { open, close, get isOpen() { return !!npc; } };
}
