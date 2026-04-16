const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat
} = require("docx");

// ── Colors ──
const DARK_BLUE = "1B3A5C";
const MID_BLUE = "2E75B6";
const LIGHT_BLUE = "D5E8F0";
const ACCENT_GREEN = "2E8B57";
const LIGHT_GREEN = "E2F0E8";
const LIGHT_GRAY = "F2F2F2";
const WHITE = "FFFFFF";
const BLACK = "000000";

// ── Helpers ──
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: DARK_BLUE, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: WHITE, font: "Arial", size: 18 })] })]
  });
}

function dataCell(text, width, opts = {}) {
  const { bold, color, fill, align } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: align || AlignmentType.CENTER,
      children: [new TextRun({ text: String(text), bold: bold || false, color: color || BLACK, font: "Arial", size: 18 })]
    })]
  });
}

function labelCell(text, width, opts = {}) {
  return dataCell(text, width, { ...opts, align: AlignmentType.LEFT, bold: true });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 32, color: DARK_BLUE })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 26, color: MID_BLUE })]
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 22, color: DARK_BLUE })]
  });
}

function para(runs, opts = {}) {
  const { spacing, alignment } = opts;
  return new Paragraph({
    spacing: spacing || { after: 120 },
    alignment: alignment || AlignmentType.JUSTIFIED,
    children: Array.isArray(runs) ? runs : [new TextRun({ text: runs, font: "Arial", size: 20 })]
  });
}

function bold(text) { return new TextRun({ text, bold: true, font: "Arial", size: 20 }); }
function normal(text) { return new TextRun({ text, font: "Arial", size: 20 }); }
function colored(text, color) { return new TextRun({ text, font: "Arial", size: 20, color }); }
function boldColored(text, color) { return new TextRun({ text, bold: true, font: "Arial", size: 20, color }); }
function italic(text) { return new TextRun({ text, italics: true, font: "Arial", size: 20 }); }

function emptyPara() { return new Paragraph({ spacing: { after: 80 }, children: [] }); }
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

function bulletItem(text, ref) {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 60 },
    children: Array.isArray(text) ? text : [new TextRun({ text, font: "Arial", size: 20 })]
  });
}

// ── Page dimensions (A4) ──
const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = 1440;
const CONTENT_W = PAGE_W - 2 * MARGIN; // 9026

