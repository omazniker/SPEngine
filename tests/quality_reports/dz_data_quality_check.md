# DZ Data Quality Check Report

**Date:** 2026-03-21

**Source:** test_lexicographic.html (DZ Spread-Report 18.03.2026)

---

## 1. Data Overview

| Dataset | Expected | Actual |
|---|---|---|
| DZ_SPREAD_BONDS | 912 | 912 |
| DZ_EMITTENTEN_DATA | 85 | 85 |
| MASTERLISTE_TICKERS | 75 | 75 |
| DZ_IBOXX_DATA | 78 | 78 |
| DZ_SPREAD_SECTIONS | 10 | 10 |

## 2. Completeness

### 2.1 Bonds - Missing Values (DZ_SPREAD_BONDS)

| Field | Null Count | Total | Completeness |
|---|---|---|---|
| vol (Volume) | 527 | 912 | 42.2% |
| px (Price) | 0 | 912 | 100.0% |
| yd (Yield) | 69 | 912 | 92.4% |
| zs (Spread) | 167 | 912 | 81.7% |

**Key string fields (empty check):**

| Field | Empty Count | Completeness |
|---|---|---|
| section | 0 | 100.0% |
| emittent | 0 | 100.0% |
| isin | 0 | 100.0% |
| name | 0 | 100.0% |

### 2.2 Emittenten - Empty Tickers

**Count:** 13 of 85 emittents have empty ticker (t="")

| # | Name | Country | DZ Rating | Credit Trend |
|---|---|---|---|---|
| 1 | Aegon | NL | MR | stabil |
| 2 | ASN Bank | NL | LR | stabil |
| 3 | Bayerische Landesbank | DE | LR | stabil |
| 4 | Belfius Bank | BE | LR | stabil |
| 5 | DekaBank | DE | LR | stabil |
| 6 | HYPO NOE | AT | LR | stabil |
| 7 | La Banque Postale | FR | LR | stabil |
| 8 | Landesb. Baden-Württemberg | DE | LR | stabil |
| 9 | Landesbank Hessen-Thüringen | DE | LR | stabil |
| 10 | NORD/LB Girozentrale | DE | LR | stabil |
| 11 | RLB Oberösterreich | AT | MR | stabil |
| 12 | SBAB Bank | SE | LR | stabil |
| 13 | Sparebanken Norge | NO | LR | stabil |

### 2.3 Emittenten - All Ratings Missing (lr, sp, snp all "--/--/--")

**Count:** 3 of 85

| # | Ticker | Name | Country |
|---|---|---|---|
| 1 | ANZ | ANZ Group Holdings | AU |
| 2 | BAWAG | BAWAG Group | AT |
| 3 | ZURNVX | Zurich Insurance Group | CH |

## 3. Consistency

### 3.1 MASTERLISTE_TICKERS vs DZ_EMITTENTEN_DATA Tickers

- MASTERLISTE_TICKERS count: 75
- DZ_EMITTENTEN_DATA tickers (non-empty): 72
- Overlap: 72
- In MASTERLISTE but NOT in EMITTENTEN: **3**
  - ['ANZNZ', 'BGAV', 'WSTPNZ']
- In EMITTENTEN but NOT in MASTERLISTE: **0**

### 3.2 Bond Emittent Names vs DZ_EMITTENTEN_DATA Names

- Unique bond emittent names: 109
- Unique emittenten names: 85
- Bond emittents NOT found in EMITTENTEN_DATA: **52**

