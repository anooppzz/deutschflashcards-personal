import { useState, useRef, useEffect, useCallback } from "react";

// 🎙 Recording and 📝 speech-to-text for 🗣 Sprechen.
// - useRecorder: the phone's microphone → an audio clip in memory (a blob
//   URL). Nothing is uploaded or saved; it is gone when the page closes.
// - useSpeechToText: the browser's speech recognition (Chrome sends the
//   audio to Google). Only used when the learner switched "Mitschrift" on.

const micError = (e) => {
  if (e?.name === "NotAllowedError" || e?.name === "SecurityError") return "Kein Zugriff auf das Mikrofon – erlaube es in den Browser-Einstellungen.";
  if (e?.name === "NotFoundError") return "Kein Mikrofon gefunden.";
  return `Aufnahme geht nicht: ${e?.message || e}`;
};

export const recorderSupported = () => typeof window !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof window.MediaRecorder !== "undefined";

// start(onDone(url)) · stop() · { recording, seconds, error }
export function useRecorder({ maxSeconds = 180 } = {}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(null);
  const rec = useRef(null);
  const stream = useRef(null);

  const release = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  const stop = useCallback(() => {
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
  }, []);

  const start = async (onDone) => {
    setError(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const r = new window.MediaRecorder(stream.current);
      r.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
      r.onstop = () => {
        release();
        setRecording(false);
        if (chunks.length) onDone(URL.createObjectURL(new Blob(chunks, { type: r.mimeType || "audio/webm" })));
      };
      rec.current = r;
      r.start();
      setSeconds(0);
      setRecording(true);
    } catch (e) {
      release();
      setError(micError(e));
    }
  };

  useEffect(() => {
    if (!recording) return undefined;
    const t0 = Date.now();
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      setSeconds(s);
      if (s >= maxSeconds) stop();
    }, 500);
    return () => clearInterval(t);
  }, [recording, maxSeconds, stop]);

  useEffect(() => () => { if (rec.current && rec.current.state !== "inactive") { rec.current.onstop = null; rec.current.stop(); } release(); }, []);

  return { start, stop, recording, seconds, error };
}

const Recognition = () => (typeof window === "undefined" ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);
export const speechToTextSupported = () => Boolean(Recognition());

const sttError = (code) => ({
  "not-allowed": "Kein Zugriff auf das Mikrofon für die Mitschrift.",
  "service-not-allowed": "Die Spracherkennung ist in diesem Browser gesperrt.",
  network: "Keine Verbindung zur Spracherkennung – sie braucht Internet.",
  "no-speech": "Nichts gehört – sprich etwas lauter oder näher am Handy.",
  "audio-capture": "Kein Mikrofon gefunden.",
}[code] || `Spracherkennung: ${code}`);

// start(onText(text)) - text = everything recognised in this session so far
export function useSpeechToText() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const rec = useRef(null);

  const stop = useCallback(() => { try { rec.current?.stop(); } catch { /* not running */ } }, []);
  const start = (onText) => {
    const R = Recognition();
    if (!R) return;
    setError(null);
    const r = new R();
    r.lang = "de-DE";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += `${e.results[i][0].transcript} `;
      onText(text.replace(/\s+/g, " ").trim());
    };
    r.onerror = (e) => { if (e.error !== "aborted") setError(sttError(e.error)); };
    r.onend = () => setListening(false);
    rec.current = r;
    try { r.start(); setListening(true); } catch (e) { setError(sttError(e?.message || "start")); }
  };
  useEffect(() => () => { try { if (rec.current) { rec.current.onend = null; rec.current.abort(); } } catch { /* gone */ } }, []);
  return { start, stop, listening, error };
}
