import { useState } from "react";
import { GENDER_COLORS, LANGUAGES, HELP_FLAGS } from "../constants";
import Modal from "./Modal";
import { badgeStyle, ctrlBtn } from "./cardStyles";
import HELP_I18N from "../data/help.json";

/* ---- Onboarding text (src/data/help.json), translated. English is the canonical source (same
   convention as the vocabulary table), hand-translated into the curated
   languages. A custom/arbitrary typed language has no entry here - falls
   back to English rather than guessing, same principle as the hard-word
   guard in the vocabulary translation engine. As with the vocabulary table,
   Albanian is the one most worth a native speaker's spot-check. ---- */
const t = (key, lang) => (HELP_I18N[key] && HELP_I18N[key][lang]) || (HELP_I18N[key] && HELP_I18N[key].en) || key;

/* ---- Onboarding: a shared modal shell, used by both the first-visit
   welcome screen and the always-available "?" help reference. Neither
   touches any other part of the layout - both only appear when explicitly
   triggered (first visit, or a tap on "?"), never sitting on screen
   uninvited. ---- */
export function WelcomeModal({ onClose, lang, onSelectLang }) {
  const rtl = lang === "ar";
  return (
    <Modal title={t("welcome.title", lang)} onClose={onClose} primaryLabel={t("welcome.button", lang)} onPrimary={onClose}>
      <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #1f2a33" }}>
        <div style={{ fontSize: 11, color: "#7d8d9c", marginBottom: 8 }}>{t("welcome.pickLanguage", lang)}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LANGUAGES.map(([key, label, flag]) => (
            <button
              key={key}
              onClick={() => onSelectLang(key)}
              style={{
                padding: "5px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: lang === key ? "none" : "1px solid #2c3a47",
                background: lang === key ? "#e0833b" : "#1a232b",
                color: lang === key ? "#0e1419" : "#9ab0c2",
              }}
            >{flag} {label}</button>
          ))}
        </div>
      </div>
      <p dir={rtl ? "rtl" : "auto"} style={{ margin: "0 0 12px", fontSize: 13, color: "#cdd8e2", lineHeight: 1.6 }}>
        {t("welcome.intro", lang)}
      </p>
      <ul dir={rtl ? "rtl" : "auto"} style={{ margin: "0 0 14px", paddingLeft: rtl ? 0 : 18, paddingRight: rtl ? 18 : 0, fontSize: 13, color: "#cdd8e2", lineHeight: 1.7 }}>
        <li>{t("welcome.modeCards", lang)}</li>
        <li>{t("welcome.modeArticle", lang)}</li>
        <li>{t("welcome.modeQuiz", lang)}</li>
      </ul>
      <p dir={rtl ? "rtl" : "auto"} style={{ margin: "0 0 6px", fontSize: 13, color: "#cdd8e2", lineHeight: 1.6 }}>
        {t("welcome.translations", lang)}
      </p>
      <p dir={rtl ? "rtl" : "auto"} style={{ margin: 0, fontSize: 12, color: "#7d8d9c", lineHeight: 1.6 }}>
        {t("welcome.footer", lang)}
      </p>
    </Modal>
  );
}

/* ---- Small, non-interactive previews built from the app's own real style
   values (ctrlBtn, badgeStyle, GENDER_COLORS, exact button colors copied
   from each real component) - not illustrations or screenshots, so they
   can never visually drift from what the actual UI looks like. ---- */