// ── Build Document ──
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: DARK_BLUE },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: MID_BLUE },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: DARK_BLUE },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets2", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2013", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [
    // ══════ TITLE PAGE ══════
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [
        emptyPara(), emptyPara(), emptyPara(), emptyPara(), emptyPara(),
        emptyPara(), emptyPara(), emptyPara(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "Anleiheportfolio-Optimierung", font: "Arial", size: 48, bold: true, color: DARK_BLUE })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: "Finanzsektor Senior Preferred / Senior Unsecured", font: "Arial", size: 28, color: MID_BLUE })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: MID_BLUE, space: 1 } },
          children: [new TextRun({ text: " ", font: "Arial", size: 20 })]
        }),
        emptyPara(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "Bericht zur Portfoliokonstruktion und Empfehlung", font: "Arial", size: 24, color: DARK_BLUE })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "Budget: 200 Mio. EUR  |  MIP-Optimierung (HiGHS-Solver)", font: "Arial", size: 20, color: "666666" })]
        }),
        emptyPara(), emptyPara(), emptyPara(), emptyPara(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Stand: M\u00E4rz 2026", font: "Arial", size: 22, color: "666666" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Vertraulich \u2013 Nur f\u00FCr den internen Gebrauch", font: "Arial", size: 20, italics: true, color: "999999" })]
        }),
      ]
    },

    // ══════ MAIN CONTENT ══════
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: MID_BLUE, space: 1 } },
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "Anleiheportfolio-Optimierung", font: "Arial", size: 16, color: MID_BLUE, italics: true }),
              new TextRun({ text: "  |  Vorstandsbericht", font: "Arial", size: 16, color: "999999", italics: true })
            ]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC", space: 1 } },
            children: [
              new TextRun({ text: "Seite ", font: "Arial", size: 16, color: "999999" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "999999" })
            ]
          })]
        })
      },
      children: [
        // ═══ EXECUTIVE SUMMARY ═══
        heading1("Executive Summary"),
        para([
          normal("Das vorliegende Gutachten analysiert die optimale Konstruktion eines "),
          bold("200 Mio. EUR Anleiheportfolios"),
          normal(" im Finanzsektor (Banken, Versicherungen, Finanzdienstleister). Aus einem Universum von "),
          bold("1.643 Anleihen"),
          normal(" (357 Emittenten) wurden mittels Mixed-Integer-Programmierung (MIP) mit dem HiGHS-Solver systematisch Grenz- und Optimalportfolien konstruiert.")
        ]),
        para([
          bold("Empfehlung: "),
          normal("Das Portfolio "),
          boldColored("SP+SU Max Rendite (tight)", ACCENT_GREEN),
          normal(" erzielt eine Rendite von "),
          boldColored("3,508%", ACCENT_GREEN),
          normal(" bei einer Duration von 4,00 und einem Durchschnittspreis von 99,70. Es vereint die h\u00F6chste Rendite im zul\u00E4ssigen Rahmen mit einer robusten Diversifikation \u00FCber 22 Positionen und 22 Emittenten.")
        ]),
        para([
          normal("Die Hinzunahme von "),
          bold("Senior Non-Preferred (SNP)"),
          normal(" w\u00FCrde lediglich "),
          boldColored("+3,2 Basispunkte", "CC0000"),
          normal(" Mehrrendite bringen (3,54% vs. 3,508%), was das zus\u00E4tzliche Risiko nicht rechtfertigt. SNP ist daher "),
          bold("nicht zul\u00E4ssig"),
          normal(" und wurde ausschlie\u00DFlich zu Simulationszwecken betrachtet.")
        ]),

        pageBreak(),

        // ═══ 1. UNIVERSUM ═══
        heading1("1. Anlageuniversum"),

        heading2("1.1 Gesamtuniversum"),
        para([
          normal("Das Ausgangsuniversum umfasst "),
          bold("1.643 Anleihen"),
          normal(" von "),
          bold("357 Emittenten"),
          normal(" mit einem Gesamtvolumen von ca. "),
          bold("1.264 Mrd. EUR"),
          normal(". Die Anleihen decken alle Rangklassen (SP, SU, SNP, SEC, T2, AT1), Sektoren und Ratingkategorien ab.")
        ]),

        // Universum-Tabelle
        heading3("Marktkennzahlen des Gesamtuniversums"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [4500, 4006],
          rows: [
            new TableRow({ children: [headerCell("Kennzahl", 4500), headerCell("Wert", 4006)] }),
            new TableRow({ children: [labelCell("Anleihen", 4500), dataCell("1.643", 4006)] }),
            new TableRow({ children: [labelCell("Emittenten", 4500), dataCell("357", 4006)] }),
            new TableRow({ children: [labelCell("Volumen", 4500), dataCell("ca. 1.264 Mrd. EUR", 4006)] }),
            new TableRow({ children: [labelCell("Rendite \u00D8", 4500), dataCell("3,50%", 4006)] }),
            new TableRow({ children: [labelCell("Spread \u00D8", 4500), dataCell("80,4 bp", 4006)] }),
            new TableRow({ children: [labelCell("Mod. Duration \u00D8", 4500), dataCell("3,92", 4006)] }),
            new TableRow({ children: [labelCell("Laufzeit \u00D8", 4500), dataCell("6,02 Jahre", 4006)] }),
            new TableRow({ children: [labelCell("Rating \u00D8", 4500), dataCell("A\u2013", 4006)] }),
            new TableRow({ children: [labelCell("ESG-Quote", 4500), dataCell("19,4%", 4006)] }),
            new TableRow({ children: [labelCell("Risikogewicht \u00D8", 4500), dataCell("50,0%", 4006)] }),
          ]
        }),
        emptyPara(),
        para([
          normal("Das Universum weist eine durchschnittliche Rendite von 3,50% auf. Die ESG-Abdeckung liegt bei 19,4%. Das durchschnittliche Risikogewicht betr\u00E4gt einheitlich 50% (Finanzsektor-Standard).")
        ]),

        heading2("1.2 Sektorverteilung"),
        para([
          normal("Der Finanzsektor dominiert das Universum: "),
          bold("Banken 73,3%"),
          normal(", "),
          bold("Versicherungen 10,4%"),
          normal(", "),
          bold("Finanzdienstleister 3,3%"),
          normal(". REITs und Sonstige machen die restlichen ca. 13% aus und sind f\u00FCr die Portfoliokonstruktion "),
          bold("ausgeschlossen"),
          normal(".")
        ]),

        heading2("1.3 Rangklassen-Hierarchie"),
        para("Die Bail-in-Hierarchie bestimmt die Verlustabsorptionsreihenfolge im Abwicklungsfall:"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2000, 3500, 3006],
          rows: [
            new TableRow({ children: [headerCell("Rang", 2000), headerCell("Bezeichnung", 3500), headerCell("Status", 3006)] }),
            new TableRow({ children: [
              dataCell("SP", 2000, { bold: true }),
              dataCell("Senior Preferred", 3500, { align: AlignmentType.LEFT }),
              dataCell("Zugelassen", 3006, { color: ACCENT_GREEN, bold: true })
            ]}),
            new TableRow({ children: [
              dataCell("SU", 2000, { bold: true }),
              dataCell("Senior Unsecured", 3500, { align: AlignmentType.LEFT }),
              dataCell("Zugelassen", 3006, { color: ACCENT_GREEN, bold: true })
            ]}),
            new TableRow({ children: [
              dataCell("SNP", 2000, { bold: true }),
              dataCell("Senior Non-Preferred", 3500, { align: AlignmentType.LEFT }),
              dataCell("Nur Simulation", 3006, { color: "CC0000", bold: true })
            ]}),
            new TableRow({ children: [
              dataCell("SEC / T2 / AT1", 2000, { bold: true }),
              dataCell("Secured / Tier 2 / Add. Tier 1", 3500, { align: AlignmentType.LEFT }),
              dataCell("Ausgeschlossen", 3006, { color: "CC0000" })
            ]}),
          ]
        }),

        pageBreak(),

        // ═══ 2. ZULÄSSIGES UNIVERSUM ═══
        heading1("2. Zul\u00E4ssiges Universum"),
        para("Das zul\u00E4ssige Universum ergibt sich durch Anwendung der regulatorischen und selbstgew\u00E4hlten Restriktionen auf das Gesamtuniversum."),

        heading2("2.1 Regulatorische Constraints (hart)"),
        para("Diese Vorgaben sind nicht verhandelbar und m\u00FCssen zwingend eingehalten werden:"),

        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [3200, 5306],
          rows: [
            new TableRow({ children: [headerCell("Constraint", 3200), headerCell("Ausprägung", 5306)] }),
            new TableRow({ children: [labelCell("Rang", 3200), dataCell("SP und/oder SU", 5306, { align: AlignmentType.LEFT })] }),
            new TableRow({ children: [labelCell("Kupon (SP)", 3200), dataCell("Nur FIX (hart bei reinem SP-Portfolio)", 5306, { align: AlignmentType.LEFT })] }),
            new TableRow({ children: [labelCell("Kupon (SP+SU)", 3200), dataCell("Mix zulässig (SP und SU ergänzen sich)", 5306, { align: AlignmentType.LEFT })] }),
            new TableRow({ children: [labelCell("Max. je Emittent", 3200), dataCell("10 Mio. EUR", 5306, { align: AlignmentType.LEFT })] }),
            new TableRow({ children: [labelCell("Min. Rating", 3200), dataCell("BBB+ (Lower of Two)", 5306, { align: AlignmentType.LEFT })] }),
            new TableRow({ children: [labelCell("Max. Laufzeit", 3200), dataCell("10 Jahre", 5306, { align: AlignmentType.LEFT })] }),
            new TableRow({ children: [labelCell("Sektor", 3200), dataCell("Nur Finanzsektor (Banken, Versicherungen, Finanzdienstleister)", 5306, { align: AlignmentType.LEFT })] }),
            new TableRow({ children: [labelCell("Struktur", 3200), dataCell("Callable und Perpetual ausgeschlossen", 5306, { align: AlignmentType.LEFT })] }),
            new TableRow({ children: [labelCell("Budget", 3200), dataCell("200 Mio. EUR (vorgegeben)", 5306, { align: AlignmentType.LEFT })] }),
          ]
        }),

        emptyPara(),

        heading2("2.2 Selbstgew\u00E4hlte Constraints"),
        para("Zus\u00E4tzlich zu den regulatorischen Vorgaben wurden folgende Portfoliorestriktionen definiert, um eine ausgewogene Risikosteuerung zu gew\u00E4hrleisten:"),

        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [3200, 2500, 2806],
          rows: [
            new TableRow({ children: [headerCell("Constraint", 3200), headerCell("Limit", 2500), headerCell("Zweck", 2806)] }),
            new TableRow({ children: [
              labelCell("Duration PF \u00D8", 3200),
              dataCell("\u2264 4,0", 2500),
              dataCell("Zinsrisikobegrenzung", 2806, { align: AlignmentType.LEFT })
            ]}),
            new TableRow({ children: [
              labelCell("Preis PF \u00D8", 3200),
              dataCell("\u2264 101", 2500),
              dataCell("Kursrisikobegrenzung", 2806, { align: AlignmentType.LEFT })
            ]}),
            new TableRow({ children: [
              labelCell("Max. je Land", 3200),
              dataCell("\u2264 20%", 2500),
              dataCell("Länderdiversifikation", 2806, { align: AlignmentType.LEFT })
            ]}),
            new TableRow({ children: [
              labelCell("Max. BBB+", 3200),
              dataCell("\u2264 20%", 2500),
              dataCell("Rating-Qualitätssicherung", 2806, { align: AlignmentType.LEFT })
            ]}),
          ]
        }),

        emptyPara(),
        para([
          normal("Die Kombination der harten und selbstgew\u00E4hlten Constraints reduziert das investierbare Universum erheblich. Im Folgenden wird zwischen "),
          bold("\u201EBasis\u201C-Szenarien"),
          normal(" (ohne selbstgew\u00E4hlte Constraints) und "),
          bold("\u201ETight\u201C-Szenarien"),
          normal(" (mit allen Constraints) unterschieden, um den Einfluss der Restriktionen auf die erreichbare Rendite transparent zu machen.")
        ]),

        pageBreak(),

        // ═══ 3. GRENZPORTFOLIEN ═══
        heading1("3. Grenzportfolien im zul\u00E4ssigen Universum"),
        para([
          normal("Zur Identifikation der optimalen Portfoliostruktur wurden "),
          bold("9 Szenarien"),
          normal(" konstruiert, die sich entlang dreier Dimensionen unterscheiden:")
        ]),

        bulletItem([bold("Rangklassen: "), normal("SP \u2502 SP+SU \u2502 SP+SU+SNP (nur Simulation)")], "bullets"),
        bulletItem([bold("Optimierungsziel: "), normal("Max Rendite \u2502 Max ESG \u2192 Max Rendite (lexikographisch)")], "bullets"),
        bulletItem([bold("Constraint-Regime: "), normal("Basis (nur harte Constraints) \u2502 Tight (alle Constraints)")], "bullets"),

        heading2("3.1 Szenario\u00FCbersicht"),

        // Scenario overview table
        (() => {
          const cw = [600, 2600, 1300, 1300, 1100, 1100, 526];
          const tw = cw.reduce((a,b) => a+b, 0);
          return new Table({
            width: { size: tw, type: WidthType.DXA },
            columnWidths: cw,
            rows: [
              new TableRow({ children: [
                headerCell("Nr.", cw[0]), headerCell("Szenario", cw[1]), headerCell("Rang", cw[2]),
                headerCell("Ziel", cw[3]), headerCell("Regime", cw[4]), headerCell("Rdt%", cw[5]), headerCell("Dur", cw[6])
              ]}),
              // S1
              new TableRow({ children: [
                dataCell("S1", cw[0], { bold: true }), dataCell("SP Basis MaxRdt", cw[1], { align: AlignmentType.LEFT }),
                dataCell("SP", cw[2]), dataCell("Max Rdt", cw[3]), dataCell("Basis", cw[4]),
                dataCell("3,67", cw[5], { bold: true }), dataCell("6,27", cw[6])
              ]}),
              // S2
              new TableRow({ children: [
                dataCell("S2", cw[0], { bold: true }), dataCell("SP Basis MaxESG", cw[1], { align: AlignmentType.LEFT }),
                dataCell("SP", cw[2]), dataCell("Max ESG", cw[3]), dataCell("Basis", cw[4]),
                dataCell("3,28", cw[5]), dataCell("4,15", cw[6])
              ]}),
              // S3
              new TableRow({ children: [
                dataCell("S3", cw[0], { bold: true }), dataCell("SP Tight MaxESG", cw[1], { align: AlignmentType.LEFT }),
                dataCell("SP", cw[2]), dataCell("Max ESG", cw[3]), dataCell("Tight", cw[4]),
                dataCell("3,28", cw[5]), dataCell("3,99", cw[6])
              ]}),
              // S8
              new TableRow({ children: [
                dataCell("S8", cw[0], { bold: true, fill: LIGHT_BLUE }), dataCell("SP Tight MaxRdt", cw[1], { align: AlignmentType.LEFT, fill: LIGHT_BLUE }),
                dataCell("SP", cw[2], { fill: LIGHT_BLUE }), dataCell("Max Rdt", cw[3], { fill: LIGHT_BLUE }),
                dataCell("Tight", cw[4], { fill: LIGHT_BLUE }), dataCell("3,39", cw[5], { bold: true, fill: LIGHT_BLUE }),
                dataCell("4,00", cw[6], { fill: LIGHT_BLUE })
              ]}),
              // S4
              new TableRow({ children: [
                dataCell("S4", cw[0], { bold: true }), dataCell("SP+SU Basis MaxRdt", cw[1], { align: AlignmentType.LEFT }),
                dataCell("SP+SU", cw[2]), dataCell("Max Rdt", cw[3]), dataCell("Basis", cw[4]),
                dataCell("3,80", cw[5], { bold: true }), dataCell("6,36", cw[6])
              ]}),
              // S5
              new TableRow({ children: [
                dataCell("S5", cw[0], { bold: true }), dataCell("SP+SU Tight MaxESG", cw[1], { align: AlignmentType.LEFT }),
                dataCell("SP+SU", cw[2]), dataCell("Max ESG", cw[3]), dataCell("Tight", cw[4]),
                dataCell("3,33", cw[5]), dataCell("4,00", cw[6])
              ]}),
              // SP+SU MaxRdt Tight (EMPFEHLUNG)
              new TableRow({ children: [
                dataCell("\u2605", cw[0], { bold: true, fill: LIGHT_GREEN, color: ACCENT_GREEN }),
                dataCell("SP+SU Tight MaxRdt", cw[1], { align: AlignmentType.LEFT, fill: LIGHT_GREEN, bold: true }),
                dataCell("SP+SU", cw[2], { fill: LIGHT_GREEN }), dataCell("Max Rdt", cw[3], { fill: LIGHT_GREEN }),
                dataCell("Tight", cw[4], { fill: LIGHT_GREEN }),
                dataCell("3,508", cw[5], { bold: true, fill: LIGHT_GREEN, color: ACCENT_GREEN }),
                dataCell("4,00", cw[6], { fill: LIGHT_GREEN })
              ]}),
              // S6
              new TableRow({ children: [
                dataCell("S6", cw[0], { bold: true }), dataCell("SP+SU+SNP Tight MaxRdt", cw[1], { align: AlignmentType.LEFT }),
                dataCell("+SNP", cw[2]), dataCell("Max Rdt", cw[3]), dataCell("Tight", cw[4]),
                dataCell("3,54", cw[5], { bold: true }), dataCell("4,00", cw[6])
              ]}),
              // S7
              new TableRow({ children: [
                dataCell("S7", cw[0], { bold: true }), dataCell("SP+SU+SNP Tight MaxESG", cw[1], { align: AlignmentType.LEFT }),
                dataCell("+SNP", cw[2]), dataCell("Max ESG", cw[3]), dataCell("Tight", cw[4]),
                dataCell("3,40", cw[5]), dataCell("4,00", cw[6])
              ]}),
            ]
          });
        })(),

        emptyPara(),
        para([italic("\u2605 = Empfohlenes Portfolio (gr\u00FCn hervorgehoben)")], { alignment: AlignmentType.LEFT }),

        heading2("3.2 Analyse der Ergebnisse"),

        heading3("Effekt der Rangklassen-Erweiterung"),
        para([
          normal("Die Erweiterung von "),
          bold("SP auf SP+SU"),
          normal(" bringt im Tight-Regime einen Renditezuwachs von "),
          boldColored("+11,8 Basispunkten", ACCENT_GREEN),
          normal(" (3,39% \u2192 3,508%). Dies ist ein signifikanter Zugewinn, da SU-Anleihen systematisch h\u00F6here Spreads bieten, ohne die regulatorische Zul\u00E4ssigkeit zu verletzen.")
        ]),
        para([
          normal("Die weitere Erweiterung um "),
          bold("SNP"),
          normal(" bringt nur noch "),
          boldColored("+3,2 Basispunkte", "CC0000"),
          normal(" (3,508% \u2192 3,54%). Der marginale Renditezuwachs steht in keinem Verh\u00E4ltnis zum erh\u00F6hten Bail-in-Risiko.")
        ]),

        heading3("Effekt der Constraint-Versch\u00E4rfung (Basis \u2192 Tight)"),
        para([
          normal("Die selbstgew\u00E4hlten Constraints (Duration \u2264 4, Preis \u2264 101, Land \u2264 20%, BBB+ \u2264 20%) reduzieren die erreichbare Rendite um ca. "),
          bold("28\u201330 Basispunkte"),
          normal(" (SP: 3,67% \u2192 3,39%; SP+SU: 3,80% \u2192 3,508%). Dies ist der Preis f\u00FCr eine kontrollierte Risikosteuerung. Die Tight-Szenarien erreichen dabei eine deutlich h\u00F6here "),
          bold("Rendite/Duration-Effizienz"),
          normal(" (0,85\u20130,88 vs. 0,58\u20130,60), da der Solver gezwungen wird, kurze, renditestarke Anleihen optimal zu kombinieren.")
        ]),

        heading3("ESG-Kosten"),
        para([
          normal("Der Wechsel von Max Rendite zu Max ESG kostet im SP+SU Tight-Regime "),
          bold("ca. 18 Basispunkte"),
          normal(" (3,508% \u2192 3,33%), erm\u00F6glicht daf\u00FCr aber eine ESG-Quote von "),
          bold("100%"),
          normal(" (vs. 19,4% bei Max Rendite). Bei nur 19,4% Markt-ESG-Abdeckung ist dies ein bemerkenswert geringer Aufschlag.")
        ]),

        heading3("Bindende Constraints"),
        para("Im empfohlenen Portfolio (SP+SU Tight MaxRdt) sind drei Constraints bindend:"),
        bulletItem([bold("Duration PF \u00D8 = 4,00"), normal(" (Limit: \u2264 4,0) \u2013 voll ausgesch\u00F6pft")], "bullets2"),
        bulletItem([bold("Land Japan = 20,0%"), normal(" (Limit: \u2264 20%) \u2013 voll ausgesch\u00F6pft")], "bullets2"),
        bulletItem([bold("BBB+ = 20,0%"), normal(" (Limit: \u2264 20%) \u2013 voll ausgesch\u00F6pft")], "bullets2"),
        para([
          normal("Der "),
          bold("Preis-Constraint"),
          normal(" ist "),
          bold("nicht bindend"),
          normal(" (PF \u00D8 Preis: 99,70 vs. Limit 101; Slack 1,30). Eine Erh\u00F6hung des Preislimits w\u00FCrde daher keine Renditeverbesserung bringen.")
        ]),

        pageBreak(),

        // ═══ 4. EMPFOHLENES PORTFOLIO ═══
        heading1("4. Empfohlenes Portfolio"),

        para([
          normal("Auf Basis der Szenarioanalyse wird das Portfolio "),
          boldColored("SP+SU Max Rendite (Tight)", ACCENT_GREEN),
          normal(" als optimale L\u00F6sung empfohlen.")
        ]),

        heading2("4.1 Portfoliokennzahlen"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [4500, 4006],
          rows: [
            new TableRow({ children: [headerCell("Kennzahl", 4500), headerCell("Wert", 4006)] }),
            new TableRow({ children: [labelCell("Rendite (YTM)", 4500), dataCell("3,508%", 4006, { bold: true, color: ACCENT_GREEN })] }),
            new TableRow({ children: [labelCell("I-Spread", 4500), dataCell("79,4 bp", 4006)] }),
            new TableRow({ children: [labelCell("Kupon \u00D8", 4500), dataCell("3,401%", 4006)] }),
            new TableRow({ children: [labelCell("Mod. Duration", 4500), dataCell("4,00", 4006)] }),
            new TableRow({ children: [labelCell("Laufzeit \u00D8", 4500), dataCell("4,58 Jahre", 4006)] }),
            new TableRow({ children: [labelCell("Preis \u00D8", 4500), dataCell("99,70", 4006)] }),
            new TableRow({ children: [labelCell("Rating \u00D8", 4500), dataCell("A (LN=6,5)", 4006)] }),
            new TableRow({ children: [labelCell("Positionen", 4500), dataCell("22", 4006)] }),
            new TableRow({ children: [labelCell("Emittenten", 4500), dataCell("22", 4006)] }),
            new TableRow({ children: [labelCell("ESG-Quote", 4500), dataCell("19,4%", 4006)] }),
            new TableRow({ children: [labelCell("Risikogewicht \u00D8", 4500), dataCell("50,0%", 4006)] }),
            new TableRow({ children: [labelCell("RWA (EK 8%)", 4500), dataCell("8,00 Mio. EUR", 4006)] }),
            new TableRow({ children: [labelCell("Rendite/RW", 4500), dataCell("7,02", 4006)] }),
            new TableRow({ children: [labelCell("Rendite/Duration", 4500), dataCell("0,877", 4006)] }),
          ]
        }),

        heading2("4.2 Strukturmerkmale"),
        bulletItem([bold("Rang-Mix: "), normal("SP 35,0% | SU 65,0% \u2013 SU-\u00DCbergewicht nutzt den Spread-Vorteil")], "bullets"),
        bulletItem([bold("Sektor: "), normal("Banken 85,0% | Finanzdienstleister 15,0%")], "bullets"),
        bulletItem([bold("Kupon: "), normal("100% Fixed \u2013 kein Zins\u00E4nderungsrisiko auf Kuponseite")], "bullets"),
        bulletItem([bold("Struktur: "), normal("100% Bullet \u2013 keine Callable/Perpetual-Risiken")], "bullets"),

        heading2("4.3 Portfoliopositionen"),
        para([normal("Das Portfolio besteht aus 22 Positionen von 22 verschiedenen Emittenten. Die Bandbreite der Einzelrenditen reicht von 2,91% bis 4,14%:")]),

        // Portfolio positions table
        (() => {
          const cw = [2800, 800, 700, 900, 600, 600, 700, 700, 626];
          const tw = cw.reduce((a,b) => a+b, 0);
          const positions = [
            ["ISLANDSBANKI", "IS", "10,0", "3,75", "98,61", "118", "3,99", "SP", "BBB+"],
            ["BLACKSTONE HLDGS FIN.", "US", "10,0", "3,50", "95,58", "127", "4,14", "SU", "A+"],
            ["ARION BANKI HF", "IS", "10,0", "3,50", "98,35", "107", "3,84", "SP", "A\u2013"],
            ["UBS GROUP AG", "CH", "10,0", "0,25", "94,64", "54", "3,14", "SU", "A\u2013"],
            ["TORONTO-DOMINION BK", "CA", "10,0", "3,56", "99,83", "85", "3,60", "SU", "A"],
            ["SANTANDER UK PLC", "ES", "10,0", "3,35", "100,15", "60", "3,30", "SU", "A"],
            ["ORIX CORP", "JP", "10,0", "3,45", "98,52", "97", "3,74", "SU", "BBB+"],
            ["SUMITOMO MITSUI FG", "JP", "10,0", "3,57", "99,62", "83", "3,64", "SU", "A\u2013"],
            ["KBC GROUP NV", "BE", "10,0", "3,75", "100,79", "82", "3,60", "SU", "A\u2013"],
            ["ELM / JULIUS BAER", "NL", "10,0", "3,38", "98,78", "98", "3,69", "SU", "BBB+"],
            ["RAIFFEISEN SCHWEIZ", "CH", "10,0", "4,84", "104,09", "57", "3,19", "SU", "AA\u2013"],
            ["CANADIAN IMPERIAL BK", "CA", "10,0", "3,81", "101,68", "59", "3,26", "SU", "A"],
            ["HAMBURG COMM. BANK*", "DE", "10,0", "4,75", "104,07", "71", "3,35", "SP", "A\u2013"],
            ["FED CAISSES DESJAR.", "CA", "10,0", "3,25", "98,44", "85", "3,59", "SU", "A+"],
            ["MIZUHO FINANCIAL GR.", "JP", "10,0", "4,42", "103,93", "93", "3,78", "SU", "A\u2013"],
            ["WUESTENROT BAUSPARK.", "DE", "10,0", "3,38", "99,80", "75", "3,42", "SP", "A\u2013"],
            ["NATIONWIDE BLDG SOC.", "GB", "10,0", "3,25", "99,96", "58", "3,26", "SP", "A+"],
            ["BANQUE FED CRED MUT.", "FR", "10,0", "3,50", "100,06", "74", "3,49", "SP", "A+"],
            ["AAREAL BANK AG", "LU", "8,8", "0,75", "95,21", "64", "3,15", "SP", "BBB+"],
            ["MITSUBISHI HC CAP UK", "JP", "8,8", "3,62", "100,92", "39", "2,91", "SU", "A\u2013"],
            ["NOMURA HOLDINGS INC", "JP", "1,2", "3,46", "100,02", "75", "3,45", "SU", "BBB+"],
            ["HAMBURGER SPARKASSE", "DE", "1,2", "4,38", "103,39", "54", "3,14", "SP", "AA"],
          ];

          return new Table({
            width: { size: tw, type: WidthType.DXA },
            columnWidths: cw,
            rows: [
              new TableRow({ children: [
                headerCell("Emittent", cw[0]), headerCell("Land", cw[1]), headerCell("Nom.", cw[2]),
                headerCell("Kpn%", cw[3]), headerCell("Preis", cw[4]), headerCell("Sprd", cw[5]),
                headerCell("Rdt%", cw[6]), headerCell("Rang", cw[7]), headerCell("Rtg", cw[8])
              ]}),
              ...positions.map(p => new TableRow({ children: [
                dataCell(p[0], cw[0], { align: AlignmentType.LEFT, bold: false }),
                dataCell(p[1], cw[1]), dataCell(p[2], cw[2]), dataCell(p[3], cw[3]),
                dataCell(p[4], cw[4]), dataCell(p[5], cw[5]),
                dataCell(p[6], cw[6], { bold: true }), dataCell(p[7], cw[7]), dataCell(p[8], cw[8])
              ]}))
            ]
          });
        })(),

        emptyPara(),
        para([
          italic("* Hamburg Commercial Bank mit SP-Position (DE000HCB0B36, Kpn 4,75%, 3,1Y). Fraktionale Allokationen (8,8 / 1,2 Mio.) resultieren aus der MIP-Optimierung und zeigen optimale Solver-Balancierung.")
        ]),

        pageBreak(),

        heading2("4.4 Diversifikation"),

        heading3("L\u00E4nderverteilung"),
        para("Das Portfolio verteilt sich auf 12 L\u00E4nder. Japan erreicht das Maximum von 20%:"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2000, 1800, 1800, 1800, 1126],
          rows: [
            new TableRow({ children: [headerCell("Land", 2000), headerCell("Nominal", 1800), headerCell("Anteil", 1800), headerCell("Positionen", 1800), headerCell("Status", 1126)] }),
            new TableRow({ children: [labelCell("Japan", 2000), dataCell("40,0 Mio.", 1800), dataCell("20,0%", 1800, { bold: true, color: "CC6600" }), dataCell("5", 1800), dataCell("Bindend", 1126, { color: "CC0000", bold: true })] }),
            new TableRow({ children: [labelCell("Kanada", 2000), dataCell("30,0 Mio.", 1800), dataCell("15,0%", 1800), dataCell("3", 1800), dataCell("", 1126)] }),
            new TableRow({ children: [labelCell("Deutschland", 2000), dataCell("21,2 Mio.", 1800), dataCell("10,6%", 1800), dataCell("3", 1800), dataCell("", 1126)] }),
            new TableRow({ children: [labelCell("Island", 2000), dataCell("20,0 Mio.", 1800), dataCell("10,0%", 1800), dataCell("2", 1800), dataCell("", 1126)] }),
            new TableRow({ children: [labelCell("Schweiz", 2000), dataCell("20,0 Mio.", 1800), dataCell("10,0%", 1800), dataCell("2", 1800), dataCell("", 1126)] }),
            new TableRow({ children: [labelCell("Sonstige 7", 2000), dataCell("68,8 Mio.", 1800), dataCell("34,4%", 1800), dataCell("7", 1800), dataCell("", 1126)] }),
          ]
        }),

        heading3("Rating-Verteilung"),
        para([
          normal("Das Durchschnittsrating liegt bei "),
          bold("A"),
          normal(". Die BBB+-Quote betr\u00E4gt genau "),
          bold("20%"),
          normal(" (bindend). Die Bandbreite reicht von AA bis BBB+, wobei der Schwerpunkt auf dem A-Bereich liegt.")
        ]),

        heading2("4.5 Duration-Barbell-Strategie"),
        para([
          normal("Der MIP-Solver nutzt eine "),
          bold("Duration-Barbell-Strategie"),
          normal(": Er kombiniert kurze Anleihen mit niedriger Duration (UBS 1,88Y, Mitsubishi HC 1,30Y, Raiffeisen 2,42Y) mit l\u00E4ngeren, renditestarken Titeln (Blackstone 6,76Y, Mizuho 5,89Y, Islandsbanki 5,70Y). Diese Kombination erzielt die Ziel-Duration von 4,00 bei maximaler Renditeaussch\u00F6pfung.")
        ]),

        pageBreak(),

        // ═══ 5. SNP-SIMULATION ═══
        heading1("5. SNP-Simulation: Ergebnis und Bewertung"),
        para([
          normal("Senior Non-Preferred (SNP) ist "),
          bold("nicht zul\u00E4ssig"),
          normal(" f\u00FCr die Portfolioinvestition. Die Simulation wurde ausschlie\u00DFlich durchgef\u00FChrt, um die Attraktivit\u00E4t einer m\u00F6glichen SNP-Beimischung quantitativ zu bewerten.")
        ]),

        heading2("5.1 Renditeeffekt"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [3000, 2000, 2000, 1526],
          rows: [
            new TableRow({ children: [headerCell("Szenario", 3000), headerCell("Rendite", 2000), headerCell("Delta", 2000), headerCell("SNP-Effekt", 1526)] }),
            new TableRow({ children: [
              labelCell("SP+SU Tight MaxRdt", 3000),
              dataCell("3,508%", 2000, { bold: true }), dataCell("\u2013", 2000), dataCell("Referenz", 1526)
            ]}),
            new TableRow({ children: [
              labelCell("SP+SU+SNP Tight MaxRdt (S6)", 3000),
              dataCell("3,54%", 2000, { bold: true }), dataCell("+3,2 bp", 2000, { color: "CC0000" }), dataCell("Marginal", 1526, { color: "CC0000" })
            ]}),
            new TableRow({ children: [
              labelCell("SP+SU+SNP Tight MaxESG (S7)", 3000),
              dataCell("3,40%", 2000), dataCell("+7,0 bp vs. S5", 2000), dataCell("Marginal", 1526, { color: "CC0000" })
            ]}),
          ]
        }),

        emptyPara(),
        para([
          normal("Das Ergebnis ist eindeutig: Die Hinzunahme von SNP liefert "),
          bold("nur 3,2 Basispunkte"),
          normal(" Mehrrendite. Dieser Betrag ist \u2013 gemessen am erh\u00F6hten Bail-in-Risiko im Abwicklungsfall und der geringeren regulatorischen Einordnung \u2013 "),
          bold("nicht attraktiv"),
          normal(". Die Entscheidung, SNP auszuschlie\u00DFen, wird durch die Optimierungsergebnisse vollumf\u00E4nglich best\u00E4tigt.")
        ]),

        pageBreak(),

        // ═══ 6. FAZIT ═══
        heading1("6. Fazit und Empfehlung"),

        para([
          normal("Die systematische MIP-Optimierung \u00FCber 9 Szenarien f\u00FChrt zu einem klaren Ergebnis:")
        ]),

        // Summary box as table
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [CONTENT_W],
          rows: [
            new TableRow({ children: [
              new TableCell({
                borders: { top: { style: BorderStyle.SINGLE, size: 4, color: ACCENT_GREEN }, bottom: { style: BorderStyle.SINGLE, size: 4, color: ACCENT_GREEN }, left: { style: BorderStyle.SINGLE, size: 4, color: ACCENT_GREEN }, right: { style: BorderStyle.SINGLE, size: 4, color: ACCENT_GREEN } },
                width: { size: CONTENT_W, type: WidthType.DXA },
                shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR },
                margins: { top: 200, bottom: 200, left: 300, right: 300 },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [
                    new TextRun({ text: "EMPFEHLUNG", font: "Arial", size: 28, bold: true, color: ACCENT_GREEN })
                  ]}),
                  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [
                    new TextRun({ text: "SP+SU Max Rendite (Tight) \u2013 Rendite: 3,508%", font: "Arial", size: 24, bold: true, color: DARK_BLUE })
                  ]}),
                  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [
                    normal("22 Positionen | 22 Emittenten | 12 L\u00E4nder | Duration 4,00 | Preis 99,70 | Rating A")
                  ]})
                ]
              })
            ]})
          ]
        }),

        emptyPara(),

        para([bold("Begr\u00FCndung der Empfehlung:")]),
        bulletItem([bold("H\u00F6chste Rendite im zul\u00E4ssigen Rahmen: "), normal("3,508% \u00FCbertrifft alle reinen SP-Varianten deutlich (+12 bp vs. S8)")], "numbers"),
        bulletItem([bold("Optimale Rendite/Duration-Effizienz: "), normal("0,877 \u2013 die beste unter allen Tight-Szenarien")], "numbers"),
        bulletItem([bold("Robuste Diversifikation: "), normal("22 Emittenten, 12 L\u00E4nder, keine Einzelkonzentration")], "numbers"),
        bulletItem([bold("Kontrolliertes Risiko: "), normal("Alle regulatorischen und selbstgew\u00E4hlten Constraints eingehalten")], "numbers"),
        bulletItem([bold("SNP nicht erforderlich: "), normal("Nur +3,2 bp Mehrrendite bei deutlich h\u00F6herem Bail-in-Risiko")], "numbers"),
        bulletItem([bold("Preis unter Par: "), normal("PF \u00D8 99,70 \u2013 Kursgewinnpotenzial bei Endf\u00E4lligkeit")], "numbers"),

        emptyPara(),
        para([
          normal("Das Portfolio befindet sich an der "),
          bold("effizienten Grenze"),
          normal(" der Portfoliooptimierung. Mit drei bindenden Constraints (Duration, Japan-Limit, BBB+-Limit) und einem nicht-bindenden Preis-Constraint ist das Ergebnis mathematisch optimal. Eine Renditeverbesserung ist nur durch Lockerung einer der bindenden Constraints m\u00F6glich \u2013 nicht durch eine andere Portfoliozusammenstellung.")
        ]),
      ]
    }
  ]
});

// Write
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/omazn/Desktop/PF/v4-standalone/Anleiheportfolio_Optimierung_Bericht.docx", buffer);
  console.log("Report created: Anleiheportfolio_Optimierung_Bericht.docx");
});
