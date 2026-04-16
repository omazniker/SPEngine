#!/usr/bin/env python3
"""Data quality check for DZ Bank embedded data constants."""

import re
import json
import sys
from collections import Counter

HTML_FILE = r"C:\Users\omazn\Desktop\claude_code\Beruflich\SPEngine\Projekt\v4-standalone\tests\test_lexicographic.html"
OUTPUT_FILE = r"C:\Users\omazn\Desktop\claude_code\Beruflich\SPEngine\Projekt\v4-standalone\tests\quality_reports\dz_data_quality_check.md"

def fix_json(s):
    """Remove trailing commas that are valid in JS but not JSON."""
    s = re.sub(r',\s*]', ']', s)
    s = re.sub(r',\s*}', '}', s)
    return s

with open(HTML_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# ─── Extract MASTERLISTE_TICKERS ───
m = re.search(r'const MASTERLISTE_TICKERS\s*=\s*\[(.*?)\];', content, re.DOTALL)
tickers_raw = m.group(1)
MASTERLISTE_TICKERS = re.findall(r'"([^"]*)"', tickers_raw)

# ─── Extract DZ_EMITTENTEN_DATA ───
m = re.search(r'const DZ_EMITTENTEN_DATA\s*=\s*\[(.*?)\];', content, re.DOTALL)
emit_raw = m.group(1)
emit_json = emit_raw.strip()
emit_json = re.sub(r'(\w+):', r'"\1":', emit_json)
emit_json = fix_json("[" + emit_json + "]")
DZ_EMITTENTEN_DATA = json.loads(emit_json)

# ─── Extract DZ_SPREAD_SECTIONS ───
m = re.search(r'const DZ_SPREAD_SECTIONS\s*=\s*(\{.*?\});', content)
sections_raw = m.group(1)
sections_json = re.sub(r'(\w+):', r'"\1":', sections_raw)
DZ_SPREAD_SECTIONS = json.loads(fix_json(sections_json))

# ─── Extract DZ_SPREAD_BONDS ───
m = re.search(r'const DZ_SPREAD_BONDS\s*=\s*\[(.*?)\];', content, re.DOTALL)
bonds_raw = m.group(1)
bonds_json = fix_json("[" + bonds_raw.strip() + "]")
DZ_SPREAD_BONDS = json.loads(bonds_json)

# ─── Extract DZ_IBOXX_DATA ───
m = re.search(r'const DZ_IBOXX_DATA\s*=\s*\[(.*?)\];', content, re.DOTALL)
iboxx_raw = m.group(1)
iboxx_json = fix_json("[" + iboxx_raw.strip() + "]")
DZ_IBOXX_DATA = json.loads(iboxx_json)

# ═══════════════════════════════════════════
# ANALYSIS
# ═══════════════════════════════════════════
report = []
report.append("# DZ Data Quality Check Report")
report.append(f"\n**Date:** 2026-03-21")
report.append(f"\n**Source:** test_lexicographic.html (DZ Spread-Report 18.03.2026)")
report.append("")
report.append("---")
report.append("")

# ─── OVERVIEW ───
report.append("## 1. Data Overview")
report.append("")
report.append(f"| Dataset | Expected | Actual |")
report.append(f"|---|---|---|")
report.append(f"| DZ_SPREAD_BONDS | 912 | {len(DZ_SPREAD_BONDS)} |")
report.append(f"| DZ_EMITTENTEN_DATA | 85 | {len(DZ_EMITTENTEN_DATA)} |")
report.append(f"| MASTERLISTE_TICKERS | 75 | {len(MASTERLISTE_TICKERS)} |")
report.append(f"| DZ_IBOXX_DATA | 78 | {len(DZ_IBOXX_DATA)} |")
report.append(f"| DZ_SPREAD_SECTIONS | 10 | {len(DZ_SPREAD_SECTIONS)} |")
report.append("")

# ═══ COMPLETENESS ═══
report.append("## 2. Completeness")
report.append("")

# Bonds: [section, emittent, isin, name, esg, vol, px, yd, zs]
#          0        1        2     3     4    5   6   7   8
null_vol = sum(1 for b in DZ_SPREAD_BONDS if b[5] is None)
null_px = sum(1 for b in DZ_SPREAD_BONDS if b[6] is None)
null_yd = sum(1 for b in DZ_SPREAD_BONDS if b[7] is None)
null_zs = sum(1 for b in DZ_SPREAD_BONDS if b[8] is None)
total_bonds = len(DZ_SPREAD_BONDS)

report.append("### 2.1 Bonds - Missing Values (DZ_SPREAD_BONDS)")
report.append("")
report.append(f"| Field | Null Count | Total | Completeness |")
report.append(f"|---|---|---|---|")
report.append(f"| vol (Volume) | {null_vol} | {total_bonds} | {(total_bonds - null_vol)/total_bonds*100:.1f}% |")
report.append(f"| px (Price) | {null_px} | {total_bonds} | {(total_bonds - null_px)/total_bonds*100:.1f}% |")
report.append(f"| yd (Yield) | {null_yd} | {total_bonds} | {(total_bonds - null_yd)/total_bonds*100:.1f}% |")
report.append(f"| zs (Spread) | {null_zs} | {total_bonds} | {(total_bonds - null_zs)/total_bonds*100:.1f}% |")
report.append("")

# Also check for empty strings in key fields
empty_isin = sum(1 for b in DZ_SPREAD_BONDS if not b[2])
empty_name = sum(1 for b in DZ_SPREAD_BONDS if not b[3])
empty_section = sum(1 for b in DZ_SPREAD_BONDS if not b[0])
empty_emittent = sum(1 for b in DZ_SPREAD_BONDS if not b[1])

report.append("**Key string fields (empty check):**")
report.append("")
report.append(f"| Field | Empty Count | Completeness |")
report.append(f"|---|---|---|")
report.append(f"| section | {empty_section} | {(total_bonds - empty_section)/total_bonds*100:.1f}% |")
report.append(f"| emittent | {empty_emittent} | {(total_bonds - empty_emittent)/total_bonds*100:.1f}% |")
report.append(f"| isin | {empty_isin} | {(total_bonds - empty_isin)/total_bonds*100:.1f}% |")
report.append(f"| name | {empty_name} | {(total_bonds - empty_name)/total_bonds*100:.1f}% |")
report.append("")

# Emittenten: empty tickers
empty_tickers = [e for e in DZ_EMITTENTEN_DATA if e["t"] == ""]
report.append("### 2.2 Emittenten - Empty Tickers")
report.append("")
report.append(f"**Count:** {len(empty_tickers)} of {len(DZ_EMITTENTEN_DATA)} emittents have empty ticker (t=\"\")")
report.append("")
if empty_tickers:
    report.append("| # | Name | Country | DZ Rating | Credit Trend |")
    report.append("|---|---|---|---|---|")
    for i, e in enumerate(empty_tickers, 1):
        report.append(f"| {i} | {e['n']} | {e['co']} | {e['dz']} | {e['ct']} |")
    report.append("")

# Emittenten: all ratings missing
all_ratings_missing = [e for e in DZ_EMITTENTEN_DATA
                       if e["lr"] == "--/--/--" and e["sp"] == "--/--/--" and e["snp"] == "--/--/--"]
report.append("### 2.3 Emittenten - All Ratings Missing (lr, sp, snp all \"--/--/--\")")
report.append("")
report.append(f"**Count:** {len(all_ratings_missing)} of {len(DZ_EMITTENTEN_DATA)}")
report.append("")
if all_ratings_missing:
    report.append("| # | Ticker | Name | Country |")
    report.append("|---|---|---|---|")
    for i, e in enumerate(all_ratings_missing, 1):
        report.append(f"| {i} | {e['t'] or '(empty)'} | {e['n']} | {e['co']} |")
    report.append("")

# ═══ CONSISTENCY ═══
report.append("## 3. Consistency")
report.append("")

# 3.1 MASTERLISTE_TICKERS vs DZ_EMITTENTEN_DATA.t
emit_tickers = set(e["t"] for e in DZ_EMITTENTEN_DATA if e["t"])
master_set = set(MASTERLISTE_TICKERS)
in_master_not_emit = master_set - emit_tickers
in_emit_not_master = emit_tickers - master_set

report.append("### 3.1 MASTERLISTE_TICKERS vs DZ_EMITTENTEN_DATA Tickers")
report.append("")
report.append(f"- MASTERLISTE_TICKERS count: {len(MASTERLISTE_TICKERS)}")
report.append(f"- DZ_EMITTENTEN_DATA tickers (non-empty): {len(emit_tickers)}")
report.append(f"- Overlap: {len(master_set & emit_tickers)}")
report.append(f"- In MASTERLISTE but NOT in EMITTENTEN: **{len(in_master_not_emit)}**")
if in_master_not_emit:
    report.append(f"  - {sorted(in_master_not_emit)}")
report.append(f"- In EMITTENTEN but NOT in MASTERLISTE: **{len(in_emit_not_master)}**")
if in_emit_not_master:
    for t in sorted(in_emit_not_master):
        name = next((e["n"] for e in DZ_EMITTENTEN_DATA if e["t"] == t), "?")
        report.append(f"  - {t} ({name})")
report.append("")

# 3.2 Bond emittent names vs DZ_EMITTENTEN_DATA names
emit_names = set(e["n"] for e in DZ_EMITTENTEN_DATA)
bond_emittent_names = set(b[1] for b in DZ_SPREAD_BONDS)
unmatched_bond_emittents = bond_emittent_names - emit_names

report.append("### 3.2 Bond Emittent Names vs DZ_EMITTENTEN_DATA Names")
report.append("")
report.append(f"- Unique bond emittent names: {len(bond_emittent_names)}")
report.append(f"- Unique emittenten names: {len(emit_names)}")
report.append(f"- Bond emittents NOT found in EMITTENTEN_DATA: **{len(unmatched_bond_emittents)}**")
report.append("")
if unmatched_bond_emittents:
    report.append("| # | Bond Emittent Name (unmatched) | Bond Count |")
    report.append("|---|---|---|")
    counts = Counter(b[1] for b in DZ_SPREAD_BONDS if b[1] in unmatched_bond_emittents)
    for i, (name, cnt) in enumerate(sorted(counts.items()), 1):
        report.append(f"| {i} | {name} | {cnt} |")
    report.append("")

# 3.3 Section codes validity
valid_sections = set(DZ_SPREAD_SECTIONS.keys())
bond_sections = set(b[0] for b in DZ_SPREAD_BONDS)
invalid_sections = bond_sections - valid_sections

report.append("### 3.3 Section Code Validity")
report.append("")
report.append(f"- Valid section codes: {sorted(valid_sections)}")
report.append(f"- Section codes used in bonds: {sorted(bond_sections)}")
report.append(f"- Invalid section codes: **{len(invalid_sections)}**")
if invalid_sections:
    report.append(f"  - {sorted(invalid_sections)}")
report.append("")

# Section distribution
report.append("**Section distribution:**")
report.append("")
section_counts = Counter(b[0] for b in DZ_SPREAD_BONDS)
report.append("| Section | Full Name | Count | % |")
report.append("|---|---|---|---|")
for sec in sorted(section_counts.keys()):
    cnt = section_counts[sec]
    full = DZ_SPREAD_SECTIONS.get(sec, "(unknown)")
    report.append(f"| {sec} | {full} | {cnt} | {cnt/total_bonds*100:.1f}% |")
report.append("")

# ═══ VALIDITY ═══
report.append("## 4. Validity")
report.append("")

# 4.1 ISIN format
isin_pattern = re.compile(r'^[A-Z]{2}[A-Z0-9]{10}$')
invalid_isins = []
for b in DZ_SPREAD_BONDS:
    isin = b[2]
    if not isin_pattern.match(isin):
        invalid_isins.append((isin, b[3], b[0]))

report.append("### 4.1 ISIN Format Validation")
report.append("")
report.append(f"- Pattern: 2 uppercase letters + 10 alphanumeric characters (total 12)")
report.append(f"- Valid ISINs: {total_bonds - len(invalid_isins)} of {total_bonds}")
report.append(f"- Invalid ISINs: **{len(invalid_isins)}**")
report.append("")
if invalid_isins:
    report.append("| # | ISIN | Bond Name | Section |")
    report.append("|---|---|---|---|")
    for i, (isin, name, sec) in enumerate(invalid_isins[:30], 1):
        report.append(f"| {i} | `{isin}` | {name} | {sec} |")
    if len(invalid_isins) > 30:
        report.append(f"| ... | ({len(invalid_isins)-30} more) | | |")
    report.append("")

# ISIN country code distribution
isin_countries = Counter(b[2][:2] for b in DZ_SPREAD_BONDS if len(b[2]) >= 2)
report.append("**ISIN Country Code Distribution (top 15):**")
report.append("")
report.append("| Country Code | Count | % |")
report.append("|---|---|---|")
for cc, cnt in isin_countries.most_common(15):
    report.append(f"| {cc} | {cnt} | {cnt/total_bonds*100:.1f}% |")
report.append("")

# 4.2 Price range
prices = [(b[6], b[2], b[3]) for b in DZ_SPREAD_BONDS if b[6] is not None]
px_values = [p[0] for p in prices]
px_below_50 = [(p, isin, nm) for p, isin, nm in prices if p < 50]
px_above_200 = [(p, isin, nm) for p, isin, nm in prices if p > 200]
px_outside_range = px_below_50 + px_above_200

report.append("### 4.2 Price Range Validation (expected: 50-200)")
report.append("")
if px_values:
    report.append(f"- Non-null prices: {len(px_values)} of {total_bonds}")
    report.append(f"- Min: {min(px_values):.2f}")
    report.append(f"- Max: {max(px_values):.2f}")
    report.append(f"- Mean: {sum(px_values)/len(px_values):.2f}")
    # Percentiles
    sorted_px = sorted(px_values)
    p25 = sorted_px[len(sorted_px)//4]
    p50 = sorted_px[len(sorted_px)//2]
    p75 = sorted_px[3*len(sorted_px)//4]
    report.append(f"- Percentiles: P25={p25:.2f}, P50={p50:.2f}, P75={p75:.2f}")
    report.append(f"- Prices below 50: **{len(px_below_50)}**")
    report.append(f"- Prices above 200: **{len(px_above_200)}**")
    report.append("")
    if px_outside_range:
        report.append("**Out-of-range prices:**")
        report.append("")
        report.append("| Price | ISIN | Name |")
        report.append("|---|---|---|")
        for p, isin, nm in sorted(px_outside_range):
            report.append(f"| {p:.2f} | {isin} | {nm} |")
        report.append("")

# 4.3 Yield range
yields = [(b[7], b[2], b[3]) for b in DZ_SPREAD_BONDS if b[7] is not None]
yd_values = [y[0] for y in yields]
yd_below_0 = [(y, isin, nm) for y, isin, nm in yields if y < 0]
yd_above_20 = [(y, isin, nm) for y, isin, nm in yields if y > 20]
yd_outside_range = yd_below_0 + yd_above_20

report.append("### 4.3 Yield Range Validation (expected: 0-20%)")
report.append("")
if yd_values:
    report.append(f"- Non-null yields: {len(yd_values)} of {total_bonds}")
    report.append(f"- Min: {min(yd_values):.2f}%")
    report.append(f"- Max: {max(yd_values):.2f}%")
    report.append(f"- Mean: {sum(yd_values)/len(yd_values):.2f}%")
    sorted_yd = sorted(yd_values)
    report.append(f"- Percentiles: P25={sorted_yd[len(sorted_yd)//4]:.2f}%, P50={sorted_yd[len(sorted_yd)//2]:.2f}%, P75={sorted_yd[3*len(sorted_yd)//4]:.2f}%")
    report.append(f"- Yields below 0%: **{len(yd_below_0)}**")
    report.append(f"- Yields above 20%: **{len(yd_above_20)}**")
    report.append("")
    if yd_outside_range:
        report.append("**Out-of-range yields:**")
        report.append("")
        report.append("| Yield | ISIN | Name |")
        report.append("|---|---|---|")
        for y, isin, nm in sorted(yd_outside_range):
            report.append(f"| {y:.2f}% | {isin} | {nm} |")
        report.append("")

# 4.4 Spread range
spreads = [(b[8], b[2], b[3], b[0]) for b in DZ_SPREAD_BONDS if b[8] is not None]
zs_values = [s[0] for s in spreads]
zs_below_neg50 = [(s, isin, nm, sec) for s, isin, nm, sec in spreads if s < -50]
zs_above_1500 = [(s, isin, nm, sec) for s, isin, nm, sec in spreads if s > 1500]
zs_outside_range = zs_below_neg50 + zs_above_1500

report.append("### 4.4 Spread Range Validation (expected: -50 to 1500 bp)")
report.append("")
if zs_values:
    report.append(f"- Non-null spreads: {len(zs_values)} of {total_bonds}")
    report.append(f"- Min: {min(zs_values):.1f} bp")
    report.append(f"- Max: {max(zs_values):.1f} bp")
    report.append(f"- Mean: {sum(zs_values)/len(zs_values):.1f} bp")
    sorted_zs = sorted(zs_values)
    report.append(f"- Percentiles: P25={sorted_zs[len(sorted_zs)//4]:.1f}, P50={sorted_zs[len(sorted_zs)//2]:.1f}, P75={sorted_zs[3*len(sorted_zs)//4]:.1f} bp")
    report.append(f"- Spreads below -50 bp: **{len(zs_below_neg50)}**")
    report.append(f"- Spreads above 1500 bp: **{len(zs_above_1500)}**")
    report.append("")
    if zs_outside_range:
        report.append("**Out-of-range spreads:**")
        report.append("")
        report.append("| Spread (bp) | ISIN | Name | Section |")
        report.append("|---|---|---|---|")
        for s, isin, nm, sec in sorted(zs_outside_range):
            report.append(f"| {s:.1f} | {isin} | {nm} | {sec} |")
        report.append("")

# ═══ UNIQUENESS ═══
report.append("## 5. Uniqueness")
report.append("")

# 5.1 Duplicate ISINs
isin_counts = Counter(b[2] for b in DZ_SPREAD_BONDS)
dup_isins = {isin: cnt for isin, cnt in isin_counts.items() if cnt > 1}

report.append("### 5.1 Duplicate ISINs in DZ_SPREAD_BONDS")
report.append("")
report.append(f"- Total bonds: {total_bonds}")
report.append(f"- Unique ISINs: {len(isin_counts)}")
report.append(f"- Duplicate ISINs: **{len(dup_isins)}**")
report.append("")
if dup_isins:
    report.append("| # | ISIN | Count | Sections | Bond Names |")
    report.append("|---|---|---|---|---|")
    for i, (isin, cnt) in enumerate(sorted(dup_isins.items(), key=lambda x: -x[1]), 1):
        entries = [(b[3], b[0]) for b in DZ_SPREAD_BONDS if b[2] == isin]
        names = "; ".join(e[0] for e in entries)
        secs = "; ".join(e[1] for e in entries)
        report.append(f"| {i} | {isin} | {cnt} | {secs} | {names} |")
    report.append("")

# 5.2 Duplicate tickers in emittenten
ticker_counts = Counter(e["t"] for e in DZ_EMITTENTEN_DATA if e["t"])
dup_tickers = {t: cnt for t, cnt in ticker_counts.items() if cnt > 1}

report.append("### 5.2 Duplicate Tickers in DZ_EMITTENTEN_DATA")
report.append("")
report.append(f"- Total emittents: {len(DZ_EMITTENTEN_DATA)}")
report.append(f"- Unique tickers (non-empty): {len(ticker_counts)}")
report.append(f"- Duplicate tickers: **{len(dup_tickers)}**")
report.append("")
if dup_tickers:
    report.append("| Ticker | Count | Names |")
    report.append("|---|---|---|")
    for t, cnt in sorted(dup_tickers.items()):
        names = [e["n"] for e in DZ_EMITTENTEN_DATA if e["t"] == t]
        report.append(f"| {t} | {cnt} | {'; '.join(names)} |")
    report.append("")

# ═══ ADDITIONAL CHECKS ═══
report.append("## 6. Additional Checks")
report.append("")

# 6.1 iBoxx data validation
report.append("### 6.1 DZ_IBOXX_DATA Validation")
report.append("")
report.append(f"- Total entries: {len(DZ_IBOXX_DATA)}")
iboxx_null_current = sum(1 for r in DZ_IBOXX_DATA if r[1] is None)
iboxx_negative_current = sum(1 for r in DZ_IBOXX_DATA if r[1] is not None and r[1] < 0)
iboxx_null_any = sum(1 for r in DZ_IBOXX_DATA if any(v is None for v in r[1:]))
report.append(f"- Null current values: {iboxx_null_current}")
report.append(f"- Negative current values: {iboxx_negative_current}")
report.append(f"- Entries with any null numeric field: {iboxx_null_any}")
report.append("")

# 6.2 ESG field analysis
esg_values = Counter(b[4] for b in DZ_SPREAD_BONDS)
report.append("### 6.2 ESG Label Distribution (Bonds)")
report.append("")
report.append("| ESG Label | Count | % |")
report.append("|---|---|---|")
for val, cnt in esg_values.most_common():
    label = f'"{val}"' if val else '(empty string)'
    report.append(f"| {label} | {cnt} | {cnt/total_bonds*100:.1f}% |")
report.append("")

# 6.3 Emittenten DZ rating distribution
dz_ratings = Counter(e["dz"] for e in DZ_EMITTENTEN_DATA)
report.append("### 6.3 Emittenten DZ Rating Distribution")
report.append("")
report.append("| DZ Rating | Count | % |")
report.append("|---|---|---|")
for val, cnt in dz_ratings.most_common():
    report.append(f"| {val} | {cnt} | {cnt/len(DZ_EMITTENTEN_DATA)*100:.1f}% |")
report.append("")

# 6.4 Emittenten Country Distribution
emit_countries = Counter(e["co"] for e in DZ_EMITTENTEN_DATA)
report.append("### 6.4 Emittenten Country Distribution")
report.append("")
report.append("| Country | Count |")
report.append("|---|---|")
for co, cnt in emit_countries.most_common():
    report.append(f"| {co} | {cnt} |")
report.append("")

# ═══ SUMMARY SCORECARD ═══
report.append("## 7. Quality Scorecard Summary")
report.append("")

completeness_px = (total_bonds - null_px) / total_bonds * 100
completeness_yd = (total_bonds - null_yd) / total_bonds * 100
completeness_zs = (total_bonds - null_zs) / total_bonds * 100
completeness_vol = (total_bonds - null_vol) / total_bonds * 100

validity_isin = (total_bonds - len(invalid_isins)) / total_bonds * 100
validity_px = (len(px_values) - len(px_outside_range)) / max(len(px_values), 1) * 100
validity_yd = (len(yd_values) - len(yd_outside_range)) / max(len(yd_values), 1) * 100
validity_zs = (len(zs_values) - len(zs_outside_range)) / max(len(zs_values), 1) * 100

uniqueness_isin = (total_bonds - sum(c-1 for c in dup_isins.values())) / total_bonds * 100
uniqueness_ticker = (len(DZ_EMITTENTEN_DATA) - sum(c-1 for c in dup_tickers.values())) / len(DZ_EMITTENTEN_DATA) * 100

def grade(pct):
    if pct >= 99: return "PASS"
    if pct >= 95: return "WARN"
    return "FAIL"

report.append("| Dimension | Metric | Score | Status |")
report.append("|---|---|---|---|")
report.append(f"| Completeness | Price (px) | {completeness_px:.1f}% | {grade(completeness_px)} |")
report.append(f"| Completeness | Yield (yd) | {completeness_yd:.1f}% | {grade(completeness_yd)} |")
report.append(f"| Completeness | Spread (zs) | {completeness_zs:.1f}% | {grade(completeness_zs)} |")
report.append(f"| Completeness | Volume (vol) | {completeness_vol:.1f}% | {grade(completeness_vol)} |")
report.append(f"| Validity | ISIN Format | {validity_isin:.1f}% | {grade(validity_isin)} |")
report.append(f"| Validity | Price Range | {validity_px:.1f}% | {grade(validity_px)} |")
report.append(f"| Validity | Yield Range | {validity_yd:.1f}% | {grade(validity_yd)} |")
report.append(f"| Validity | Spread Range | {validity_zs:.1f}% | {grade(validity_zs)} |")
report.append(f"| Uniqueness | ISIN | {uniqueness_isin:.1f}% | {grade(uniqueness_isin)} |")
report.append(f"| Uniqueness | Ticker | {uniqueness_ticker:.1f}% | {grade(uniqueness_ticker)} |")
report.append(f"| Consistency | Sections Valid | {'100.0%' if not invalid_sections else 'FAIL'} | {'PASS' if not invalid_sections else 'FAIL'} |")
report.append(f"| Consistency | Tickers Match | {len(master_set & emit_tickers)}/{len(master_set)} ({len(master_set & emit_tickers)/len(master_set)*100:.1f}%) | {'PASS' if not in_master_not_emit else 'WARN'} |")
report.append(f"| Consistency | Bond-Emittent Match | {len(bond_emittent_names) - len(unmatched_bond_emittents)}/{len(bond_emittent_names)} ({(len(bond_emittent_names) - len(unmatched_bond_emittents))/len(bond_emittent_names)*100:.1f}%) | {'PASS' if not unmatched_bond_emittents else 'WARN'} |")
report.append("")

# Write report
output = "\n".join(report)
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write(output)

print(output)
print(f"\n\nReport written to: {OUTPUT_FILE}")
