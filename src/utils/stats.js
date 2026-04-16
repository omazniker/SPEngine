// Portfolio KPI statistics and issuer concentration helpers.
// stats(pf) computes weighted averages, sector/rank/structure breakdowns, and min/max ranges.
// getIssuerStats(pf) aggregates bonds by issuer ticker for concentration analysis.

import { LBL } from '../data/ratings.js';

/**
 * Compute comprehensive portfolio KPI statistics from a list of bond objects.
 * Bonds are expected to carry fields: nom, y, s, k, md, rw, lqa, px, mty, ln,
 * g, rank, kpnTyp, callable, perpetual, sektor, lo, bkt, e, t, co.
 *
 * @param {Array<Object>} pf - Portfolio bond array.
 * @returns {Object|null} KPI object, or null if portfolio is empty.
 */
export function stats(pf) {
  if (!pf || !pf.length) return null;
  const tN = pf.reduce((a, b) => a + (b.nom || 0), 0);
  if (!tN) return null;
  const w = f => tN > 0 ? pf.reduce((a, b) => a + (b[f] || 0) * ((b.nom || 0) / tN), 0) : 0;
  const gN = pf.filter(b => b.g === 1).reduce((a, b) => a + (b.nom || 0), 0);
  const bN = pf.filter(b => b.ln >= 8 && b.ln < 99).reduce((a, b) => a + (b.nom || 0), 0);
  const tRWA = pf.reduce((a, b) => a + (b.nom || 0) * ((b.rw || 0) / 100) * 0.08, 0);
  const ic = {}; const icMap = {};
  pf.forEach(b => { ic[b.e] = (ic[b.e] || 0) + (b.nom || 0); if(!icMap[b.e]) icMap[b.e] = b.co; });
  const cc = {}; pf.forEach(b => { cc[b.co] = (cc[b.co] || 0) + (b.nom || 0); });
  const bc = {}; pf.forEach(b => { bc[b.bkt] = (bc[b.bkt] || 0) + (b.nom || 0); });
  const rc = {}; pf.forEach(b => { rc[b.lo] = (rc[b.lo] || 0) + (b.nom || 0); });
  const rkc = {};
  pf.forEach(b => { rkc[b.rank || "SP"] = (rkc[b.rank || "SP"] || 0) + (b.nom || 0); });
  const spN = pf.filter(b => (b.rank || "SP") === "SP").reduce((a, b2) => a + (b2.nom || 0), 0);
  const snpN = pf.filter(b => (b.rank || "SP") === "SNP").reduce((a, b2) => a + (b2.nom || 0), 0);
  const suN = pf.filter(b => b.rank === "SU").reduce((a, b2) => a + (b2.nom || 0), 0);
  const secN = pf.filter(b => b.rank === "SEC").reduce((a, b2) => a + (b2.nom || 0), 0);
  const t2N = pf.filter(b => b.rank === "T2").reduce((a, b2) => a + (b2.nom || 0), 0);
  const at1N = pf.filter(b => b.rank === "AT1").reduce((a, b2) => a + (b2.nom || 0), 0);
  const callN = pf.filter(b => b.callable && !b.perpetual).reduce((a, b) => a + (b.nom || 0), 0);
  const perpN = pf.filter(b => b.perpetual).reduce((a, b) => a + (b.nom || 0), 0);
  const bullN = tN - callN - perpN;
  const fixN = pf.filter(b => (b.kpnTyp || "FIXED") === "FIXED").reduce((a, b) => a + (b.nom || 0), 0);
  const varN = pf.filter(b => b.kpnTyp === "VARIABLE").reduce((a, b) => a + (b.nom || 0), 0);
  const zeroN = pf.filter(b => b.kpnTyp === "ZERO COUPON").reduce((a, b) => a + (b.nom || 0), 0);
  const banksN = pf.filter(b => b.sektor === "BANKS").reduce((a, b) => a + (b.nom || 0), 0);
  const insN = pf.filter(b => b.sektor === "INSURANCE").reduce((a, b) => a + (b.nom || 0), 0);
  const finN = pf.filter(b => b.sektor === "FINANCIALS").reduce((a, b) => a + (b.nom || 0), 0);
  const reitsN = pf.filter(b => b.sektor === "REITS").reduce((a, b) => a + (b.nom || 0), 0);
  const otherN = pf.filter(b => (b.sektor || "OTHER") === "OTHER").reduce((a, b) => a + (b.nom || 0), 0);
  const sc = {}; pf.forEach(b => { const sek = b.sektor || "OTHER"; sc[sek] = (sc[sek] || 0) + (b.nom || 0); });
  const wR = w("rw");
  const ratedPf = pf.filter(b => b.ln < 99);
  const ratedN = ratedPf.reduce((a, b) => a + (b.nom || 0), 0);
  const wLn = ratedN > 0 ? ratedPf.reduce((a, b) => a + b.ln * ((b.nom || 0) / ratedN), 0) : 0;
  const wY = w("y"), wD = w("md");
  const yDur = wD > 0.01 ? wY / wD : 0;
  const wMacD = tN > 0 ? pf.reduce((a, b) => a + ((b.md || 0) * (1 + (b.y || 0) / 100)) * ((b.nom || 0) / tN), 0) : 0;
  const numV = (arr, f) => arr.map(b => b[f]).filter(v => v != null && !isNaN(v));
  const minY = tN > 0 ? Math.min(...(numV(pf,'y').length ? numV(pf,'y') : [0])) : 0;
  const maxY = tN > 0 ? Math.max(...(numV(pf,'y').length ? numV(pf,'y') : [0])) : 0;
  const minK = tN > 0 ? Math.min(...(numV(pf,'k').length ? numV(pf,'k') : [0])) : 0;
  const maxK = tN > 0 ? Math.max(...(numV(pf,'k').length ? numV(pf,'k') : [0])) : 0;
  const minS = tN > 0 ? Math.min(...(numV(pf,'s').length ? numV(pf,'s') : [0])) : 0;
  const maxS = tN > 0 ? Math.max(...(numV(pf,'s').length ? numV(pf,'s') : [0])) : 0;
  const minD = tN > 0 ? Math.min(...(numV(pf,'md').length ? numV(pf,'md') : [0])) : 0;
  const maxD = tN > 0 ? Math.max(...(numV(pf,'md').length ? numV(pf,'md') : [0])) : 0;
  const minPx = tN > 0 ? Math.min(...(numV(pf,'px').length ? numV(pf,'px') : [0])) : 0;
  const maxPx = tN > 0 ? Math.max(...(numV(pf,'px').length ? numV(pf,'px') : [0])) : 0;
  const minM = tN > 0 ? Math.min(...(numV(pf,'mty').length ? numV(pf,'mty') : [0])) : 0;
  const maxM = tN > 0 ? Math.max(...(numV(pf,'mty').length ? numV(pf,'mty') : [0])) : 0;
  return {
    tN, tRWA, wS: w("s"), wY: w("y"), wK: w("k"), wM: w("mty"), wD: w("md"), wR, wL: w("lqa"), wPx: w("px"),
    wLn, yDur, wMacD, minY, maxY, minK, maxK, minS, maxS, minD, maxD, minPx, maxPx, minM, maxM,
    gN, gP: tN > 0 ? gN / tN : 0, bN, bP: tN > 0 ? bN / tN : 0, r20P: tN > 0 ? pf.filter(b => b.rw === 20).reduce((a, b) => a + (b.nom || 0), 0) / tN : 0,
    yRw: tN > 0 ? pf.reduce((a, b) => a + (b.yRw || 0) * ((b.nom || 0) / tN), 0) : 0,
    sRw: tN > 0 ? pf.reduce((a, b) => a + (b.sRw || 0) * ((b.nom || 0) / tN), 0) : 0,
    ic, icMap, cc, bc, rc, nb: pf.length, ni: Object.keys(ic).length,
    rkc,
    spN,
    snpN,
    suN,
    secN,
    spP: tN > 0 ? spN / tN : 0,
    snpP: tN > 0 ? snpN / tN : 0,
    suP: tN > 0 ? suN / tN : 0,
    secP: tN > 0 ? secN / tN : 0,
    callN,
    bullN,
    t2N, at1N,
    t2P: tN > 0 ? t2N / tN : 0,
    at1P: tN > 0 ? at1N / tN : 0,
    callP: tN > 0 ? callN / tN : 0,
    perpN,
    perpP: tN > 0 ? perpN / tN : 0,
    bullP: tN > 0 ? bullN / tN : 0,
    fixN, varN, zeroN,
    fixP: tN > 0 ? fixN / tN : 0,
    varP: tN > 0 ? varN / tN : 0,
    zeroP: tN > 0 ? zeroN / tN : 0,
    banksN, insN, finN, reitsN, otherN, sc,
    banksP: tN > 0 ? banksN / tN : 0,
    insP: tN > 0 ? insN / tN : 0,
    finP: tN > 0 ? finN / tN : 0,
    reitsP: tN > 0 ? reitsN / tN : 0,
    otherP: tN > 0 ? otherN / tN : 0,
    nomStats: (() => {
      const noms = pf.map(b => b.nom || 0).filter(v => v > 0).sort((a, b) => a - b);
      const n = noms.length;
      if (n === 0) return { min: 0, max: 0, med: 0, avg: 0 };
      const med = n % 2 === 1 ? noms[Math.floor(n / 2)] : (noms[n / 2 - 1] + noms[n / 2]) / 2;
      return { min: noms[0], max: noms[n - 1], med, avg: noms.reduce((a, b) => a + b, 0) / n };
    })()
  };
}

