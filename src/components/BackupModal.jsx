import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import Modal from "./Modal";
import { STORAGE_KEYS } from "../constants";
import {
  collectBackup, backupFileName, parseBackup, restoreBackup, progressCountOf,
  canPromptInstall, onInstallChange, promptInstall, isStandalone, isIos, requestPersistentStorage,
} from "../engine";

// "💾 Sichern & App": save the learner's progress to a file, load it back
// (on a new phone, after clearing the browser), and install the app.
// See engine/backup.js for what a backup contains.

const h3 = { margin: "4px 0 6px", fontSize: 14, color: "#f2f5f8" };
const p = { margin: "0 0 10px", fontSize: 13, lineHeight: 1.5, color: "#9ab0c2" };
const btn = (primary) => ({
  width: "100%", padding: "11px 0", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
  border: primary ? "none" : "1px solid #2c3a47", background: primary ? "#e0833b" : "#1a232b", color: primary ? "#0e1419" : "#cdd8e2",
});
const hr = { border: "none", borderTop: "1px solid #1f2a33", margin: "16px 0" };

const dateDe = (ms) => new Date(ms).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

function BackupModal({ onClose, progressCount, lastBackupAt, onSaved }) {
  const fileRef = useRef(null);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [installable, setInstallable] = useState(canPromptInstall());
  useEffect(() => onInstallChange(() => setInstallable(canPromptInstall())), []);

  const save = () => {
    setError(null);
    const now = new Date();
    const backup = collectBackup(localStorage, now);
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 1)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFileName(now);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    try { localStorage.setItem(STORAGE_KEYS.BACKUP_AT, JSON.stringify(now.getTime())); } catch { /* storage off */ }
    requestPersistentStorage();
    onSaved(now.getTime());
    setDone(`Gespeichert: ${a.download}`);
  };

  const load = async (file) => {
    setError(null);
    setDone(null);
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      const n = progressCountOf(backup.data);
      const from = backup.exportedAt ? dateDe(Date.parse(backup.exportedAt)) : "unbekanntem Datum";
      const ok = window.confirm(
        `Sicherung vom ${from} laden?\n\n${n} Karten mit Fortschritt ersetzen die ${progressCount} Karten auf diesem Gerät. Das lässt sich nicht rückgängig machen.`
      );
      if (!ok) return;
      restoreBackup(backup, localStorage);
      location.reload();
    } catch (e) {
      setError(e.message || "Die Sicherung konnte nicht geladen werden.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const standalone = isStandalone();

  return (
    <Modal title="💾 Sichern & App" onClose={onClose}>
      <h3 style={h3}>Fortschritt sichern</h3>
      <p style={p}>
        Dein Lernfortschritt ist nur in diesem Browser gespeichert. Browserdaten löschen oder ein neues Handy –
        und er ist weg. Speichere ab und zu eine Sicherungsdatei (z. B. in Dateien, Google Drive oder per Mail an dich).
      </p>
      <p style={{ ...p, color: "#cdd8e2" }}>
        {progressCount} Karten mit Fortschritt · letzte Sicherung: {lastBackupAt ? dateDe(lastBackupAt) : "noch nie"}
      </p>
      <button type="button" onClick={save} style={btn(true)}>⬇️ Sicherung herunterladen</button>
      {done && <p role="status" style={{ ...p, color: "#5fa85f", margin: "8px 0 0" }}>✓ {done}</p>}

      <hr style={hr} />
      <h3 style={h3}>Sicherung laden</h3>
      <p style={p}>Auf einem neuen Gerät oder nach dem Löschen: die Datei auswählen. Sie ersetzt den Fortschritt auf diesem Gerät.</p>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={(e) => load(e.target.files[0])} style={{ display: "none" }} aria-hidden="true" tabIndex={-1} />
      <button type="button" onClick={() => fileRef.current && fileRef.current.click()} style={btn(false)}>📂 Sicherungsdatei wählen …</button>
      {error && <p role="alert" style={{ ...p, color: "#e07b6f", margin: "8px 0 0" }}>⚠️ {error}</p>}

      <hr style={hr} />
      <h3 style={h3}>📲 Als App installieren</h3>
      {standalone ? (
        <p style={p}>✓ Läuft schon als App. Sie öffnet sich auch ohne Internet.</p>
      ) : installable ? (
        <>
          <p style={p}>Mit eigenem Symbol auf dem Startbildschirm, ohne Browserleiste, auch offline.</p>
          <button type="button" onClick={() => promptInstall()} style={btn(false)}>📲 App installieren</button>
        </>
      ) : isIos() ? (
        <p style={p}>In <b>Safari</b>: unten auf <b>Teilen</b> (□ mit Pfeil ↑) tippen → <b>„Zum Home-Bildschirm“</b>. Die App öffnet sich dann mit eigenem Symbol, auch offline.</p>
      ) : (
        <p style={p}>Im Browser-Menü (⋮) <b>„App installieren“</b> oder <b>„Zum Startbildschirm hinzufügen“</b> wählen. Die App öffnet sich dann mit eigenem Symbol, auch offline.</p>
      )}
    </Modal>
  );
}

BackupModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  progressCount: PropTypes.number.isRequired,
  lastBackupAt: PropTypes.number,
  onSaved: PropTypes.func.isRequired,
};

export default BackupModal;
