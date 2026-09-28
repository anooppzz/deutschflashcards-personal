// Grammar links for cards and trainers, without passing props through every
// view: linksFor(cardId) returns a card's grammar links, openGrammar(key)
// switches to the Grammatik tab with that topic expanded. Same top-level
// placement as ProgressCtx, for the same reason. Outside the provider (e.g.
// in a test) there are no links and openGrammar is null, so a link would
// render as plain text instead of a dead button.
import { createContext } from "react";

export const GrammarNavCtx = createContext({ openGrammar: null, linksFor: () => [] });
