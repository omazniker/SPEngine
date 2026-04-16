// SheetJS (XLSX) helper utilities for generating and downloading Excel workbooks.
// Relies on the global XLSX and JSZip objects loaded via CDN script tags.
// Tab colour injection and freeze-pane patching are done via JSZip post-processing
// because SheetJS community edition does not support these natively.

import { downloadBlob } from './format.js';

// ─── Tab colour schema ───────────────────────────────────────────────────────

/** Hex colour codes for worksheet tab colouring by content category. */
export const TAB_COLORS = {
  INFO:   "1E3A5F", // Dunkelblau — Übersicht/Navigation
  DATA:   "2E7D32", // Grün — Bond-Rohdaten
  KPI:    "1565C0", // Blau — Kennzahlen/Statistiken
  CHART:  "E65100", // Orange — Chart-/Visualisierungsdaten
  COMP:   "6A1B9A", // Lila — Vergleiche/Deltas
  CONFIG: "546E7A", // Grau — Regelwerk/Konfiguration
  PROFILE:"00838F", // Teal — Profile
};

/** Attach a tab colour to a worksheet's sheetPr metadata. */
export const setTabColor = (ws, hex) => {
  if (ws) ws['!sheetPr'] = { ...(ws['!sheetPr']||{}), tabColor: { rgb: hex } };
};

/** Human-readable colour label → TAB_COLORS hex mapping. */
export const COLOR_NAME_TO_HEX = {
  "Dunkelblau": TAB_COLORS.INFO,
  "Grün":       TAB_COLORS.DATA,
  "Blau":       TAB_COLORS.KPI,
  "Orange":     TAB_COLORS.CHART,
  "Lila":       TAB_COLORS.COMP,
  "Grau":       TAB_COLORS.CONFIG,
  "Teal":       TAB_COLORS.PROFILE,
};

// ─── Column auto-width ───────────────────────────────────────────────────────

/**
 * Set column widths on a SheetJS worksheet based on the longest cell value
 * in each column across all data rows.
 *
 * @param {Object} ws   - SheetJS worksheet object (mutated in place).
 * @param {Array}  data - 2D array of row values (same data passed to aoa_to_sheet).
 * @param {number} [minW=8]  - Minimum column width in characters.
 * @param {number} [maxW=40] - Maximum column width in characters.
 */
export const xlsxAutoWidth = (ws, data, minW = 8, maxW = 40) => {
  const cols = [];
  data.forEach(row => {
    row.forEach((cell, ci) => {
      const len = cell != null ? String(cell).length : 0;
      cols[ci] = Math.min(maxW, Math.max(cols[ci] || minW, len + 2));
    });
  });
  ws['!cols'] = cols.map(w => ({ wch: w }));
};

// ─── Worksheet factory ───────────────────────────────────────────────────────

/**
 * Convert a 2D array to a SheetJS worksheet with auto-width columns,
 * optional freeze row, optional auto-filter, and numeric cell formatting.
 *
 * @param {Array}  data              - 2D array of row values.
 * @param {Object} [opts={}]         - Options object.
 * @param {number} [opts.freezeRow]  - Number of rows to freeze from the top.
 * @param {number} [opts.autoFilter] - Row index (1-based) of the header for auto-filter.
 * @param {number} [opts.minW]       - Minimum column width (forwarded to xlsxAutoWidth).
 * @param {number} [opts.maxW]       - Maximum column width (forwarded to xlsxAutoWidth).
 * @returns {Object} SheetJS worksheet object.
 */
export const xlsxSheet = (data, opts = {}) => {
  const ws = XLSX.utils.aoa_to_sheet(data);
  xlsxAutoWidth(ws, data, opts.minW, opts.maxW);
  if (opts.freezeRow) ws['!freeze'] = { xSplit: 0, ySplit: opts.freezeRow, topLeftCell: XLSX.utils.encode_cell({ r: opts.freezeRow, c: 0 }) };
  if (opts.autoFilter && data.length > 1) {
    const headerRow = opts.autoFilter - 1;
    const lastCol = Math.max(...data.map(r => r.length)) - 1;
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: data.length - 1, c: lastCol } }) };
  }
  // Alle numerischen Zellen: Zahlenformat "0.00" (2 Nachkommastellen)
  const ref = ws['!ref'];
  if (ref) {
    const range = XLSX.utils.decode_range(ref);
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.t === 'n') cell.z = '0.00';
      }
    }
  }
  return ws;
};

// ─── Workbook download ───────────────────────────────────────────────────────

/**
 * Serialize a SheetJS workbook and trigger a browser download.
 * Uses JSZip post-processing to inject tab colours and freeze panes that
 * SheetJS community edition cannot write natively.
 *
 * @param {Object} wb       - SheetJS workbook object.
 * @param {string} filename - Output filename (should end in .xlsx).
 * @returns {Promise<void>}
 */
