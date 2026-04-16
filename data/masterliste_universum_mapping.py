"""
Mapping: DZ BANK Masterliste Emittenten -> Universum Emittenten-Namen
Stand Masterliste: 12.12.2025 | Stand Universum: universum_neu.xlsx

Alle 85 gecoverten Emittenten der DZ BANK Financials Masterliste.
- Key: Masterliste-Name
- Value: Liste der zugehoerigen Universum-Emittenten-Namen (leer = nicht im Universum)
"""

MASTERLISTE_UNIVERSUM_MAPPING = {
    # === IM UNIVERSUM (72 Emittenten) ===
    "Aareal Bank": ["AAREAL BANK AG"],
    "ABN AMRO Bank": ["ABN AMRO BANK NV"],
    "Achmea Bank": ["ACHMEA BANK NV"],
    "Allianz": ["ALLIANZ SE", "ALLIANZ FINANCE II B.V."],
    "American International Group": ["AMERICAN INTL GROUP"],
    "ANZ Group Holdings": ["AUST & NZ BANKING GROUP", "ANZ NEW ZEALAND INTL/LDN"],
    "Aviva": ["AVIVA PLC"],
    "AXA": ["AXA SA"],
    "Banco Santander": ["BANCO SANTANDER SA"],
    "Bank of America": ["BANK OF AMERICA CORP"],
    "Bank of Ireland Group": ["BANK OF IRELAND GROUP"],
    "Bank of Nova Scotia": ["BANK OF NOVA SCOTIA"],
    "Banque Fed. du Credit Mutuel": ["BANQUE FED CRED MUTUEL"],
    "Barclays PLC": ["BARCLAYS PLC"],
    "BAWAG Group": ["BAWAG GROUP AG", "BAWAG P.S.K."],
    "BBVA": ["BANCO BILBAO VIZCAYA ARG"],
    "BNP Paribas": ["BNP PARIBAS"],
    "BPCE": ["BPCE SA"],
    "CaixaBank": ["CAIXABANK SA"],
    "Canadian Imperial Bank of Commerce": ["CANADIAN IMPERIAL BANK"],
    "Citigroup": ["CITIGROUP INC"],
    "Commerzbank": ["COMMERZBANK AG"],
    "Commonwealth Bk of Australia": ["COMMONWEALTH BANK AUST"],
    "Cooperatieve Rabobank UA": ["COOPERATIEVE RABOBANK UA"],
    "Credit Agricole": ["CREDIT AGRICOLE SA", "CREDIT AGRICOLE LONDON"],
    "Credit Mutuel Arkea SACC": ["CREDIT MUTUEL ARKEA"],
    "Danske Bank": ["DANSKE BANK A/S"],
    "Deutsche Bank": ["DEUTSCHE BANK AG"],
    "Deutsche Pfandbriefbank": ["DEUT PFANDBRIEFBANK AG"],
    "DNB Bank": ["DNB BANK ASA"],
    "Erste Group Bank": ["ERSTE GROUP BANK AG"],
    "Fed. des caisses Desjardins": ["FED CAISSES DESJARDINS"],
    "Generali": ["GENERALI"],
    "Goldman Sachs Group": ["GOLDMAN SACHS GROUP INC"],
    "Hamburg Commercial Bank": ["HAMBURG COMMERCIAL BANK"],
    "Hannover Rueck": ["HANNOVER RE"],
    "HSBC Holdings": ["HSBC HOLDINGS PLC"],
    "ING Groep": ["ING GROEP NV"],
    "Intesa Sanpaolo": ["INTESA SANPAOLO SPA"],
    "Jefferies Financial Group": ["JEFFERIES FIN GROUP INC"],
    "JPMorgan Chase & Co.": ["JPMORGAN CHASE & CO"],
    "Jyske Bank": ["JYSKE BANK A/S"],
    "KBC Groep": ["KBC GROUP NV"],
    "Lloyds Banking Group": ["LLOYDS BANKING GROUP PLC"],
    "Mizuho Financial Group": ["MIZUHO FINANCIAL GROUP"],
    "Morgan Stanley": ["MORGAN STANLEY"],
    "Munich Re": ["MUNICH RE"],
    "National Australia Bank": ["NATIONAL AUSTRALIA BANK"],
    "Nationwide Building Society": ["NATIONWIDE BLDG SOCIETY"],
    "NatWest Group": ["NATWEST GROUP PLC", "NATWEST MARKETS PLC"],
    "NIBC Bank": ["NIBC BANK NV"],
    "Nordea Bank Abp": ["NORDEA BANK ABP"],
    "Nykredit Realkredit": ["NYKREDIT REALKREDIT A/S"],
    "OP Corporate Bank": ["OP CORPORATE BANK PLC"],
    "Raiffeisen Bank International": ["RAIFFEISEN BANK INTL"],
    "RLB Niederoesterreich-Wien": ["RAIFFEISEN LB NIEDEROEST"],
    "Royal Bank of Canada": ["ROYAL BANK OF CANADA"],
    "SEB": ["SKANDINAVISKA ENSKILDA"],
    "Societe Generale": ["SOCIETE GENERALE"],
    "SpareBank 1 Oestlandet": ["SPAREBANK 1 OESTLANDET"],
    "SpareBank 1 SMN": ["SPAREBANK 1 SMN"],
    "SpareBank 1 Soer-Norge ASA": ["SPAREBANK 1 SOR-NORGE"],
    "Standard Chartered": ["STANDARD CHARTERED PLC"],
    "Sumitomo Mitsui Financial Group": ["SUMITOMO MITSUI FINL GRP"],
    "Svenska Handelsbanken": ["SVENSKA HANDELSBANKEN AB"],
    "Swedbank": ["SWEDBANK AB"],
    "Swiss Re": ["SWISS RE FINANCE LUX", "SWISS RE FINANCE UK", "SWISS RE SUB FIN PLC"],
    "UBS Group": ["UBS GROUP AG", "UBS AG LONDON"],
    "Unicredit": ["UNICREDIT SPA"],
    "Wells Fargo": ["WELLS FARGO & COMPANY"],
    "Westpac Banking Corp.": ["WESTPAC BANKING CORP", "WESTPAC SEC NZ/LONDON"],
    "Zurich Insurance Group": ["ZURICH FINANCE IRELAND", "ARGENTUM (ZURICH INS)", "CLOVERIE PLC ZURICH INS"],

    # === NICHT IM UNIVERSUM (13 Emittenten) ===
    "Aegon": [],
    "ASN Bank": [],
    "Bayerische Landesbank": [],
    "Belfius Bank": [],
    "DekaBank": [],
    "HYPO NOE": [],
    "La Banque Postale": [],
    "Landesb. Baden-Wuerttemberg": [],
    "Landesbank Hessen-Thueringen": [],
    "NORD/LB Girozentrale": [],
    "RLB Oberoesterreich": [],
    "SBAB Bank": [],
    "Sparebanken Norge": [],
}


