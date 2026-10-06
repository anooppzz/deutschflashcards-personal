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