export const xlsxDownload = async (wb, filename) => {
  // Custom-Properties vor XLSX.write sichern und entfernen (verhindert SheetJS-Interferenz)
  const _meta = {};
  wb.SheetNames.forEach(name => {
    const ws = wb.Sheets[name];
    if (!ws) return;
    _meta[name] = { tabColor: ws['!sheetPr']?.tabColor?.rgb, freeze: ws['!freeze'] };
    delete ws['!sheetPr']; delete ws['!freeze'];
  });
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  // Prüfe ob JSZip-Postprocessing nötig
  let needsPostProcess = false;
  wb.SheetNames.forEach(name => {
    const m = _meta[name];
    if (!m) return;
    if (m.tabColor || m.freeze) needsPostProcess = true;
  });
  if (needsPostProcess && typeof JSZip !== 'undefined') {
    try {
      const zip = await JSZip.loadAsync(wbout);

      // ─── Sheet-Loop: Tab-Farben & Freeze Panes ───
      for (let i = 0; i < wb.SheetNames.length; i++) {
        const m = _meta[wb.SheetNames[i]];
        if (!m) continue;
        const tabColor = m.tabColor;
        const freezeY = m.freeze?.ySplit || 0;
        if (!tabColor && !freezeY) continue;

        const sfName = `xl/worksheets/sheet${i + 1}.xml`;
        const sf = zip.file(sfName);
        if (!sf) continue;
        let xml = await sf.async('string');

        // 1) Tab-Farbe (robuste Behandlung aller sheetPr-Varianten)
        if (tabColor) {
          const tcTag = `<tabColor rgb="FF${tabColor}"/>`;
          // Erst existierende tabColor entfernen (falls SheetJS sie geschrieben hat)
          xml = xml.replace(/<tabColor[^/]*\/>/g, '');
          if (/<sheetPr[^>]*\/>/.test(xml)) {
            // Self-closing: <sheetPr/> oder <sheetPr attr="val"/>
            xml = xml.replace(/<sheetPr([^/]*)\/>/, `<sheetPr$1>${tcTag}</sheetPr>`);
          } else if (/<sheetPr[^>]*>/.test(xml)) {
            // Open tag: <sheetPr> oder <sheetPr attr="val">
            xml = xml.replace(/<sheetPr([^>]*)>/, `<sheetPr$1>${tcTag}`);
          } else {
            // Kein sheetPr → neu erzeugen vor dimension/sheetData
            const a = xml.includes('<dimension') ? '<dimension' : '<sheetData';
            xml = xml.replace(a, `<sheetPr>${tcTag}</sheetPr>${a}`);
          }
        }

        // 2) Freeze Panes
        if (freezeY > 0) {
          const topCell = `A${freezeY + 1}`;
          const paneXml = `<sheetViews><sheetView tabSelected="${i===0?1:0}" workbookViewId="0"><pane ySplit="${freezeY}" topLeftCell="${topCell}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="${topCell}" sqref="${topCell}"/></sheetView></sheetViews>`;
          if (xml.includes('<sheetViews')) xml = xml.replace(/<sheetViews[\s\S]*?<\/sheetViews>/, paneXml);
          else { const anchors = ['<sheetFormatPr','<cols>','<cols ','<sheetData']; let ok=false; for(const a of anchors){if(xml.includes(a)){xml=xml.replace(a, paneXml+a); ok=true; break;}} if(!ok) xml=xml.replace('</worksheet>', paneXml+'</worksheet>'); }
        }

        zip.file(sfName, xml);
      }
      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      downloadBlob(blob, filename);
      return;
    } catch (e) { console.warn('XLSX post-processing failed, falling back:', e); }
  }
  // Fallback: normaler Download
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
};

// ─── Convenience helpers ─────────────────────────────────────────────────────

/**
 * Create a single-sheet workbook from headers + data rows and download it.
 * The output filename has its .csv extension replaced with .xlsx if present.
 *
 * @param {string}         filename  - Output filename.
 * @param {Array<string>}  headers   - Header row values.
 * @param {Array<Array>}   dataRows  - Data rows (each an array of cell values).
 * @param {string}         [sheetName="Daten"] - Worksheet name.
 */
export const exportTableXLSX = (filename, headers, dataRows, sheetName) => {
  const wb = XLSX.utils.book_new();
  const all = [headers, ...dataRows];
  const ws = xlsxSheet(all, { freezeRow: 1, autoFilter: 1 });
  XLSX.utils.book_append_sheet(wb, ws, sheetName || "Daten");
  xlsxDownload(wb, filename.replace(/\.csv$/i, '.xlsx'));
};
