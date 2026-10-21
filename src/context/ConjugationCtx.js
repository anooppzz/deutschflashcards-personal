// 📊 Alle Formen: openConjugation(cardId) opens a verb's full conjugation
// (components/ConjugationSheet.jsx) from any card, without passing props
// through every view. Outside the provider it is null and no button shows.
import { createContext } from "react";

export const ConjugationCtx = createContext({ openConjugation: null });