def get_universum_names(masterliste_name: str) -> list[str]:
    """Gibt die Universum-Emittenten-Namen fuer einen Masterliste-Emittenten zurueck."""
    return MASTERLISTE_UNIVERSUM_MAPPING.get(masterliste_name, [])


def is_covered(universum_name: str) -> bool:
    """Prueft ob ein Universum-Emittent von der Masterliste gecovered ist."""
    for names in MASTERLISTE_UNIVERSUM_MAPPING.values():
        if universum_name in names:
            return True
    return False


def get_masterliste_name(universum_name: str) -> str | None:
    """Gibt den Masterliste-Namen fuer einen Universum-Emittenten zurueck."""
    for ml_name, names in MASTERLISTE_UNIVERSUM_MAPPING.items():
        if universum_name in names:
            return ml_name
    return None


def get_all_covered_universum_names() -> set[str]:
    """Gibt alle Universum-Emittenten-Namen zurueck, die gecovered sind."""
    result = set()
    for names in MASTERLISTE_UNIVERSUM_MAPPING.values():
        result.update(names)
    return result


def get_not_in_universum() -> list[str]:
    """Gibt Masterliste-Emittenten zurueck, die nicht im Universum sind."""
    return [k for k, v in MASTERLISTE_UNIVERSUM_MAPPING.items() if not v]


if __name__ == "__main__":
    covered = [k for k, v in MASTERLISTE_UNIVERSUM_MAPPING.items() if v]
    missing = get_not_in_universum()
    all_uni = get_all_covered_universum_names()
    print(f"Masterliste gesamt: {len(MASTERLISTE_UNIVERSUM_MAPPING)}")
    print(f"Im Universum:      {len(covered)} ({len(all_uni)} Universum-Namen)")
    print(f"Nicht im Universum: {len(missing)}")
    print(f"\nFehlend: {', '.join(missing)}")
