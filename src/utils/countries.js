// Country and region resolution helpers for investment policy filtering.
// resolveAllowedCountries converts a list of region keys (e.g. ["EWR", "USA"])
// into a Set of ISO 3166-1 alpha-2 country codes, or null when no filter is active.

import { REGION_DEFS } from '../data/countries.js';

/**
 * Resolve a list of region keys into a Set of allowed ISO country codes.
 * Returns null when the regions array is empty or falsy, meaning no country
 * filter is active and all countries are permitted.
 *
 * @param {string[]|null|undefined} regions - Array of region keys (e.g. ["EWR", "USA"]).
 * @returns {Set<string>|null} Set of two-letter country codes, or null for no filter.
 */
export function resolveAllowedCountries(regions) {
  if (!regions || regions.length === 0) return null; // null = kein Regionenfilter aktiv
  const s = new Set();
  regions.forEach(r => { const d = REGION_DEFS[r]; if (d) d.countries.forEach(c => s.add(c)); });
  return s;
}
