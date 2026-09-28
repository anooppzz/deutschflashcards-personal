// Lets a card or trainer open a grammar topic (switch to the Grammatik tab
// with that topic expanded) without passing a callback through every view.
// Same top-level placement as ProgressCtx, for the same reason. The default
// is null so a component rendered outside the provider (e.g. in a test)
// shows its grammar link as plain text instead of a dead button.
import { createContext } from "react";

export const GrammarNavCtx = createContext({ openGrammar: null });