/**
 * Aggregate portfolio bonds by issuer ticker, computing per-issuer KPIs
 * and concentration weights.
 *
 * @param {Array<Object>} pf - Portfolio bond array.
 * @returns {Array<Object>} Array of issuer stat objects, sorted by nominal descending.
 */
export function getIssuerStats(pf) {
  if (!pf || !pf.length) return [];
  const map = {};
  let tN_total = 0;
  pf.forEach(b => {
    const nom = b.nom || 0;
    tN_total += nom;
    if(!map[b.t]) map[b.t] = { t: b.t, e: b.e, co: b.co, sektor: b.sektor || 'OTHER', nom: 0, count: 0, wY: 0, wS: 0, wD: 0, gNom: 0, rwNom: 0, wLn: 0, spNom: 0, snpNom: 0, suNom: 0, secNom: 0, callNom: 0, lockedNom: 0, neuNom: 0, lockedCount: 0, neuCount: 0 };
    map[b.t].nom += nom; map[b.t].count += 1; map[b.t].wY += b.y * nom; map[b.t].wS += b.s * nom;
    map[b.t].wD += b.md * nom; map[b.t].wLn += b.ln * nom;
    if(b.g === 1) map[b.t].gNom += nom; map[b.t].rwNom += b.rw * nom;
    if ((b.rank || "SP") === "SP") map[b.t].spNom += nom;
    if ((b.rank || "SP") === "SNP") map[b.t].snpNom += nom;
    if (b.rank === "SU") map[b.t].suNom += nom;
    if (b.rank === "SEC") map[b.t].secNom += nom;
    if (b.callable) map[b.t].callNom += nom;
    if (b.locked) { map[b.t].lockedNom += nom; map[b.t].lockedCount += 1; }
    else { map[b.t].neuNom += nom; map[b.t].neuCount += 1; }
  });
  return Object.values(map).map(i => {
    const avgLn = i.nom > 0 ? i.wLn / i.nom : 99;
    return { ...i, wY: i.nom > 0 ? i.wY / i.nom : 0, wS: i.nom > 0 ? i.wS / i.nom : 0,
      wD: i.nom > 0 ? i.wD / i.nom : 0, wLn: avgLn, lo: LBL[Math.round(avgLn)] || "NR",
      gP: i.nom > 0 ? i.gNom / i.nom : 0, wR: i.nom > 0 ? i.rwNom / i.nom : 0,
      weight: tN_total > 0 ? i.nom / tN_total : 0,
      spP: i.nom > 0 ? i.spNom / i.nom : 0,
      snpP: i.nom > 0 ? i.snpNom / i.nom : 0,
      suP: i.nom > 0 ? i.suNom / i.nom : 0,
      secP: i.nom > 0 ? i.secNom / i.nom : 0,
      ranks: [i.spNom > 0 && "SP", i.suNom > 0 && "SU", i.snpNom > 0 && "SNP", i.secNom > 0 && "SEC"].filter(Boolean).join("+") || "SP",
      callP: i.nom > 0 ? i.callNom / i.nom : 0,
      hasCallable: i.callNom > 0
    };
  }).sort((a,b) => b.nom - a.nom);
}
