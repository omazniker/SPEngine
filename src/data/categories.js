// Category arrays, short-label maps, stat-key maps, maturity bucket helpers,
// and default limit objects for all filterable bond dimensions.

import { RATING_LABELS } from "./ratings.js";

export const RANK_CATS     = ["SP", "SU", "SNP", "SEC", "T2", "AT1"];
export const STRUKTUR_CATS = ["BULLET", "CALLABLE", "PERPETUAL"];
export const KUPON_CATS    = ["FIXED", "VARIABLE", "ZERO COUPON"];
export const SEKTOR_CATS   = ["BANKS", "INSURANCE", "FINANCIALS", "REITS", "OTHER"];

export const STRUKTUR_SHORT = { BULLET: "Bullet", CALLABLE: "Call", PERPETUAL: "Perp" };
export const KUPON_SHORT    = { FIXED: "Fix", VARIABLE: "Var", "ZERO COUPON": "Zero" };
export const SEKTOR_SHORT   = { BANKS: "Banken", INSURANCE: "Versich.", FINANCIALS: "Finanz.", REITS: "REITs", OTHER: "Sonst." };

export const RANK_STAT_KEY    = { SP: "spP", SU: "suP", SNP: "snpP", SEC: "secP", T2: "t2P", AT1: "at1P" };
export const STRUKTUR_STAT_KEY = { BULLET: "bullP", CALLABLE: "callP", PERPETUAL: "perpP" };
export const KUPON_STAT_KEY   = { FIXED: "fixP", VARIABLE: "varP", "ZERO COUPON": "zeroP" };
export const SEKTOR_STAT_KEY  = { BANKS: "banksP", INSURANCE: "insP", FINANCIALS: "finP", REITS: "reitsP", OTHER: "otherP" };

export const MATURITY_BUCKET_LABELS = ["0-1Y","1-2Y","2-3Y","3-4Y","4-5Y","5-6Y","6-7Y","7-8Y","8-9Y","9-10Y","10Y+"];

export const getMatBucket = (mty) => { if (mty < 1) return "0-1Y"; if (mty < 2) return "1-2Y"; if (mty < 3) return "2-3Y"; if (mty < 4) return "3-4Y"; if (mty < 5) return "4-5Y"; if (mty < 6) return "5-6Y"; if (mty < 7) return "6-7Y"; if (mty < 8) return "7-8Y"; if (mty < 9) return "8-9Y"; if (mty < 10) return "9-10Y"; return "10Y+"; };

// Internal helpers for default limit objects.
const _on  = { enabled: true,  min: "", max: "" };
const _off = { enabled: false, min: "", max: "" };

export const defaultRatingLimits   = Object.fromEntries(RATING_LABELS.map(r => [r, { ..._on }]));
export const defaultRankLimits     = { SP: { ..._on }, SU: { ..._off }, SNP: { ..._off }, SEC: { ..._off }, T2: { ..._off }, AT1: { ..._off } };
export const defaultStrukturLimits = { BULLET: { ..._on }, CALLABLE: { ..._off }, PERPETUAL: { ..._off } };
export const defaultKuponLimits    = { FIXED: { ..._on }, VARIABLE: { ..._off }, "ZERO COUPON": { ..._off } };
export const defaultSektorLimits   = { BANKS: { ..._on }, INSURANCE: { ..._on }, FINANCIALS: { ..._on }, REITS: { ..._off }, OTHER: { ..._off } };
export const defaultMatBucketLimits = Object.fromEntries(MATURITY_BUCKET_LABELS.map(b => [b, { ..._on }]));
