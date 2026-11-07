// Settings › Data & privacy › Import: reading a CSV, matching its columns
// to Smartly's fields and checking each row before anything is sent. Pure,
// so the browser and the tests run the same rules; the API checks every
// row again.

export const IMPORT_FIELDS = [
  { key: "date", label: "Date", required: true },
  { key: "type", label: "Type", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "category", label: "Category", required: false },
  { key: "wallet", label: "Account", required: false },
  { key: "note", label: "Note", required: false },
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number]["key"];
// Each field's column in the file, as its index ("" = not imported).
export type ColumnMap = Record<ImportField, string>;

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;
// Rows sent to the API in one request.
export const IMPORT_CHUNK = 100;
const MAX_AMOUNT = 999_999_999_999.99;

export interface ImportFile {
  name: string;
  size: number;
  ext: "CSV" | "XLSX";
  head: string[];
  // Every record after the header, blank ones too, so row numbers match the file's.
  rows: string[][];
  // The file's sha-256: the same file imported twice adds nothing twice.
  key: string;
}

export interface ImportRow {
  row: number;
  date: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category?: string;
  wallet?: string;
  note?: string;
}

// A row that can't go in: a dictionary key, with {value} filled.
export interface ImportProblem {
  row: number;
  reason: string;
  value?: string;
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const asciiDigits = (text: string) => text.replace(/[০-৯]/g, (digit) => String(BN_DIGITS.indexOf(digit)));

// The file's separator: a comma, or the semicolon or tab some spreadsheets
// write, whichever the header row has most of (outside quotes).
function separatorOf(text: string): string {
  const end = text.search(/\r?\n/);
  const line = end < 0 ? text : text.slice(0, end);
  let quoted = false;
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch in counts) counts[ch] += 1;
  }
  const [most, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return count > 0 ? most : ",";
}

// Every record of a CSV, quotes and line breaks inside them understood.
// A byte-order mark is dropped; the last line's break makes no record.
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const separator = separatorOf(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === separator) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const ALIASES: Record<ImportField, string[]> = {
  date: ["date", "day", "txn date", "transaction date", "value date", "তারিখ"],
  type: ["type", "kind", "dr/cr", "ধরন"],
  amount: ["amount", "taka", "tk", "bdt", "amount bdt", "পরিমাণ", "টাকা"],
  category: ["category", "cat", "ক্যাটাগরি", "খাত"],
  wallet: ["account", "wallet", "bank", "অ্যাকাউন্ট", "ওয়ালেট"],
  note: ["note", "notes", "details", "description", "narration", "particulars", "remarks", "নোট", "বিবরণ"],
};
const plain = (name: string) =>
  name
    .toLocaleLowerCase()
    .replace(/[()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Columns named like a field are matched to it; the person fixes the rest.
export function autoMap(head: string[]): ColumnMap {
  const names = head.map(plain);
  const taken = new Set<number>();
  const map = {} as ColumnMap;
  for (const field of IMPORT_FIELDS) {
    const exact = names.findIndex((name, index) => !taken.has(index) && ALIASES[field.key].includes(name));
    const loose = exact >= 0 ? exact : names.findIndex((name, index) => !taken.has(index) && ALIASES[field.key].some((alias) => alias.length > 2 && name.startsWith(alias)));
    if (loose >= 0) taken.add(loose);
    map[field.key] = loose >= 0 ? String(loose) : "";
  }
  return map;
}

export const missingFields = (map: ColumnMap) => IMPORT_FIELDS.filter((field) => field.required && !map[field.key]);

const pad = (n: number) => String(n).padStart(2, "0");
const realDay = (year: number, month: number, day: number): string => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? `${year}-${pad(month)}-${pad(day)}` : "";
};

// A spreadsheet's day number (1900 system) as YYYY-MM-DD.
export const excelDay = (serial: number): string => new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000).toISOString().slice(0, 10);

// YYYY-MM-DD from the ways a date is written here: 2026-11-05, 5/11/2026
// (day first), 5-11-2026, 5.11.2026, a spreadsheet's day number, or a date
// with a time after it. "" when it isn't a real date.
export function importDate(raw: string): string {
  const text = asciiDigits(raw.trim()).replace(/[T\s].*$/, (rest) => (/^[T\s]\d{1,2}:\d{2}/.test(rest) ? "" : rest));
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  if (match) return realDay(Number(match[1]), Number(match[2]), Number(match[3]));
  match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
  if (match) return realDay(Number(match[3]), Number(match[2]), Number(match[1]));
  if (/^\d{5}(\.\d+)?$/.test(text) && Number(text) >= 20_000 && Number(text) <= 80_000) return excelDay(Number(text));
  return "";
}

