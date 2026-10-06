// 🤖 KI-Assistent (engine/ai.js) for components deep in the tree, like
// LookupLinks under a card. enabled: the switch is on (show "✨ KI fragen");
// ask(subject) opens the chat, or the settings when no key is entered yet.
// Outside the provider the assistant is simply off.
import { createContext } from "react";

export const AiCtx = createContext({ enabled: false, ask: null });
