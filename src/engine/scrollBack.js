// Coming back from a grammar topic (App.jsx backFromGrammar) puts the page
// back exactly where it was, at once. For that moment nothing else may
// scroll: components/Reveal.jsx skips its smooth "show the opened card".
let quietUntil = 0;
export const quietScroll = (ms = 1000) => { quietUntil = Date.now() + ms; };
export const scrollIsQuiet = () => Date.now() < quietUntil;

// the full-screen layer that scrolls itself (📋 Wortlisten, 🔍 search)
export const scrollLayer = () => document.querySelector("[data-scroll-layer]");
