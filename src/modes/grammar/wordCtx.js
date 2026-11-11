import { createContext } from "react";

// open(entry, element): show a grammar word's meaning next to the tapped word
// (WordPopover). null outside a grammar topic: the words stay plain text.
export const GrammarWordCtx = createContext(null);