| # | Bond Emittent Name (unmatched) | Bond Count |
|---|---|---|
| 1 | ACTIVITY CO | 1 |
| 2 | ALLIANZ FINANCE II BV | 9 |
| 3 | ANZ NEW ZEALAND INT'L LTD/LONDON | 2 |
| 4 | ASB BANK LTD | 2 |
| 5 | ASB FINANCE LTD | 2 |
| 6 | ASN Bank NV | 4 |
| 7 | AYVENS SA | 4 |
| 8 | BANCA COMERCIALA ROMANA SA | 1 |
| 9 | BANK OF NEW ZEALAND | 2 |
| 10 | BAWAG GROUP AG | 1 |
| 11 | Banking Group | 2 |
| 12 | Barclays plc | 15 |
| 13 | Berlin Hyp | 2 |
| 14 | CA AUTO BANK SPA/IRELAND | 2 |
| 15 | CESKA SPORITELNA AS | 2 |
| 16 | CNP ASSURANCES SACA | 7 |
| 17 | COMMERCE | 5 |
| 18 | CREDIT AGRICOLE SA/LONDON | 2 |
| 19 | CREDIT SUISSE AG/LONDON | 1 |
| 20 | Commonwealth Bank of Australia | 2 |
| 21 | DESIGNATED ACTIVITY CO | 1 |
| 22 | DEUTSCHE KREDITBANK AG | 1 |
| 23 | DEUTSCHE PFANDBRIEFBANK AG | 1 |
| 24 | DNB BANK ASA | 5 |
| 25 | DekaBank Deutsche Girozentrale | 1 |
| 26 | Group | 1 |
| 27 | HSBC Continental Europe SA | 1 |
| 28 | ING Bank | 2 |
| 29 | INTESA SANPAOLO VITA SPA | 1 |
| 30 | JYSKE BANK A/S | 5 |
| 31 | KBC IFIMA SA | 1 |
| 32 | LA BANQUE POSTALE SA | 4 |
| 33 | LLOYDS BANK CORPORATE MARKETS PLC | 1 |
| 34 | NATIONWIDE BUILDING SOCIETY | 8 |
| 35 | NATWEST GROUP PLC | 10 |
| 36 | NATWEST MARKETS PLC | 7 |
| 37 | NIBC BANK NV | 2 |
| 38 | NORDEA BANK ABP | 16 |
| 39 | RAIFFEISENBANK AS | 1 |
| 40 | SANTANDER BANK POLSKA SA | 1 |
| 41 | SANTANDER CONSUMER FINANCE SA | 2 |
| 42 | SANTANDER UK GROUP HOLDINGS PLC | 2 |
| 43 | SANTANDER UK PLC | 3 |
| 44 | SOCIETA CATTOLICA DI ASSICURAZIONE | 1 |
| 45 | SOCIETY | 2 |
| 46 | SOGECAP SA | 2 |
| 47 | SWISS RE FINANCE LUXEMBOURG SA | 1 |
| 48 | SpareBank 1 Sør-Norge | 3 |
| 49 | Sparebank 1 SMN | 1 |
| 50 | Sparebank 1 Østlandet | 1 |
| 51 | UBS AG/LONDON | 2 |
| 52 | ZURICH INSURANCE CO LTD | 2 |

### 3.3 Section Code Validity

- Valid section codes: ['AT1', 'INS_FIX', 'INS_FLT', 'INS_T1', 'INS_T2', 'SNP_FIX', 'SNP_FLT', 'SP_FIX', 'SP_FLT', 'T2']
- Section codes used in bonds: ['AT1', 'INS_FLT', 'INS_T1', 'INS_T2', 'SNP_FIX', 'SNP_FLT', 'SP_FIX', 'SP_FLT', 'T2']
- Invalid section codes: **0**

**Section distribution:**

| Section | Full Name | Count | % |
|---|---|---|---|
| AT1 | AT1 | 74 | 8.1% |
| INS_FLT | Versicherungen Senior (Floater) | 17 | 1.9% |
| INS_T1 | Versicherungen Tier 1 | 16 | 1.8% |
| INS_T2 | Versicherungen Tier 2 | 34 | 3.7% |
| SNP_FIX | Senior Non-Preferred (Fix) | 408 | 44.7% |
| SNP_FLT | Senior Non-Preferred (Floater) | 32 | 3.5% |
| SP_FIX | Senior Preferred (Fix) | 146 | 16.0% |
| SP_FLT | Senior Preferred (Floater) | 55 | 6.0% |
| T2 | Tier 2 | 130 | 14.3% |

## 4. Validity

### 4.1 ISIN Format Validation

- Pattern: 2 uppercase letters + 10 alphanumeric characters (total 12)
- Valid ISINs: 912 of 912
- Invalid ISINs: **0**

**ISIN Country Code Distribution (top 15):**

