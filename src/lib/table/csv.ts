// Pure CSV helpers behind the DataTable export button (unit-tested).

// RFC 4180 quoting, plus CSV-injection protection: a text cell starting with
// = + - @ (or a tab/CR) is prefixed with ' so a spreadsheet never evaluates
// user-supplied text as a formula. Numbers are left alone so -5 stays -5.
export const toCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\n\r]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const toCsv = (headers: string[], rows: unknown[][]): string =>
  [headers, ...rows].map((row) => row.map(toCsvCell).join(",")).join("\r\n");

export const downloadCsv = (fileName: string, csv: string) => {
  // The BOM makes Excel open the file as UTF-8, so Bangla names survive.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
