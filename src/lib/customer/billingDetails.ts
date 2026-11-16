import { gatewayLabel, type BillingPayment } from "./billingDisplay";

// Settings › Plans & billing › Billing details: the name, phone and email
// a receipt carries. The backend falls back to the account's own for each
// one left empty.
export interface BillingDetails {
  name: string;
  email: string;
  // +8801XXXXXXXXX, or null.
  phone: string | null;
}

// The same rule the backend checks: letters in any script, with the
// spaces, dots, apostrophes and hyphens names have.
const NAME = /^\p{L}[\p{L}\p{M} .'-]*$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Each answers a dictionary key, or null when the value is fine.
export function billingNameProblem(name: string): string | null {
  const value = name.trim();
  if (!value) return "Type the name for receipts.";
  if (value.length < 2) return "Use at least 2 letters.";
  if (value.length > 60) return "Use 60 letters or fewer.";
  return NAME.test(value) ? null : "Use letters only, no numbers or symbols.";
}

// The 10 digits after +880 (1XXXXXXXXX), from whatever was typed.
export const phoneDigits = (typed: string) => typed.replace(/\D/g, "").replace(/^(?:880|0)/, "");

export function billingPhoneProblem(typed: string): string | null {
  const digits = phoneDigits(typed);
  if (!digits) return null;
  return /^1[3-9]\d{8}$/.test(digits) ? null : "Type all 10 digits after +880, like 1711-482915.";
}

export function billingEmailProblem(email: string): string | null {
  const value = email.trim();
  if (!value) return null;
  return EMAIL.test(value) && value.length <= 254 ? null : "Type an email like name@example.com.";
}

// "1811-000000" from +8801811000000, for the box after the +880 prefix.
export function phoneBoxText(phone: string | null): string {
  const digits = phone ? phoneDigits(phone) : "";
  return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
}

// "+880 1811-000000", or null.
export const phoneShown = (phone: string | null) => (phone ? `+880 ${phoneBoxText(phone)}` : null);

// Quoted, and a text cell starting with = + - @ kept as text with a leading '
// (the plan's name and the invoice number come from elsewhere), so a
// spreadsheet never runs one as a formula.
const cell = (value: string | number) => {
  const text = typeof value === "string" && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

// Billing history as a CSV file (Download CSV), newest first, in English
// like the receipts.
export function billingHistoryCsv(rows: BillingPayment[], dateOf: (iso: string) => string): string {
  const head = ["Date", "Invoice", "Plan", "Paid with", "Amount (BDT)", "Status"];
  const body = rows.map((row) => [dateOf(row.paidAt ?? row.createdAt), row.invoice?.invoiceNumber ?? "", row.planName, gatewayLabel(row.gateway), row.amount, row.status.toLowerCase()].map(cell).join(","));
  return [head.map(cell).join(","), ...body].join("\r\n");
}