| Country Code | Count | % |
|---|---|---|
| XS | 558 | 61.2% |
| FR | 182 | 20.0% |
| DE | 79 | 8.7% |
| BE | 30 | 3.3% |
| IT | 17 | 1.9% |
| CH | 16 | 1.8% |
| AT | 12 | 1.3% |
| DK | 11 | 1.2% |
| ES | 7 | 0.8% |

### 4.2 Price Range Validation (expected: 50-200)

- Non-null prices: 912 of 912
- Min: 77.14
- Max: 113.63
- Mean: 99.39
- Percentiles: P25=98.15, P50=100.03, P75=102.04
- Prices below 50: **0**
- Prices above 200: **0**

### 4.3 Yield Range Validation (expected: 0-20%)

- Non-null yields: 843 of 912
- Min: 1.42%
- Max: 19.00%
- Mean: 3.81%
- Percentiles: P25=3.18%, P50=3.52%, P75=3.89%
- Yields below 0%: **0**
- Yields above 20%: **0**

### 4.4 Spread Range Validation (expected: -50 to 1500 bp)

- Non-null spreads: 745 of 912
- Min: -74.0 bp
- Max: 301.0 bp
- Mean: 75.0 bp
- Percentiles: P25=51.0, P50=72.0, P75=94.0 bp
- Spreads below -50 bp: **1**
- Spreads above 1500 bp: **0**

**Out-of-range spreads:**

| Spread (bp) | ISIN | Name | Section |
|---|---|---|---|
| -74.0 | XS1062900912 | ASSGEN 4.125 05/04/2026 | INS_T2 |

## 5. Uniqueness

### 5.1 Duplicate ISINs in DZ_SPREAD_BONDS

- Total bonds: 912
- Unique ISINs: 912
- Duplicate ISINs: **0**

### 5.2 Duplicate Tickers in DZ_EMITTENTEN_DATA

- Total emittents: 85
- Unique tickers (non-empty): 72
- Duplicate tickers: **0**

## 6. Additional Checks

### 6.1 DZ_IBOXX_DATA Validation

- Total entries: 78
- Null current values: 0
- Negative current values: 1
- Entries with any null numeric field: 0

### 6.2 ESG Label Distribution (Bonds)

| ESG Label | Count | % |
|---|---|---|
| (empty string) | 742 | 81.4% |
| "Green" | 142 | 15.6% |
| "Social" | 27 | 3.0% |
| "SLB" | 1 | 0.1% |

### 6.3 Emittenten DZ Rating Distribution

| DZ Rating | Count | % |
|---|---|---|
| LR | 68 | 80.0% |
| MR | 14 | 16.5% |
| ER | 2 | 2.4% |
| NR | 1 | 1.2% |

### 6.4 Emittenten Country Distribution

| Country | Count |
|---|---|
| DE | 13 |
| US | 8 |
| FR | 8 |
| NL | 7 |
| GB | 7 |
| AT | 6 |
| NO | 5 |
| AU | 4 |
| CA | 4 |
| SE | 4 |
| ES | 3 |
| DK | 3 |
| IT | 3 |
| CH | 3 |
| BE | 2 |
| JP | 2 |
| FI | 2 |
| IE | 1 |

## 7. Quality Scorecard Summary

| Dimension | Metric | Score | Status |
|---|---|---|---|
| Completeness | Price (px) | 100.0% | PASS |
| Completeness | Yield (yd) | 92.4% | FAIL |
| Completeness | Spread (zs) | 81.7% | FAIL |
| Completeness | Volume (vol) | 42.2% | FAIL |
| Validity | ISIN Format | 100.0% | PASS |
| Validity | Price Range | 100.0% | PASS |
| Validity | Yield Range | 100.0% | PASS |
| Validity | Spread Range | 99.9% | PASS |
| Uniqueness | ISIN | 100.0% | PASS |
| Uniqueness | Ticker | 100.0% | PASS |
| Consistency | Sections Valid | 100.0% | PASS |
| Consistency | Tickers Match | 72/75 (96.0%) | WARN |
| Consistency | Bond-Emittent Match | 57/109 (52.3%) | WARN |
