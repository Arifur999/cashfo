"use server";

import type { Transaction } from "./api";
import { getAllTransactions } from "./transactions";

export interface PrintTransfersResult {
  success: boolean;
  data?: { transfers: Transaction[]; complete: boolean };
}

// Transfers' Print: the history is paged on screen, so the paper copy loads
// every transfer the screen's filters match first (newest first, up to
// 1,000). `complete` is false when there were more.
export interface PrintIncomeExpenseResult {
  success: boolean;
  data?: { transactions: Transaction[]; complete: boolean };
}

// Transactions' Print: every income and expense the screen's filters match
// (the ones that still stand, newest first, up to getAllTransactions' cap),
// not just the page on show.
export async function listIncomeExpenseForPrintAction(
  businessId: string,
  filters: { dateFrom?: string; dateTo?: string; type?: "INCOME" | "EXPENSE"; categoryId?: string; uncategorised?: boolean; accountId?: string; search?: string },
): Promise<PrintIncomeExpenseResult> {
  try {
    const { data, complete } = await getAllTransactions(businessId, {
      ...(filters.type ? { transactionType: filters.type } : { transactionTypes: ["INCOME", "EXPENSE"] }),
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      accountId: filters.accountId,
      categoryId: filters.uncategorised ? undefined : filters.categoryId,
      ...(filters.uncategorised && { uncategorised: true }),
      search: filters.search,
      standingOnly: true,
    });
    return { success: true, data: { transactions: data, complete } };
  } catch {
    // An outage (a 5xx, a 429, a timeout): the caller says it couldn't load.
    return { success: false };
  }
}

export async function listTransfersForPrintAction(businessId: string, filters: { dateFrom?: string; dateTo?: string; accountId?: string; search?: string }): Promise<PrintTransfersResult> {
  try {
    const { data, complete } = await getAllTransactions(businessId, {
      transactionType: "TRANSFER",
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      accountId: filters.accountId,
      search: filters.search,
      excludeSavings: true,
      standingOnly: true,
    });
    return { success: true, data: { transfers: data, complete } };
  } catch {
    // An outage (a 5xx, a 429, a timeout): the caller says it couldn't load.
    return { success: false };
  }
}
