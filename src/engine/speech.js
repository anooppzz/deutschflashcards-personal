// Browser text-to-speech for German pronunciation (the 🔊 button on cards).
// Pure browser-API wrapping, no React - would still make sense standalone
// even if every training mode were deleted, so it lives in engine/ rather
// than components/.
let _voices = [];
let current = null; // the createPlayer() that is speaking or paused (see below)

const loadVoices = () => {
  try { _voices = window.speechSynthesis.getVoices() || []; } catch {}
};

if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  try { window.speechSynthesis.addEventListener("voiceschanged", loadVoices); } catch {}
}

// rate: 0.95 normal; 🐢 slower for listening practice (~0.6)
// onEnd: called when the phone has finished speaking
export const speak = (text, onErr, rate = 0.95, onEnd) => {
  const fail = () => { if (onErr) onErr(); };
  if (current) current.pause(); // a word's 🔊 inside a text being read: the text keeps its place
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return fail();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = rate;
    const pool = _voices.length ? _voices : synth.getVoices();
    const de = pool.find((v) => /^de(\b|[-_])/i.test(v.lang));
    if (de) u.voice = de;
    u.onerror = fail;
    if (onEnd) u.onend = onEnd;
    let started = false;
    u.onstart = () => { started = true; };
    synth.speak(u);
    // Chrome/mobile: speech sometimes stays paused; nudge it, then verify it actually started
    setTimeout(() => { try { if (synth.paused) synth.resume(); } catch {} }, 200);
    setTimeout(() => { if (!started && !synth.speaking) fail(); }, 1200);
  } catch { fail(); }
};

export const stopSpeaking = () => {
  if (current) { current.stop(); return; }
  try { window.speechSynthesis.cancel(); } catch { /* no speech */ }
};

// ---- a player with ⏸ Pause (🎓 DTZ Hören, 📰 Lesen Vorlesen) ----
// It speaks one sentence at a time, so ⏸ can stop and ▶ carries on with the
// sentence that was cut off instead of starting over. (speechSynthesis.pause()
// is unreliable on Android – it often cancels or never resumes.) Short pieces
// also avoid Chrome cutting off speech after ~15 s. Only one player runs at a
// time; speak() pauses it, stopSpeaking() stops it.

// "1. Juni", "Dr. Schneider", "z. B. …": a full stop after these doesn't end a sentence
const NO_BREAK = /(?:^|\s)(?:\d+|Dr|Nr|Fr|Hr|St|Str|ca|bzw|usw|z|B|d|h)\.$/;
export const sentencesOf = (text) => {
  const out = [];
  for (const piece of text.split(/(?<=[.!?…]["“”»«']?)\s+/)) {
    if (!piece) continue;
    if (out.length && NO_BREAK.test(out[out.length - 1])) out[out.length - 1] += ` ${piece}`;
    else out.push(piece);
  }
  return out;
};

// who: "f" / "f2" (women), "m" (man), "a" (announcer). With two or more German
// voices on the phone, women and men get different voices; otherwise the
// pitch tells them apart.
const PITCH = { f: 1.15, f2: 1.3, m: 0.8, a: 1 };
const isMale = (v) => /male|mann|herr|männ|stefan|markus|hans|yannick|conrad|killian|florian|jonas/i.test(v.name) && !/female/i.test(v.name);
const voiceFor = (synth, who) => {
  const pool = (_voices.length ? _voices : synth.getVoices()).filter((v) => /^de(\b|[-_])/i.test(v.lang));
  const male = pool.find(isMale);
  const female = pool.find((v) => v !== male) || pool[0];
  return who === "m" ? male || female : who ? female : pool[0];
};


// pieces: [{ text, who? }], one sentence each (see sentencesOf).
// onChange(state, index): state "idle" | "playing" | "paused"; index = the
// sentence that plays next. onEnd: after the last sentence. onErr: no voice.
export const createPlayer = (pieces, { rate = 0.95, onChange, onEnd, onErr } = {}) => {
  let index = 0;
  let state = "idle";
  let token = 0; // bumped on every pause/stop, so events of a cut-off sentence are ignored
  const player = {};
  const synth = () => (typeof window !== "undefined" ? window.speechSynthesis : null);
  const emit = (s) => { state = s; if (onChange) onChange(s, index); };
  const halt = () => {
    token += 1;
    try { synth().cancel(); } catch { /* no speech */ }
  };
  const release = () => { if (current === player) current = null; };
  const fail = () => { halt(); release(); index = 0; emit("idle"); if (onErr) onErr(); };
  const sayNext = () => {
    const s = synth();
    if (index >= pieces.length) { index = 0; release(); emit("idle"); if (onEnd) onEnd(); return; }
    const mine = token;
    const piece = pieces[index];
    const u = new SpeechSynthesisUtterance(piece.text);
    u.lang = "de-DE";
    u.rate = rate;
    u.pitch = PITCH[piece.who] || 1;
    const voice = voiceFor(s, piece.who);
    if (voice) u.voice = voice;
    let started = false;
    u.onstart = () => { started = true; };
    u.onend = () => { if (mine !== token) return; index += 1; sayNext(); };
    u.onerror = (e) => {
      if (mine !== token) return;
      // cut off by the phone (a call, the screen locking): keep the place
      if (e.error === "interrupted" || e.error === "canceled") { token += 1; emit("paused"); return; }
      fail();
    };
    s.speak(u);
    // Chrome/mobile: speech sometimes stays paused; nudge it, then verify it actually started
    setTimeout(() => { try { if (s.paused) s.resume(); } catch { /* no speech */ } }, 200);
    setTimeout(() => { if (mine === token && !started && !s.speaking) fail(); }, 1500);
  };
  player.play = () => {
    if (state === "playing") return;
    const s = synth();
    if (!s || typeof SpeechSynthesisUtterance === "undefined" || !pieces.length) { fail(); return; }
    if (current && current !== player) current.stop();
    current = player;
    halt();
    emit("playing");
    sayNext();
  };
  player.pause = () => {
    if (state !== "playing") return;
    halt();
    emit("paused");
  };
  player.stop = () => {
    if (state === "idle") return;
    halt();
    release();
    index = 0;
    emit("idle");
  };
  return player;
};

// ⏸ whatever player is speaking (the DTZ simulation's pause button)
export const pauseSpeaking = () => { if (current) current.pause(); };
