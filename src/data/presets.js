// Default optimization scenario presets shown in the UI.
// Each entry maps a user-facing name and icon to an objective key (o) from OBJ
// and an optional ESG target percentage (g).
// OBJ is imported here only for documentation purposes; the preset values are
// self-contained strings that match keys in OBJ.

import { OBJ } from "./objectives.js"; // eslint-disable-line no-unused-vars

export const DEFAULT_PRESETS = [
  { id: 1,  n: "Maximale Rendite",          i: "📈",  o: "yield",         g: 0  },
  { id: 2,  n: "Maximaler Kupon",           i: "💰",  o: "coupon",        g: 0  },
  { id: 3,  n: "Maximaler Spread",          i: "📊",  o: "spread",        g: 0  },
  { id: 4,  n: "Rendite / RW",              i: "⚡",  o: "retRW",         g: 0  },
  { id: 5,  n: "Rendite je Basispunkt",     i: "🛡️", o: "retPVBP",       g: 0  },
  { id: 6,  n: "ESG-Fokus 30%",             i: "🌱",  o: "yield",         g: 30 },
  { id: 7,  n: "ESG-Fokus 50%",             i: "🌿",  o: "balanced",      g: 50 },
  { id: 8,  n: "Spread / RW",               i: "🎯",  o: "sprRW",         g: 0  },
  { id: 9,  n: "Ausgewogene Optimierung",   i: "⚖️", o: "balanced",      g: 0  },
  { id: 10, n: "Max ESG → Rendite",         i: "🌍",  o: "esgYield",      g: 0  },
  { id: 11, n: "Lexikographisch",           i: "🔗",  o: "lexicographic", g: 0  },
  { id: 12, n: "Auto-Optimize",             i: "🚀",  o: "autoOptimize",  g: 0  },
];
