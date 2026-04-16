// Barrel file: re-exports all 12 DeepDive panel components.
// Import individual components directly from their module for tree-shaking.

export { default as DeepDiveBarometer }    from './DeepDiveBarometer.jsx';
export { default as DeepDiveConcentration } from './DeepDiveConcentration.jsx';
export { default as DeepDiveCurve }        from './DeepDiveCurve.jsx';
export { default as DeepDiveLiquidity }    from './DeepDiveLiquidity.jsx';
export { default as DeepDiveStructure }    from './DeepDiveStructure.jsx';
export { default as DeepDiveCarry }        from './DeepDiveCarry.jsx';
export { default as DeepDiveESG }          from './DeepDiveESG.jsx';
export { default as DeepDiveRanges }       from './DeepDiveRanges.jsx';
export { default as DeepDiveSector }       from './DeepDiveSector.jsx';
export { default as DeepDiveRWA }          from './DeepDiveRWA.jsx';
export { default as DeepDiveConvexity }    from './DeepDiveConvexity.jsx';
export { default as DeepDivePeers }        from './DeepDivePeers.jsx';

// Also re-export shared utilities so callers can import chart helpers
// from the same directory when convenient.
export {
  useChart,
  chartDefaults,
  calcHHI,
  linearRegression,
  approxConvexity,
  classifySector,
  REPORT_COLORS,
  RATING_COLORS,
  DD_BUCKET_LABELS,
  DD_RATING_ORDER,
  DD_RATING_CLASSES,
  DD_RATING_CLASS_COLORS,
  DD_ESG_COLORS,
  DD_LQA_BINS,
  DD_LQA_COLORS,
  SEKTOR_LABELS,
} from './deepdiveUtils.js';
