// Shared utilities, constants and hooks for all DeepDive panel components.
// These are extracted 1-to-1 from the monolithic HTML source (lines ~3803-4451).

import React from 'react';

// ─── Chart colour palettes ───────────────────────────────────────────────────

export const REPORT_COLORS = [
  '#E2001A', '#3B82F6', '#64748B', '#F59E0B', '#10B981',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1',
];

export const RATING_COLORS = {
  AAA: '#065F46', 'AA+': '#047857', AA: '#059669', 'AA-': '#10B981',
  'A+': '#3B82F6', A: '#2563EB', 'A-': '#1D4ED8',
  'BBB+': '#F59E0B', BBB: '#D97706', 'BBB-': '#B45309',
};

// ─── Chart.js defaults factory ───────────────────────────────────────────────

const CHART_FONT = "'Source Sans 3', sans-serif";

export const chartDefaults = (extra) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        font: { family: CHART_FONT, size: 11, weight: '600' },
        padding: 14,
        usePointStyle: true,
        pointStyleWidth: 10,
      },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { family: CHART_FONT, weight: '700', size: 12 },
      bodyFont: { family: CHART_FONT, size: 11 },
      cornerRadius: 8,
      padding: { x: 12, y: 8 },
      boxPadding: 4,
    },
  },
  ...(extra || {}),
});

// ─── useChart hook ────────────────────────────────────────────────────────────

/**
 * Creates and manages a Chart.js instance bound to a canvas ref.
 * @param {Function} cfgFn - Function returning a Chart.js config object (or null to skip).
 * @param {Array}    deps  - React dependency array (same as useEffect).
 * @returns {{ canvasRef: React.RefObject, chartRef: React.RefObject }}
 */
export function useChart(cfgFn, deps) {
  const canvasRef = React.useRef(null);
  const chartRef  = React.useRef(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    if (typeof Chart === 'undefined') return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const cfg = typeof cfgFn === 'function' ? cfgFn() : cfgFn;
    if (!cfg) return;
    chartRef.current = new Chart(canvasRef.current.getContext('2d'), cfg);
    return () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { canvasRef, chartRef };
}

// ─── DeepDive domain constants ────────────────────────────────────────────────

export const DD_BUCKET_LABELS = [
  '0-1Y', '1-2Y', '2-3Y', '3-4Y', '4-5Y',
  '5-6Y', '6-7Y', '7-8Y', '8-9Y', '9-10Y', '10-15Y', '15Y+',
];

export const DD_RATING_ORDER = [
  'AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-',
];

export const DD_RATING_CLASSES = {
  AAA: ['AAA'],
  AA:  ['AA+', 'AA', 'AA-'],
  A:   ['A+',  'A',  'A-'],
  BBB: ['BBB+', 'BBB', 'BBB-'],
};

export const DD_RATING_CLASS_COLORS = {
  AAA: '#10B981',
  AA:  '#3B82F6',
  A:   '#F59E0B',
  BBB: '#EF4444',
};

export const DD_ESG_COLORS = {
  AAA: '#065F46', AA: '#059669', A: '#10B981',
  BBB: '#FBBF24', BB: '#F59E0B', B: '#EA580C',
  CCC: '#DC2626', 'N.S.': '#94A3B8',
};

export const DD_LQA_BINS   = [[0, 20], [20, 40], [40, 60], [60, 80], [80, 100]];
export const DD_LQA_COLORS = ['#EF4444', '#F97316', '#FBBF24', '#84CC16', '#10B981'];

// Sector display labels (also used by DeepDiveSector)
export const SEKTOR_LABELS = {
  BANKS:      'Banken',
  INSURANCE:  'Versicherungen',
  FINANCIALS: 'Finanzdienstleister',
  REITS:      'Immobilien/REITs',
  OTHER:      'Sonstige',
};

// ─── Pure helper functions ────────────────────────────────────────────────────

/**
 * Herfindahl-Hirschman Index for a count map.
 * @param {{ [key: string]: number }} countMap
 * @param {number} total
 */
export function calcHHI(countMap, total) {
  if (!total) return 0;
  return Object.values(countMap).reduce(
    (sum, v) => sum + Math.pow((v / total) * 100, 2),
    0,
  );
}

/**
 * Ordinary-least-squares linear regression.
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {{ slope: number, intercept: number, r2: number }}
 */
export function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 3) return { slope: 0, intercept: 0, r2: 0 };
  const sumX  = xs.reduce((a, b) => a + b, 0);
  const sumY  = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope     = denom ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  const ssTot = ys.reduce((a, y) => a + (y - yMean) ** 2, 0);
  const ssRes = ys.reduce((a, y, i) => a + (y - (slope * xs[i] + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}

/**
 * Approximate bond convexity from modified duration and YTM.
 * @param {number} md  - Modified duration (years)
 * @param {number} ytm - Yield-to-maturity (percent, e.g. 3.5 for 3.5%)
 */
export function approxConvexity(md, ytm) {
  if (!md || !ytm) return 0;
  const y = ytm / 100;
  return (md * md + md) / Math.pow(1 + y, 2);
}

// Sector classification lookup table + fallback function
const SECTOR_MAP = [
  { key: 'Banken',            patterns: ['bank','sparkasse','landesbank','crédit','credit','bnp','ing','commerz','deutsche bk','socgen','hsbc','barclays','jpmorgan','citi','goldman','morgan stanley','ubs','rabobank','nordea','danske','seb','handelsbanken','intesa','unicredit','bbva','santander','caixa'] },
  { key: 'Versicherungen',    patterns: ['versicherung','insurance','allianz','axa','generali','zurich','munich re','hannover','swiss re','prudential','aviva','legal & general','nn group','talanx','mapfre'] },
  { key: 'Versorger',         patterns: ['energie','strom','gas','engie','edf','rwe','enel','iberdrola','endesa','enbw','vattenfall','fortum','orsted','elia','tennet','amprion'] },
  { key: 'Automobil',         patterns: ['bmw','volkswagen','vw','daimler','mercedes','renault','stellantis','porsche','volvo','ford','toyota'] },
  { key: 'Immobilien',        patterns: ['immobil','vonovia','leg ','aroundtown','grand city','unibail','gecina','covivio','deutsche wohnen'] },
  { key: 'Telekommunikation', patterns: ['telekom','telefon','vodafone','orange','swisscom','telenor','telia','kpn'] },
  { key: 'Sonstige',          patterns: [] },
];

/**
 * Classify an issuer name into a sector key.
 * @param {string} emitterName
 * @returns {string}
 */
export function classifySector(emitterName) {
  const lower = (emitterName || '').toLowerCase();
  for (const sec of SECTOR_MAP) {
    if (sec.patterns.some(p => lower.includes(p))) return sec.key;
  }
  return 'Sonstige';
}