function HelpVisual({ kind }) {
  const wrap = { marginTop: 6, marginBottom: 2 };
  const pill = (label, active, color) => (
    <span style={{
      display: "inline-block", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
      border: active ? "none" : "1px solid #2c3a47",
      background: active ? color : "#1a232b",
      color: active ? "#fff" : "#9ab0c2",
      marginRight: 5,
    }}>{label}</span>
  );
  switch (kind) {
    case "help.tabs":
      return <div style={wrap}>{pill("👕 Kleidung", true, "#e0833b")}{pill("🌦️ Wetter", false)}</div>;
    case "help.search":
      return (
        <div style={{ ...wrap, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 10, border: "1px solid #2c3a47", background: "#161d24", fontSize: 11 }}>
          <span style={{ color: "#7d8d9c" }}>🔍</span><span style={{ color: "#5a6b78" }}>Suchen …</span>
        </div>
      );
    case "help.modes":
      return <div style={wrap}>{pill("🃏 Karten", true, "#e0833b")}{pill("🎯 Artikel", false)}{pill("📝 Quiz", false)}</div>;
    case "help.language":
      return <div style={wrap}>{pill("🇬🇧 EN", false)}{pill("🇦🇱 SQ", true, "#e0833b")}{pill("🇸🇦 AR", false)}</div>;
    case "help.badge":
      return <div style={wrap}><span style={badgeStyle(GENDER_COLORS.die)}>👕 Kleidung · Nomen · die</span></div>;
    case "help.filter":
      return <div style={wrap}>{pill("✓ Alle", true, "#e0833b")}{pill("Nomen", true, "#4f86c6")}{pill("Verben", false)}</div>;
    case "help.known":
      return (
        <div style={wrap}>
          <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "1px solid #5fa85f", color: "#5fa85f", marginRight: 6 }}>✓ Gekonnt</span>
          <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "1px solid #e0833b", color: "#e0833b" }}>↻ Üben</span>
        </div>
      );
    case "help.wrong":
      return <div style={wrap}><span style={{ fontSize: 11, color: "#5a6b78", textDecoration: "underline" }}>✗ falsch?</span></div>;
    case "help.shuffle":
      return <div style={wrap}><span style={{ ...ctrlBtn, display: "inline-block", borderColor: "#e0833b", color: "#e0833b", background: "transparent" }}>⤮ Shuffle</span></div>;
    case "help.roundSize":
      return <div style={wrap}><span style={{ background: "none", border: "1px solid #2c3a47", borderRadius: 8, padding: "4px 10px", color: "#9ab0c2", fontSize: 11, fontWeight: 600 }}>🔢 Runde: 10</span></div>;
    case "help.peek":
      return <div style={wrap}><span style={{ fontSize: 11, fontWeight: 600, color: "#7fb0d6", textDecoration: "underline" }}>👁 Bedeutung zeigen</span></div>;
    case "help.summary":
      return (
        <div style={wrap}>
          <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "1px solid #e0833b", color: "#e0833b", marginRight: 6 }}>↻ Fehler wiederholen</span>
          <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "#e0833b", color: "#0e1419" }}>🔁 Neue Runde</span>
        </div>
      );
    case "help.streak":
      return (
        <div style={{ ...wrap, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ width: 70, height: 5, borderRadius: 3, background: "#1e2630", overflow: "hidden" }}>
            <span style={{ display: "block", width: "70%", height: "100%", background: "#5fa85f" }} />
          </span>
          <span style={{ fontSize: 10, color: "#7d8d9c" }}>14/20</span>
        </div>
      );
    case "help.progressBar":
      return (
        <div style={{ ...wrap, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 70, height: 5, borderRadius: 3, background: "#1e2630", overflow: "hidden" }}>
            <span style={{ display: "block", width: "55%", height: "100%", background: "#5fa85f" }} />
          </span>
          <span style={{ fontSize: 10, color: "#7d8d9c" }}>📅 12 fällig</span>
        </div>
      );
    case "help.levelFilter":
      return <div style={wrap}>{pill("A1", true, "#5fa85f")}{pill("A2", true, "#e0833b")}</div>;
    case "help.sourceFilter":
      return <div style={wrap}>{pill("Alle", true, "#4f86c6")}{pill("Einheit 3", false)}{pill("Einheit 4", false)}</div>;
    case "help.grammar":
      return <div style={wrap}><span style={{ fontSize: 11, color: "#8fb8d8" }}>📖 Artikel im Nominativ ▾</span></div>;
    case "help.cloze":
      return (
        <div style={wrap}>
          <span style={{ fontSize: 12, color: "#cdd8e2" }}>Die Katze schläft </span>
          <span style={{ display: "inline-block", minWidth: 40, borderBottom: "2px solid #e0833b" }}>&nbsp;</span>
          <span style={{ fontSize: 12, color: "#cdd8e2" }}> dem Tisch.</span>
        </div>
      );
    case "help.interval":
      return <div style={wrap}><span style={{ fontSize: 11, fontWeight: 700, color: "#7fb0d6" }}>🧠 Intervall: 7 Tg.</span></div>;
    case "help.wordsearch":
      return (
        <div style={{ ...wrap, display: "flex", gap: 2 }}>
          {["B", "A", "N", "K"].map((l, i) => (
            <span key={i} style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "#e0833b", color: "#0e1419" }}>{l}</span>
          ))}
        </div>
      );
    default:
      return null;
  }
}

function HelpSection({ titleKey, items, lang }) {
  const rtl = lang === "ar";
  return (
    <div style={{ marginBottom: 18 }} dir={rtl ? "rtl" : "auto"}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#e0833b", textTransform: "uppercase", marginBottom: 8 }}>{t(titleKey, lang)}</div>
      {items.map((key) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "#f2f5f8", fontWeight: 600 }}>{t(key + ".label", lang)}</div>
          <div style={{ fontSize: 12, color: "#9ab0c2", lineHeight: 1.5 }}>{t(key + ".desc", lang)}</div>
          <HelpVisual kind={key} />
        </div>
      ))}
    </div>
  );
}

export function HelpModal({ onClose, lang }) {
  const [deOverride, setDeOverride] = useState(false);
  const effectiveLang = deOverride ? "de" : lang;
  return (
    <Modal
      title={`${HELP_FLAGS[effectiveLang] || ""} ${t("help.title", effectiveLang)}`.trim()}
      onClose={onClose}
    >
      {lang !== "de" && (
        <button
          onClick={() => setDeOverride((v) => !v)}
          title="Anleitung auf Deutsch anzeigen"
          style={{
            display: "block", marginLeft: "auto", marginBottom: 14, padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
            border: deOverride ? "none" : "1px solid #2c3a47",
            background: deOverride ? "#e0833b" : "#1a232b",
            color: deOverride ? "#0e1419" : "#9ab0c2",
          }}
        >🇩🇪 DE</button>
      )}
      <HelpSection lang={effectiveLang} titleKey="help.section.start" items={["help.tabs", "help.search", "help.modes", "help.language"]} />
      <HelpSection lang={effectiveLang} titleKey="help.section.studying" items={["help.badge", "help.filter", "help.known", "help.wrong", "help.shuffle", "help.interval"]} />
      <HelpSection lang={effectiveLang} titleKey="help.section.article" items={["help.roundSize", "help.peek"]} />
      <HelpSection lang={effectiveLang} titleKey="help.section.afterRound" items={["help.summary"]} />
      <HelpSection lang={effectiveLang} titleKey="help.section.progress" items={["help.streak", "help.progressBar"]} />
      <HelpSection lang={effectiveLang} titleKey="help.section.newFeatures" items={["help.levelFilter", "help.sourceFilter", "help.grammar", "help.cloze", "help.wordsearch"]} />
    </Modal>
  );
}
