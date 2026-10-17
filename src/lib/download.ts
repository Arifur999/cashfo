import { format } from "date-fns";

// "users-2026-10-17": what an export's file is called on the day it's made.
export const datedFileName = (name: string) => `${name}-${format(new Date(), "yyyy-MM-dd")}`;

// Browser-only: saves in-memory content as a file via a temporary object URL.
export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const withExtension = (fileName: string, extension: string) => (fileName.endsWith(extension) ? fileName : `${fileName}${extension}`);

// Pretty-printed, so an exported file is readable and diffs cleanly.
export const downloadJson = (data: unknown, fileName: string) =>
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), withExtension(fileName, ".json"));

// The BOM makes Excel open the file as UTF-8, so Bangla text survives.
export const downloadCsv = (csv: string, fileName: string) =>
  downloadBlob(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }), withExtension(fileName, ".csv"));
