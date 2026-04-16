// Investment policy filter — filters bond universe to eligible bonds
// Source: tests/test_lexicographic.html function filterEligible (~line 5811)
// The full filterEligible implementation lives in solverHelpers.js (shared with all solvers).
// This module re-exports it as filterPool per the module spec.

import { filterEligible } from './solverHelpers.js';

export function filterPool(pool, cfg) {
  return filterEligible(pool, cfg);
}
