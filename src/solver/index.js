// Barrel re-export for solver modules
// All public solver functions and constants accessible from one import

export { getSolver, getHighsSolver, resetHighs } from './highs.js';
export { filterPool } from './filterPool.js';
export { greedyOptimize } from './greedy.js';
export { optimizeLP } from './lpSolver.js';
export { optimizeMIP_v2 } from './mipV2.js';
export { solveLexicographic, LEX_OBJECTIVES } from './lexicographic.js';
export { runAutoOptimize } from './autoOptimize.js';
export { computeQuickFrontier, RESET_INTERVAL } from './frontier.js';

// Shared helpers (commonly needed by callers)
export {
  stats,
  filterEligible,
  baseScoreFn,
  parsePfFlags,
  checkDurationConflict,
  getMatBucket,
  catEnabled,
  catMinMax,
  resolveCatLimit,
  resolveCatLimitsMinMax,
  validateSolution,
  EPSILON,
  PF_AVG_SLACK,
  COEFF_NOISE,
  REGION_DEFS,
  resolveAllowedCountries,
} from './solverHelpers.js';