// An amount as typed: ৳, Tk, BDT, commas and spaces dropped; a minus or
// brackets ignored (the Type column says which way it went). Null when it
// isn't one, or has more than two decimals.
export function importAmount(raw: string): number | null {
  const text = asciiDigits(raw.trim())
    .replace(/৳|tk\.?|bdt|taka|,|\s/gi, "")
    .replace(/^\((.*)\)$/, "$1")
    .replace(/^[-−+]/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const value = Number(text);
  return value > 0 && value <= MAX_AMOUNT ? value : null;
}

const INCOME_WORDS = ["income", "in", "credit", "cr", "deposit", "received", "আয়", "জমা"];
const EXPENSE_WORDS = ["expense", "out", "debit", "dr", "withdrawal", "spent", "paid", "খরচ", "ব্যয়"];
export function importType(raw: string): "INCOME" | "EXPENSE" | null {
  const word = raw.trim().toLocaleLowerCase().replace(/\.$/, "");
  if (INCOME_WORDS.includes(word)) return "INCOME";
  if (EXPENSE_WORDS.includes(word)) return "EXPENSE";
  return null;
}

const same = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

// Which rows can go in and why the others can't. Blank rows are passed
// over; row numbers are the file's (the header is row 1).
export function reviewImport(file: Pick<ImportFile, "rows">, map: ColumnMap, context: { wallets: string[]; today: string }): { good: ImportRow[]; bad: ImportProblem[] } {
  const good: ImportRow[] = [];
  const bad: ImportProblem[] = [];
  const cell = (row: string[], field: ImportField) => {
    const index = map[field];
    return index === "" ? "" : String(row[Number(index)] ?? "").trim();
  };
  file.rows.forEach((row, index) => {
    if (row.every((value) => String(value ?? "").trim() === "")) return;
    const number = index + 2;
    const dateText = cell(row, "date");
    const date = importDate(dateText);
    const amountText = cell(row, "amount");
    const amount = importAmount(amountText);
    const type = importType(cell(row, "type"));
    const category = cell(row, "category");
    const wallet = cell(row, "wallet");
    const problem = (reason: string, value?: string) => bad.push({ row: number, reason, value });
    if (!dateText) return void problem("The date is empty.");
    if (!date) return void problem("“{value}” is not a real date.", dateText);
    if (date > context.today) return void problem("The date is in the future.");
    if (!amountText) return void problem("The amount is empty.");
    if (amount === null) return void problem("“{value}” is not an amount.", amountText);
    if (!type) return void problem("Type must be Income or Expense.");
    if (category.length > 40) return void problem("The category is longer than 40 characters.");
    if (wallet && !context.wallets.some((name) => same(name, wallet))) return void problem("No wallet named “{value}”.", wallet);
    const note = cell(row, "note").slice(0, 500);
    good.push({ row: number, date, type, amount, ...(category && { category }), ...(wallet && { wallet }), ...(note && { note }) });
  });
  return { good, bad };
}

// The template's rows: what each column holds, in the order autoMap reads.
export const TEMPLATE_CSV = "Date,Type,Amount,Category,Account,Note\r\n2026-11-01,Income,85000,Salary,Bank,Salary for October\r\n2026-11-05,Expense,2350,Food & Dining,Cash,Bazar at Karwan Bazar\r\n";

// A small file to try the import with, dated in the month before `today`.
export function sampleFile(today: string, wallets: string[]): Omit<ImportFile, "key"> {
  const [year, month] = today.split("-").map(Number);
  const before = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const day = (n: number) => `${pad(n)}/${pad(before.month)}/${before.year}`;
  const wallet = (n: number) => wallets[n % Math.max(1, wallets.length)] ?? "";
  const kinds = [
    ["Food & Dining", "Bazar"],
    ["Transport", "Pathao ride"],
    ["Bills & Utilities", "Internet bill"],
    ["Food & Dining", "Lunch"],
    ["Shopping", "Shirt for Eid"],
    ["Health", "Medicine"],
  ];
  const rows: string[][] = [[day(1), "Income", "85000", "Salary", wallet(0), "Salary"]];
  for (let n = 0; n < 24; n += 1) {
    const [category, note] = kinds[n % kinds.length];
    rows.push([day((n % 27) + 2), "Expense", String(120 + ((n * 373) % 4800)), category, wallet(n), note]);
  }
  // Two rows that need fixing, as a real file often has.
  rows[9][2] = "";
  rows[18][0] = `31/02/${before.year}`;
  return { name: "sample-transactions.csv", size: 2100, ext: "CSV", head: ["Date", "Type", "Amount", "Category", "Wallet", "Details"], rows };
}
