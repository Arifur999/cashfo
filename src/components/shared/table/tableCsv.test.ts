import type { Column, ColumnDef } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import { tableCsv } from "./tableCsv";

interface Payment {
  id: string;
  name: string;
  email: string;
  amount: number;
}

// The parts of a TanStack column the CSV reads.
const column = (id: string, columnDef: Partial<ColumnDef<Payment>>, accessorFn?: (row: Payment, index: number) => unknown) =>
  ({ id, columnDef, accessorFn }) as unknown as Column<Payment, unknown>;

const rows: { original: Payment; index: number }[] = [
  { original: { id: "p1", name: "Rahim", email: "rahim@example.com", amount: 499 }, index: 0 },
  { original: { id: "p2", name: "Karim, Jr.", email: "karim@example.com", amount: -50 }, index: 1 },
];

describe("tableCsv", () => {
  it("writes each cell's exportValue over its accessor's value", () => {
    const columns = [column("name", { header: "User", meta: { exportValue: (row) => `${row.name} <${row.email}>` } }, (row) => row.name)];
    expect(tableCsv(columns, rows)).toBe('User\r\nRahim <rahim@example.com>\r\n"Karim, Jr. <karim@example.com>"');
  });

  it("falls back to the accessor, with the row and its index", () => {
    const columns = [column("amount", { header: "Amount" }, (row, index) => `${index + 1}: ${row.amount}`)];
    expect(tableCsv(columns, rows)).toBe("Amount\r\n1: 499\r\n2: -50");
  });

  it("leaves a column without an accessor empty", () => {
    const columns = [column("id", { header: "ID" }, (row) => row.id), column("spark", { header: "Trend" })];
    expect(tableCsv(columns, rows)).toBe("ID,Trend\r\np1,\r\np2,");
  });

  it("heads a column with its label, its plain header, or its id, in English", () => {
    const columns = [
      column("status", { header: () => null, meta: { label: "Open@@status" } }, () => "x"),
      column("plan", { header: "Plan" }, () => "y"),
      column("gateway", { header: () => null }, () => "z"),
    ];
    expect(tableCsv(columns, rows.slice(0, 1))).toBe("Open,Plan,gateway\r\nx,y,z");
  });
});
