"use server";

import type { AccountLedger, ContactStatement, ContactStatementEntry, LedgerRow } from "@/lib/customer/api";
import { customerApi } from "@/lib/customer/apiClient";
import { isIsoDay } from "@/lib/customer/dateRangePresets";

// Books' exports read every page of the period, not only the one on show.
// The loop runs here, in one action, because the browser sends actions one
// at a time. 200 rows a page is the most the API gives, so a long history
// costs as few requests as it can (the API allows 100 a minute); 5,000 rows
// is where an export stops, and the page says so when it does.
const PAGE_SIZE = 200;
const MAX_ROWS = 5000;

// The ids go into the API's path, so nothing but an id gets there.
const ID = /^[\w-]{1,64}$/;
const validDay = (day: string | undefined) => day === undefined || isIsoDay(day);

export type LedgerExport = { ok: true; rows: LedgerRow[]; broughtForward: string; closing: string; capped: boolean } | { ok: false };

// Every entry through one account in a period, oldest first, with the
// balance before it and at its end.
export async function exportLedgerAction(businessId: string, accountId: string, dateFrom?: string, dateTo?: string): Promise<LedgerExport> {
  if (!ID.test(businessId) || !ID.test(accountId) || !validDay(dateFrom) || !validDay(dateTo)) return { ok: false };
  try {
    const rows: LedgerRow[] = [];
    for (let page = 1; ; page++) {
      const { data } = await customerApi.get<AccountLedger>(`/api/businesses/${businessId}/accounts/${accountId}/ledger`, { params: { dateFrom, dateTo, page, limit: PAGE_SIZE } });
      rows.push(...data.entries);
      const done = page >= data.meta.totalPages || data.entries.length === 0;
      if (done || rows.length >= MAX_ROWS) {
        return { ok: true, rows: rows.slice(0, MAX_ROWS), broughtForward: data.balanceBroughtForward, closing: data.closingBalance, capped: !done };
      }
    }
  } catch {
    return { ok: false };
  }
}

export type StatementExport = { ok: true; rows: ContactStatementEntry[]; broughtForward: string; closing: string; capped: boolean } | { ok: false };

// A customer's or supplier's whole statement, oldest first, with what they
// owed before it and owe at its end.
export async function exportStatementAction(businessId: string, contactId: string): Promise<StatementExport> {
  if (!ID.test(businessId) || !ID.test(contactId)) return { ok: false };
  try {
    const rows: ContactStatementEntry[] = [];
    for (let page = 1; ; page++) {
      const { data } = await customerApi.get<ContactStatement>(`/api/businesses/${businessId}/contacts/${contactId}/statement`, { params: { page, limit: PAGE_SIZE } });
      rows.push(...data.entries);
      const done = page >= data.meta.totalPages || data.entries.length === 0;
      if (done || rows.length >= MAX_ROWS) {
        return { ok: true, rows: rows.slice(0, MAX_ROWS), broughtForward: data.balanceBroughtForward, closing: data.closingBalance, capped: !done };
      }
    }
  } catch {
    return { ok: false };
  }
}
