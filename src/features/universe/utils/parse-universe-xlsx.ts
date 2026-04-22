import ExcelJS from "exceljs";

/**
 * Parst die erste Sheet-Seite eines XLSX-Files als Array von Bond-Records.
 *
 * Erste Zeile = Header (Spaltennamen), jede folgende Zeile = ein Bond.
 * Spaltennamen werden 1:1 als JSON-Keys übernommen — das Original-SPEngine
 * kann Bloomberg-Exports in beliebigem Format verarbeiten, wir halten das
 * Mapping hier bewusst offen.
 *
 * Leere Headerzellen werden ignoriert; leere Datenzeilen (alle Zellen leer)
 * werden übersprungen.
 */
export async function parseUniverseXlsx(
  buffer: ArrayBuffer,
): Promise<Array<Record<string, unknown>>> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("XLSX enthält keine Sheet-Seiten.");
  }

  const headerRow = sheet.getRow(1);
  const headers: Array<string | null> = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    const value = cell.value;
    headers[col] =
      value === null || value === undefined || value === "" ? null : String(value).trim();
  });

  const bonds: Array<Record<string, unknown>> = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Header
    const record: Record<string, unknown> = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const key = headers[col];
      if (!key) return;
      const raw = cell.value;
      // ExcelJS liefert für Datum-Zellen ein Date-Objekt, für Formel-Zellen
      // { result, formula } — wir wollen nur den Wert, nicht die Formel.
      let value: unknown = raw;
      if (raw && typeof raw === "object") {
        if (raw instanceof Date) {
          value = raw.toISOString();
        } else if ("result" in raw) {
          value = (raw as { result: unknown }).result ?? null;
        } else if ("richText" in raw) {
          value = (raw as { richText: Array<{ text: string }> }).richText
            .map((r) => r.text)
            .join("");
        }
      }
      if (value !== null && value !== undefined && value !== "") {
        record[key] = value;
        hasValue = true;
      }
    });
    if (hasValue) bonds.push(record);
  });

  return bonds;
}
