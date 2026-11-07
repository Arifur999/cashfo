"use client";

import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, parseCsv, type ImportFile } from "@/lib/customer/dataImport";
import { readXlsx } from "@/lib/customer/xlsxRead";
import { toLocaleDigits } from "@/lib/i18n/digits";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";

// Hands a made file (an object URL) to the browser to save.
export function saveFile(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
}

// "18.4 MB", "14 KB", in the reader's digits.
export function fileSizeText(bytes: number, fmt: FormatLocale): string {
  const text = bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return toLocaleDigits(text, fmt);
}

const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

export type ImportReadError = "type" | "old" | "size" | "empty" | "many";

// A chosen file as rows, or why it can't be read: not a CSV or workbook, an
// old .xls, over 5 MB, no rows, or more rows than one import takes.
export async function readImportFile(file: File): Promise<ImportFile | ImportReadError> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (ext === "xls") return "old";
  if (ext !== "csv" && ext !== "xlsx") return "type";
  if (file.size > MAX_IMPORT_BYTES) return "size";
  const buffer = await file.arrayBuffer();
  let rows: string[][];
  try {
    rows = ext === "csv" ? parseCsv(new TextDecoder().decode(buffer)) : await readXlsx(buffer);
  } catch {
    return "empty";
  }
  const [head, ...rest] = rows;
  const filled = rest.filter((row) => row.some((cell) => cell.trim() !== ""));
  if (!head || filled.length === 0) return "empty";
  if (filled.length > MAX_IMPORT_ROWS) return "many";
  return { name: file.name, size: file.size, ext: ext === "csv" ? "CSV" : "XLSX", head: head.map((cell) => cell.trim()), rows: rest, key: hex(await crypto.subtle.digest("SHA-256", buffer)) };
}

// The sample's key: the same sample imported twice adds nothing twice.
export async function keyOf(text: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}
