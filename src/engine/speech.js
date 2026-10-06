// Browser text-to-speech for German pronunciation (the 🔊 button on cards).
// Pure browser-API wrapping, no React - would still make sense standalone
// even if every training mode were deleted, so it lives in engine/ rather
// than components/.
let _voices = [];

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
  try { window.speechSynthesis.cancel(); } catch { /* no speech */ }
};

// 🎓 DTZ Hören: several speakers one after another. lines: [{ who, text }]
// who: "f" / "f2" (women), "m" (man), "a" (announcer). With two or more German
// voices on the phone, women and men get different voices; otherwise the
// pitch tells them apart. onEnd runs after the last line.
const PITCH = { f: 1.15, f2: 1.3, m: 0.8, a: 1 };
const isMale = (v) => /male|mann|herr|männ|stefan|markus|hans|yannick|conrad|killian|florian|jonas/i.test(v.name) && !/female/i.test(v.name);
export const speakLines = (lines, { onEnd, onErr, rate = 0.95 } = {}) => {
  const fail = () => { if (onErr) onErr(); };
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return fail();
    synth.cancel();
    const pool = (_voices.length ? _voices : synth.getVoices()).filter((v) => /^de(\b|[-_])/i.test(v.lang));
    const male = pool.find(isMale);
    const female = pool.find((v) => v !== male) || pool[0];
    let started = false;
    lines.forEach((line, i) => {
      const u = new SpeechSynthesisUtterance(line.text);
      u.lang = "de-DE";
      u.rate = rate;
      u.pitch = PITCH[line.who] || 1;
      const voice = line.who === "m" ? male || female : female;
      if (voice) u.voice = voice;
      u.onstart = () => { started = true; };
      u.onerror = (e) => { if (e.error !== "interrupted" && e.error !== "canceled") fail(); };
      if (i === lines.length - 1 && onEnd) u.onend = onEnd;
      synth.speak(u);
    });
    setTimeout(() => { try { if (synth.paused) synth.resume(); } catch {} }, 200);
    setTimeout(() => { if (!started && !synth.speaking) fail(); }, 1500);
  } catch { fail(); }
};
