import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sentencesOf, createPlayer, pauseSpeaking, stopSpeaking, speak } from "./speech";

describe("sentencesOf", () => {
  it("splits after . ! ? and keeps the punctuation", () => {
    expect(sentencesOf("Hallo! Wie geht's? Gut. Danke…")).toEqual(["Hallo!", "Wie geht's?", "Gut.", "Danke…"]);
  });
  it("keeps dates, numbers and abbreviations inside the sentence", () => {
    expect(sentencesOf("Ab dem 1. Juni öffnet das Bad. Praxis Dr. Schneider, guten Morgen."))
      .toEqual(["Ab dem 1. Juni öffnet das Bad.", "Praxis Dr. Schneider, guten Morgen."]);
    expect(sentencesOf("Er kauft z. B. Brot.")).toEqual(["Er kauft z. B. Brot."]);
  });
  it("keeps a closing quote with its sentence", () => {
    expect(sentencesOf("„Komm!“ Sie lacht.")).toEqual(["„Komm!“", "Sie lacht."]);
  });
});

// a fake speechSynthesis: speak() queues, finish() ends the current sentence
const fakeSynth = () => {
  const synth = {
    spoken: [], current: null, paused: false,
    get speaking() { return Boolean(synth.current); },
    getVoices: () => [],
    speak(u) { synth.spoken.push(u.text); synth.current = u; if (u.onstart) u.onstart(); },
    cancel() { const u = synth.current; synth.current = null; if (u && u.onerror) u.onerror({ error: "interrupted" }); },
    resume() {},
    finish() { const u = synth.current; synth.current = null; u.onend(); },
    cutOff() { const u = synth.current; synth.current = null; u.onerror({ error: "interrupted" }); },
  };
  return synth;
};

describe("createPlayer", () => {
  let synth;
  beforeEach(() => {
    vi.useFakeTimers();
    synth = fakeSynth();
    globalThis.window = { speechSynthesis: synth };
    globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  });
  afterEach(() => {
    stopSpeaking();
    vi.useRealTimers();
    delete globalThis.window;
    delete globalThis.SpeechSynthesisUtterance;
  });
  const pieces = [{ text: "Eins." }, { text: "Zwei." }, { text: "Drei." }];

  it("plays sentence after sentence and ends", () => {
    const onEnd = vi.fn();
    const states = [];
    const p = createPlayer(pieces, { onEnd, onChange: (s) => states.push(s) });
    p.play();
    synth.finish(); synth.finish(); synth.finish();
    expect(synth.spoken).toEqual(["Eins.", "Zwei.", "Drei."]);
    expect(onEnd).toHaveBeenCalledOnce();
    expect(states.at(-1)).toBe("idle");
  });

  it("pause keeps the place: play goes on with the cut-off sentence", () => {
    const states = [];
    const p = createPlayer(pieces, { onChange: (s, i) => states.push([s, i]) });
    p.play();
    synth.finish();          // "Eins." done, "Zwei." playing
    p.pause();
    expect(states.at(-1)).toEqual(["paused", 1]);
    vi.advanceTimersByTime(2000); // the "did it start?" check must not fire after a pause
    p.play();
    expect(synth.spoken).toEqual(["Eins.", "Zwei.", "Zwei."]);
    synth.finish();
    expect(synth.spoken.at(-1)).toBe("Drei.");
  });

  it("stop starts over next time", () => {
    const p = createPlayer(pieces);
    p.play();
    synth.finish();
    p.stop();
    p.play();
    expect(synth.spoken).toEqual(["Eins.", "Zwei.", "Eins."]);
  });

  it("speech cut off by the phone counts as a pause", () => {
    const states = [];
    const p = createPlayer(pieces, { onChange: (s, i) => states.push([s, i]) });
    p.play();
    synth.finish();
    synth.cutOff();
    expect(states.at(-1)).toEqual(["paused", 1]);
  });

  it("pauseSpeaking pauses the running player; a second player stops the first", () => {
    const a = [];
    const b = [];
    const p1 = createPlayer(pieces, { onChange: (s) => a.push(s) });
    const p2 = createPlayer([{ text: "Hallo." }], { onChange: (s) => b.push(s) });
    p1.play();
    pauseSpeaking();
    expect(a.at(-1)).toBe("paused");
    p2.play();
    expect(a.at(-1)).toBe("idle");
    expect(b.at(-1)).toBe("playing");
  });

  it("a single word's 🔊 pauses the text being read, which keeps its place", () => {
    const states = [];
    const p = createPlayer(pieces, { onChange: (s, i) => states.push([s, i]) });
    p.play();
    synth.finish();
    speak("das Kleid");
    expect(states.at(-1)).toEqual(["paused", 1]);
    p.play();
    expect(synth.spoken).toEqual(["Eins.", "Zwei.", "das Kleid", "Zwei."]);
  });

  it("reports an error when there is no speech", () => {
    delete globalThis.window.speechSynthesis;
    const onErr = vi.fn();
    createPlayer(pieces, { onErr }).play();
    expect(onErr).toHaveBeenCalledOnce();
  });
});
