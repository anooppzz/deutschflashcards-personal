// Shared progress context. Lives at this top level (not inside app/ or
// components/) because both the app shell (which creates the Provider) and
// shared components like FlipCard (which consume it via useContext) need
// access to it without violating the app -> components -> engine dependency
// direction - a component reaching into app/ would invert that rule.
import { createContext } from "react";

export const ProgressCtx = createContext({ progress: {}, mark: () => {} });
