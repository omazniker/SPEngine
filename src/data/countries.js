// Country and region definitions used by the bond explorer and investment
// guideline filters.
// EWR_COUNTRIES, OECD_EUR_COUNTRIES, OECD_OTHER_COUNTRIES, CHANNEL_ISLANDS:
//   Arrays of ISO 3166-1 alpha-2 country codes per region.
// REGION_DEFS: Map of region key → { label, countries }.
// REGION_KEYS: Ordered array of region keys derived from REGION_DEFS.
// CO: Bloomberg ticker → ISO country code (used for bond display).
// CN: ISO country code → German country name.

export const EWR_COUNTRIES = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE"];

// OECD Europa: europäische OECD-Mitglieder (inkl. CH, GB, TR die nicht im EWR sind)
export const OECD_EUR_COUNTRIES = ["AT","BE","CH","CZ","DK","EE","FI","FR","DE","GR","HR","HU","IS","IE","IT","LV","LT","LU","NL","NO","PL","PT","SK","SI","ES","SE","TR","GB"];

// OECD Sonstige: nicht-europäische OECD (JP, CA, AU, KR, NZ, IL, MX, CL, CO, CR)
export const OECD_OTHER_COUNTRIES = ["AU","CA","CL","CO","CR","IL","JP","KR","MX","NZ"];

export const CHANNEL_ISLANDS = ["GG","JE"]; // Guernsey, Jersey

export const REGION_DEFS = {
  EWR:        { label: "EWR (EU + IS/LI/NO)", countries: EWR_COUNTRIES },
  OECD_EUR:   { label: "OECD Europa (CH/GB/TR)", countries: OECD_EUR_COUNTRIES },
  USA:        { label: "USA", countries: ["US"] },
  OECD_OTHER: { label: "OECD Sonstige (JP/CA/AU/...)", countries: OECD_OTHER_COUNTRIES },
  CH_ISLANDS: { label: "Kanalinseln (GG/JE)", countries: CHANNEL_ISLANDS },
};

export const REGION_KEYS = Object.keys(REGION_DEFS);

// Ticker → ISO country code (for bond-level country display)
export const CO = {
  NWIDE: "GB", CABKSM: "ES", BFCM: "FR", ACAFP: "FR", SANTAN: "ES", ABNANV: "NL",
  OPBANK: "FI", SHBASS: "SE", NDAFH: "FI", SEB: "SE", VW: "DE", SWEDA: "SE",
  SOCGEN: "FR", ISPIM: "IT", CCBGBB: "BE", SBAB: "SE", ISLBAN: "IS", LFBANK: "SE",
  BPCEGP: "FR", AYVFP: "FR", CMZB: "DE", UCGIM: "IT", BBVASM: "ES", SANSCF: "ES",
  FRLBP: "FR", ERSTBK: "AT", SEK: "SE", HSBC: "FR", DEKA: "DE",
  DB: "DE", BNP: "FR", CXGD: "PT", DNBNO: "NO", BCPPL: "PT", NOVALJ: "SI",
  DANBNK: "DK", RBIAV: "AT", CRELAN: "BE", ASNBNK: "NL", BSTLAF: "FR", RABOBK: "NL"
};

// ISO country code → German country name
export const CN = {
  GB: "UK", ES: "Spanien", FR: "Frankreich", NL: "Niederlande", FI: "Finnland",
  SE: "Schweden", DE: "Deutschland", IT: "Italien", BE: "Belgien", IS: "Island",
  AT: "Österreich", PT: "Portugal", IE: "Irland", DK: "Dänemark",
  NO: "Norwegen", LU: "Luxemburg", US: "USA", SI: "Slowenien",
  CH: "Schweiz", JP: "Japan", AU: "Australien", CA: "Kanada",
  GR: "Griechenland", PL: "Polen", HU: "Ungarn", LT: "Litauen",
  SG: "Singapur", BM: "Bermuda", BS: "Bahamas", HK: "Hongkong",
  CY: "Zypern", CZ: "Tschechien", CO: "Kolumbien", RO: "Rumänien",
  EE: "Estland", ZA: "Südafrika", LV: "Lettland"
};
