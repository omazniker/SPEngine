// Rating maps and normalisation helpers used throughout the portfolio engine.
// RM: Moody's rating-to-numeric-rank map (Aaa = 1 … Baa3 = 10).
// RS: S&P rating-to-numeric-rank map (AAA = 1 … BBB- = 10).
// LBL: Numeric rank back to S&P label string.
// RATING_LABELS: Ordered array of S&P labels (best to worst).
// MOODYS_MAP: S&P label → Moody's label cross-reference.
// normMo / normSp: Normalise raw rating strings to the canonical map keys.

export const RM = { Aaa: 1, Aa1: 2, Aa2: 3, Aa3: 4, A1: 5, A2: 6, A3: 7, Baa1: 8, Baa2: 9, Baa3: 10 };

// normSp must be declared before it is referenced inside normMo, so RS comes first.
export const RS = { AAA: 1, "AA+": 2, AA: 3, "AA-": 4, "A+": 5, A: 6, "A-": 7, "BBB+": 8, BBB: 9, "BBB-": 10 };

export const normMo = (r) => { if (!r || RM[r]) return r; const s = r.trim(); const m = s.match(/^(Aaa|AAA|Aa|AA|A|Baa|BBB|Ba|BB|B)(\d)$/i); if (!m) return s; const p = { AAA: 'Aaa', AA: 'Aa', A: 'A', BBB: 'Baa', BB: 'Ba', B: 'B', BAA: 'Baa', BA: 'Ba' }; return (p[m[1].toUpperCase()] || m[1]) + m[2]; };

export const normSp = (r) => { if (!r || RS[r]) return r; const s = r.trim(); if (RS[s]) return s; const u = s.toUpperCase(); if (RS[u]) return u; const m = u.match(/^(AAA|AA|A|BBB|BB|B)([\+\-])?$/); if (!m) return s; return m[1] + (m[2] || ''); };

export const LBL = { 1: "AAA", 2: "AA+", 3: "AA", 4: "AA-", 5: "A+", 6: "A", 7: "A-", 8: "BBB+", 9: "BBB", 10: "BBB-" };

export const RATING_LABELS = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-"];

export const MOODYS_MAP = { AAA: "Aaa", "AA+": "Aa1", AA: "Aa2", "AA-": "Aa3", "A+": "A1", A: "A2", "A-": "A3", "BBB+": "Baa1", BBB: "Baa2", "BBB-": "Baa3" };
