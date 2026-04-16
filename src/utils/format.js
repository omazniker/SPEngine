// Number formatting utilities for German locale output (comma as decimal separator).
// Also includes downloadBlob for triggering browser file downloads,
// and exportCSV for generating semicolon-delimited CSV files.

/**
 * Format a number with German decimal notation (comma separator).
 * Returns "-" for null/NaN values.
 * @param {number|null} n - The value to format.
 * @param {number} d - Number of decimal places.
 */
export const fx = (n, d) => (n != null && !isNaN(n) ? Number(n).toFixed(d).replace('.', ',') : "-");

/**
 * Format a number using the de-DE locale (toLocaleString).
 * Returns "-" for null/NaN values.
 * @param {number|null} n - The value to format.
 * @param {number} d - Number of decimal places.
 */
export const fxV = (n, d) => (n != null && !isNaN(n) ? Number(n).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }) : "-");

/**
 * Format a Fälligkeit (maturity date) string into German dd.mm.yyyy notation.
 * Accepts dd.mm.yyyy or ISO date strings.
 */
export const fmtFall = (fall) => {
  if (!fall) return "";
  const p = fall.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (p) return p[1].padStart(2,'0') + '.' + p[2].padStart(2,'0') + '.' + p[3];
  const d = new Date(fall);
  if (!isNaN(d) && d.getFullYear() > 2000 && d.getFullYear() < 2100) return d.toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'});
  return fall;
};

/**
 * Format a volume in millions of euros, scaling to billions when >= 1000.
 */
export const fmtVol = (v) => !v ? "-" : v >= 1000 ? fxV(v / 1000, 0) + " Mrd. €" : v < 1 ? fxV(v, 2) + " Mio. €" : fxV(v, 0) + " Mio. €";

/**
 * Format a large number with adaptive scaling (Tsd./Mio./Mrd.).
 */
export const fmtNum = (v) => !v && v !== 0 ? "-" : Math.abs(v) >= 1000 ? fxV(v / 1000, 1) + " Mrd." : Math.abs(v) >= 1 ? fxV(v, 1) + " Mio." : fxV(v * 1000, 0) + " Tsd.";

/**
 * Trigger a browser file download from a Blob object.
 * @param {Blob} blob - The data blob to download.
 * @param {string} filename - The filename to save as.
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Export an array of rows as a semicolon-delimited CSV file with UTF-8 BOM.
 * @param {string} filename - Output filename.
 * @param {Array<Array<any>>} rows - 2D array of cell values.
 */
export const exportCSV = (filename, rows) => {
  const csvContent = "\ufeff" + rows.map(r => r.map(cell => {
    if (cell == null) return "";
    const str = String(cell);
    if (str.includes(";") || str.includes("\n") || str.includes("\"")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }).join(";")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
};
